"use client";
import { Search, User, TrendingUp, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import logger from '@/lib/logger-client';


interface Agent {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  createdAt: string;
  averageScore: number;
  metricsCount: number;
}

// Helper functions to replace nested ternaries
function getScoreBadgeColor(score: number): string {
  if (score >= 80) {
    return "bg-green-100 text-green-800";
  }
  if (score >= 70) {
    return "bg-yellow-100 text-yellow-800";
  }
  return "bg-red-100 text-red-800";
}

function getScoreBadgeText(score: number): string {
  if (score >= 80) {
    return 'Excellent';
  }
  if (score >= 70) {
    return 'Good';
  }
  return 'Needs Improvement';
}

export default function AgentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAgents = useCallback(async () => {
    try {
      // For team leaders, only show their supervised agents
      const url = session?.user.role === 'TEAM_LEADER'
        ? '/api/agents?supervised=true'
        : '/api/agents';
      
      const response = await fetch(url);
      if (!response.ok) {throw new Error('Failed to fetch agents');}
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      logger.error('Error fetching agents:', error as Error);
    } finally {
      setLoading(false);
    }
  }, [session?.user.role]);

  useEffect(() => {
    if (status === 'loading') {return;}
    
    if (!session || !['TEAM_LEADER', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      router.push('/');
      return;
    }

    fetchAgents();
  }, [session, status, router, fetchAgents]);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Agents</h1>
        <p className="text-gray-600">View and manage agent performance</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search agents by name, email, or employee ID..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredAgents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No agents found matching your search.</p>
            </CardContent>
          </Card>
        ) : (
          filteredAgents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{agent.name}</h3>
                        <p className="text-sm text-gray-600">{agent.email}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-500">Employee ID</p>
                        <p className="font-medium">{agent.employeeId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Member Since</p>
                        <p className="font-medium">{new Date(agent.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Average Score</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-lg">
                            {agent.averageScore > 0 ? `${agent.averageScore}%` : 'N/A'}
                          </p>
                          {agent.averageScore > 0 && (
                            <Badge
                              className={getScoreBadgeColor(agent.averageScore)}
                            >
                              {getScoreBadgeText(agent.averageScore)}
                            </Badge>
                          )}
                        </div>
                        {agent.metricsCount > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            Based on {agent.metricsCount} month{agent.metricsCount !== 1 ? 's' : ''} of data
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link href={`/agents/${agent.id}/scorecard`}>
                      <Button variant="outline" size="sm">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Scorecard
                      </Button>
                    </Link>
                    <Link href={`/agents/${agent.id}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
