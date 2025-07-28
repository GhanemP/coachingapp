import { ActivityItem, QuickNote, Session } from '../types';

export function transformNotesToActivities(notes: QuickNote[]): ActivityItem[] {
  return notes.map((note: QuickNote) => ({
    id: note.id,
    type: 'note' as const,
    title: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
    description: note.content,
    date: new Date(note.createdAt),
    category: note.category,
    agent: note.agent,
    author: note.author,
    isPrivate: note.isPrivate,
    rawData: note
  }));
}

export function transformSessionsToActivities(sessions: Session[]): ActivityItem[] {
  return sessions.map((session: Session) => ({
    id: session.id,
    type: 'session' as const,
    title: `Coaching Session with ${session.agent.name || session.agent.email}`,
    description: session.preparationNotes || session.sessionNotes,
    date: new Date(session.scheduledDate),
    status: session.status,
    agent: session.agent,
    duration: session.duration,
    rawData: session
  }));
}

export function combineAndSortActivities(notes: ActivityItem[], sessions: ActivityItem[]): ActivityItem[] {
  const combined = [...notes, ...sessions];
  // Sort by date (newest first)
  return combined.sort((a, b) => b.date.getTime() - a.date.getTime());
}