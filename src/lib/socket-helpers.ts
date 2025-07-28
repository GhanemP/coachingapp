import logger from '@/lib/logger';

// Socket helper functions for TypeScript files
// These are wrappers around the CommonJS socket-server.js functions

export async function notifyQuickNoteCreated(quickNote: {
  id: string;
  agentId: string;
  createdBy: {
    name: string | null;
  };
}) {
  try {
    const { notifyQuickNoteCreated: notify } = await import('./socket-server');
    await notify({
      ...quickNote,
      createdBy: {
        name: quickNote.createdBy.name || 'Unknown'
      }
    });
  } catch (error) {
    logger.error('Error notifying quick note created:', error as Error);
  }
}

export async function notifyActionItemCreated(actionItem: {
  id: string;
  agentId: string;
  agent?: {
    teamLeaderId?: string | null;
  };
}) {
  try {
    const { notifyActionItemCreated: notify } = await import('./socket-server');
    await notify({
      ...actionItem,
      agent: actionItem.agent ? {
        teamLeaderId: actionItem.agent.teamLeaderId || undefined
      } : undefined
    });
  } catch (error) {
    logger.error('Error notifying action item created:', error as Error);
  }
}

export async function notifyActionItemUpdated(actionItem: {
  id: string;
  agentId: string;
  agent?: {
    teamLeaderId?: string | null;
  };
}) {
  try {
    const { notifyActionItemUpdated: notify } = await import('./socket-server');
    await notify({
      ...actionItem,
      agent: actionItem.agent ? {
        teamLeaderId: actionItem.agent.teamLeaderId || undefined
      } : undefined
    });
  } catch (error) {
    logger.error('Error notifying action item updated:', error as Error);
  }
}

export async function notifySessionScheduled(session: {
  id: string;
  agentId: string;
  scheduledDate: Date | string;
  currentScore?: number | null;
}) {
  try {
    const { notifySessionScheduled: notify } = await import('./socket-server');
    await notify({
      ...session,
      scheduledDate: session.scheduledDate instanceof Date ? session.scheduledDate : new Date(session.scheduledDate),
      currentScore: session.currentScore || undefined
    });
  } catch (error) {
    logger.error('Error notifying session scheduled:', error as Error);
  }
}

export async function notifySessionCompleted(session: {
  id: string;
  agentId: string;
  scheduledDate: Date | string;
  currentScore?: number | null;
}) {
  try {
    const { notifySessionCompleted: notify } = await import('./socket-server');
    await notify({
      ...session,
      scheduledDate: session.scheduledDate instanceof Date ? session.scheduledDate : new Date(session.scheduledDate),
      currentScore: session.currentScore || undefined
    });
  } catch (error) {
    logger.error('Error notifying session completed:', error as Error);
  }
}

export async function notifyActionPlanCreated(actionPlan: {
  id: string;
  agentId: string;
  title: string;
  agent?: {
    teamLeaderId?: string | null;
  };
}) {
  try {
    const { notifyActionPlanCreated: notify } = await import('./socket-server');
    await notify({
      ...actionPlan,
      agent: actionPlan.agent ? {
        teamLeaderId: actionPlan.agent.teamLeaderId || undefined
      } : undefined
    });
  } catch (error) {
    logger.error('Error notifying action plan created:', error as Error);
  }
}

export async function notifyActionPlanUpdated(actionPlan: {
  id: string;
  agentId: string;
  title: string;
  agent?: {
    teamLeaderId?: string | null;
  };
}) {
  try {
    const { notifyActionPlanUpdated: notify } = await import('./socket-server');
    await notify({
      ...actionPlan,
      agent: actionPlan.agent ? {
        teamLeaderId: actionPlan.agent.teamLeaderId || undefined
      } : undefined
    });
  } catch (error) {
    logger.error('Error notifying action plan updated:', error as Error);
  }
}