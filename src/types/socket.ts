// Socket event types
export interface QuickNoteEvent {
  id: string;
  agentId: string;
  authorId: string;
  content: string;
  category: string;
  isPrivate: boolean;
  teamLeaderId?: string;
  createdAt: Date;
}

export interface ActionItemEvent {
  id: string;
  agentId: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: Date;
  assignedTo: string;
  createdBy: string;
  action: 'created' | 'updated' | 'deleted';
}

export interface SessionUpdateEvent {
  id: string;
  agentId: string;
  teamLeaderId: string;
  status: string;
  action: 'scheduled' | 'started' | 'completed' | 'cancelled';
  scheduledDate: Date;
}

export interface NotificationEvent {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: Date;
}

export interface AuthenticationData {
  userId: string;
  role: string;
}

export interface AuthenticationResponse {
  success: boolean;
  error?: string;
}

export interface TypingData {
  sessionId: string;
  userId: string;
  isTyping: boolean;
}

export interface UserTypingEvent {
  userId: string;
  isTyping: boolean;
}
