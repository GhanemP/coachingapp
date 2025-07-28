import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useRef } from 'react';

import logger from '@/lib/logger-client';

import { ActivityItem, Agent, TypeFilter } from '../types';
import { transformNotesToActivities, transformSessionsToActivities, combineAndSortActivities } from '../utils/data-transformers';

interface UseActivityDataReturn {
  activities: ActivityItem[];
  agents: Agent[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useActivityData(
  typeFilter: TypeFilter,
  limit?: number
): UseActivityDataReturn {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // FIXED: Use useRef to prevent infinite loops by storing mutable values
  const isFetchingRef = useRef(false);
  const lastFetchParamsRef = useRef<{ typeFilter: TypeFilter; limit?: number } | null>(null);

  // FIXED: Stable fetchAgents function that doesn't recreate on every render
  const fetchAgents = useCallback(async () => {
    try {
      const endpoint = session?.user?.role === 'TEAM_LEADER'
        ? '/api/agents?supervised=true'
        : '/api/agents';
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || data);
      }
    } catch (error) {
      logger.error('Error fetching agents:', error as Error);
    }
  }, [session?.user?.role]); // Only depends on session role, preventing unnecessary recreations

  // FIXED: Stable fetchActivities function with proper loop termination
  const fetchActivities = useCallback(async () => {
    // FIXED: Prevent multiple simultaneous fetches using ref instead of state
    if (isFetchingRef.current) {
      console.warn('Fetch already in progress, skipping...');
      return;
    }
    
    // FIXED: Check if parameters have actually changed to prevent unnecessary fetches
    const currentParams = { typeFilter, limit };
    if (lastFetchParamsRef.current &&
        lastFetchParamsRef.current.typeFilter === typeFilter &&
        lastFetchParamsRef.current.limit === limit) {
      console.warn('Parameters unchanged, skipping fetch...');
      return;
    }
    
    try {
      // FIXED: Set fetching flag using ref to prevent state-based re-renders
      isFetchingRef.current = true;
      lastFetchParamsRef.current = currentParams;
      
      setLoading(true);
      setError(null);
      
      // Fetch quick notes
      const notesPromise = typeFilter !== 'sessions' ?
        fetch(`/api/quick-notes?limit=${limit || 1000}`).then(res => res.json()) :
        Promise.resolve({ quickNotes: [] });
      
      // Fetch sessions
      const sessionsPromise = typeFilter !== 'notes' ?
        fetch('/api/sessions?limit=1000').then(res => res.json()) :
        Promise.resolve({ sessions: [] });

      const [notesData, sessionsData] = await Promise.all([notesPromise, sessionsPromise]);

      // Transform data
      const transformedNotes = transformNotesToActivities(notesData.quickNotes || []);
      
      // Handle both old format (array) and new format (object with sessions property)
      const sessionsArray = Array.isArray(sessionsData) ? sessionsData : (sessionsData.sessions || []);
      const transformedSessions = transformSessionsToActivities(sessionsArray);

      // Combine and sort
      const combined = combineAndSortActivities(transformedNotes, transformedSessions);
      setActivities(combined);
    } catch (error) {
      logger.error('Error fetching activities:', error as Error);
      setError('Failed to fetch activities');
      setActivities([]);
    } finally {
      setLoading(false);
      // FIXED: Clear fetching flag using ref
      isFetchingRef.current = false;
    }
  }, [typeFilter, limit]); // FIXED: Added missing dependencies

  // FIXED: Separate useEffect for agents that only runs when session changes
  useEffect(() => {
    if (session) {
      fetchAgents();
    }
  }, [fetchAgents, session]); // Include fetchAgents and session dependencies

  // FIXED: Separate useEffect for activities that only runs when parameters actually change
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]); // Include fetchActivities dependency

  // FIXED: Stable refetch function that doesn't cause infinite loops
  const refetch = useCallback(() => {
    // FIXED: Reset last fetch params to force refetch
    lastFetchParamsRef.current = null;
    fetchActivities();
    fetchAgents();
  }, [fetchActivities, fetchAgents]);

  return {
    activities,
    agents,
    loading,
    error,
    refetch
  };
}