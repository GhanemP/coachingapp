import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'AGENT',
      },
    });
  }),

  http.post('/api/auth/register', () => {
    return HttpResponse.json({
      user: {
        id: '2',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'AGENT',
      },
    });
  }),

  // Agents endpoints
  http.get('/api/agents', () => {
    return HttpResponse.json([
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'AGENT',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'AGENT',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  http.get('/api/agents/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'AGENT',
      createdAt: '2024-01-01T00:00:00Z',
    });
  }),

  // Quick Notes endpoints
  http.get('/api/quick-notes', () => {
    return HttpResponse.json([
      {
        id: '1',
        content: 'Test note 1',
        agentId: '1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        content: 'Test note 2',
        agentId: '1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  http.post('/api/quick-notes', async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({
      id: '3',
      ...body,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  }),

  // Action Items endpoints
  http.get('/api/action-items', () => {
    return HttpResponse.json([
      {
        id: '1',
        title: 'Test Action Item 1',
        description: 'Description for action item 1',
        status: 'PENDING',
        priority: 'HIGH',
        agentId: '1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        title: 'Test Action Item 2',
        description: 'Description for action item 2',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        agentId: '1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  http.post('/api/action-items', async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({
      id: '3',
      ...body,
      status: 'PENDING',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  }),

  // Sessions endpoints
  http.get('/api/sessions', () => {
    return HttpResponse.json([
      {
        id: '1',
        title: 'Test Session 1',
        description: 'Description for session 1',
        status: 'SCHEDULED',
        agentId: '1',
        scheduledAt: '2024-01-02T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  http.post('/api/sessions', async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({
      id: '2',
      ...body,
      status: 'SCHEDULED',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  }),

  // Dashboard endpoint
  http.get('/api/dashboard', () => {
    return HttpResponse.json({
      totalAgents: 10,
      totalSessions: 25,
      totalActionItems: 15,
      totalQuickNotes: 30,
      recentActivity: [],
    });
  }),

  // Error handler for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return new HttpResponse(null, { status: 404 });
  }),
];
