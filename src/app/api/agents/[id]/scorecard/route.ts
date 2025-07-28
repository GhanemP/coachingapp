import { NextRequest } from 'next/server';

import {
  handleCreateScorecard,
  handleDeleteScorecard,
  handleGetScorecard,
} from '@/lib/services/scorecard/scorecard-handlers';

// GET /api/agents/[id]/scorecard - Get agent's scorecard metrics
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return await handleGetScorecard(request, context);
}

// POST /api/agents/[id]/scorecard - Create or update agent metrics
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return await handleCreateScorecard(request, context);
}

// DELETE /api/agents/[id]/scorecard - Delete agent metrics
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return await handleDeleteScorecard(request, context);
}
