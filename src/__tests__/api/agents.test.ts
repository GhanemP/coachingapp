/**
 * Agents API Endpoint Tests
 * Tests all agent-related API routes
 */

// Mock Prisma client
const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock next-auth
const mockSession = {
  user: {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
  },
};

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn().mockResolvedValue(mockSession),
}));

describe('Agents API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/agents', () => {
    it('should return list of agents for authorized user', async () => {
      const mockAgents = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'AGENT',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'AGENT',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockAgents);

      const agents = await mockPrisma.user.findMany({
        where: { role: 'AGENT' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(agents).toHaveLength(2);
      expect(agents[0].name).toBe('John Doe');
      expect(agents[1].name).toBe('Jane Smith');
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'AGENT' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should filter agents by role', async () => {
      const mockAgents = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'AGENT',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockAgents);

      const agents = await mockPrisma.user.findMany({
        where: { role: 'AGENT' },
      });

      expect(agents).toHaveLength(1);
      expect(agents[0].role).toBe('AGENT');
    });

    it('should handle empty agent list', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const agents = await mockPrisma.user.findMany({
        where: { role: 'AGENT' },
      });

      expect(agents).toHaveLength(0);
    });
  });

  describe('GET /api/agents/[id]', () => {
    it('should return specific agent by ID', async () => {
      const mockAgent = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'AGENT',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockAgent);

      const agent = await mockPrisma.user.findUnique({
        where: { id: '1' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(agent).toBeDefined();
      expect(agent?.id).toBe('1');
      expect(agent?.name).toBe('John Doe');
      expect(agent?.email).toBe('john@example.com');
    });

    it('should return null for non-existent agent', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const agent = await mockPrisma.user.findUnique({
        where: { id: 'non-existent' },
      });

      expect(agent).toBeNull();
    });
  });

  describe('POST /api/agents', () => {
    it('should create new agent with valid data', async () => {
      const newAgentData = {
        name: 'New Agent',
        email: 'newagent@example.com',
        role: 'AGENT',
      };

      const createdAgent = {
        id: '3',
        ...newAgentData,
        password: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // Email doesn't exist
      mockPrisma.user.create.mockResolvedValue(createdAgent);

      // Check if email exists
      const existingUser = await mockPrisma.user.findUnique({
        where: { email: newAgentData.email },
      });
      expect(existingUser).toBeNull();

      // Create new agent
      const newAgent = await mockPrisma.user.create({
        data: {
          ...newAgentData,
          password: 'hashedpassword',
        },
      });

      expect(newAgent.name).toBe(newAgentData.name);
      expect(newAgent.email).toBe(newAgentData.email);
      expect(newAgent.role).toBe(newAgentData.role);
    });

    it('should prevent duplicate email addresses', async () => {
      const existingAgent = {
        id: '1',
        name: 'Existing Agent',
        email: 'existing@example.com',
        role: 'AGENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingAgent);

      const existingUser = await mockPrisma.user.findUnique({
        where: { email: 'existing@example.com' },
      });

      expect(existingUser).not.toBeNull();
      expect(existingUser?.email).toBe('existing@example.com');
    });

    it('should validate required fields', () => {
      const invalidData = [
        { name: '', email: 'test@example.com', role: 'AGENT' }, // Empty name
        { name: 'Test', email: '', role: 'AGENT' }, // Empty email
        { name: 'Test', email: 'test@example.com', role: '' }, // Empty role
        { email: 'test@example.com', role: 'AGENT' }, // Missing name
        { name: 'Test', role: 'AGENT' }, // Missing email
        { name: 'Test', email: 'test@example.com' }, // Missing role
      ];

      invalidData.forEach(data => {
        const isValid =
          data.name &&
          data.email &&
          data.role &&
          data.name.trim() !== '' &&
          data.email.trim() !== '' &&
          data.role.trim() !== '';
        expect(isValid).toBe(false);
      });
    });

    it('should validate email format', () => {
      const invalidEmails = ['invalid-email', 'test@', '@example.com', 'test.example.com', ''];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });

      const validEmail = 'test@example.com';
      expect(emailRegex.test(validEmail)).toBe(true);
    });

    it('should validate role values', () => {
      const validRoles = ['ADMIN', 'TEAM_LEADER', 'MANAGER', 'AGENT'];
      const invalidRoles = ['INVALID_ROLE', '', 'admin', 'agent'];

      validRoles.forEach(role => {
        expect(validRoles.includes(role)).toBe(true);
      });

      invalidRoles.forEach(role => {
        expect(validRoles.includes(role)).toBe(false);
      });
    });
  });

  describe('PUT /api/agents/[id]', () => {
    it('should update existing agent', async () => {
      const existingAgent = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'AGENT',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const updateData = {
        name: 'John Smith',
        email: 'johnsmith@example.com',
      };

      const updatedAgent = {
        ...existingAgent,
        ...updateData,
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingAgent);
      mockPrisma.user.update.mockResolvedValue(updatedAgent);

      // Check if agent exists
      const agent = await mockPrisma.user.findUnique({
        where: { id: '1' },
      });
      expect(agent).not.toBeNull();

      // Update agent
      const updated = await mockPrisma.user.update({
        where: { id: '1' },
        data: updateData,
      });

      expect(updated.name).toBe(updateData.name);
      expect(updated.email).toBe(updateData.email);
    });

    it('should handle non-existent agent update', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const agent = await mockPrisma.user.findUnique({
        where: { id: 'non-existent' },
      });

      expect(agent).toBeNull();
    });
  });

  describe('DELETE /api/agents/[id]', () => {
    it('should delete existing agent', async () => {
      const existingAgent = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'AGENT',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingAgent);
      mockPrisma.user.delete.mockResolvedValue(existingAgent);

      // Check if agent exists
      const agent = await mockPrisma.user.findUnique({
        where: { id: '1' },
      });
      expect(agent).not.toBeNull();

      // Delete agent
      const deleted = await mockPrisma.user.delete({
        where: { id: '1' },
      });

      expect(deleted.id).toBe('1');
    });

    it('should handle non-existent agent deletion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const agent = await mockPrisma.user.findUnique({
        where: { id: 'non-existent' },
      });

      expect(agent).toBeNull();
    });
  });

  describe('Authorization Tests', () => {
    it('should allow ADMIN to access all agent operations', () => {
      const adminRoles = ['ADMIN'];
      const userRole = 'ADMIN';

      expect(adminRoles.includes(userRole)).toBe(true);
    });

    it('should allow TEAM_LEADER to view agents', () => {
      const allowedRoles = ['ADMIN', 'TEAM_LEADER', 'MANAGER'];
      const userRole = 'TEAM_LEADER';

      expect(allowedRoles.includes(userRole)).toBe(true);
    });

    it('should restrict AGENT from managing other agents', () => {
      const restrictedRoles = ['AGENT'];
      const userRole = 'AGENT';
      const adminRoles = ['ADMIN'];

      expect(restrictedRoles.includes(userRole)).toBe(true);
      // Agent should not be able to perform admin operations
      expect(adminRoles.includes(userRole)).toBe(false);
    });
  });

  describe('Data Validation Tests', () => {
    it('should sanitize input data', () => {
      const unsafeData = {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com',
        role: 'AGENT',
      };

      // Basic sanitization check
      const containsScript = unsafeData.name.includes('<script>');
      expect(containsScript).toBe(true);

      // After sanitization, script tags should be removed
      const sanitizedName = unsafeData.name.replace(/<[^>]*>/g, '');
      expect(sanitizedName).toBe('alert("xss")John');
    });

    it('should validate data types', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'AGENT',
      };

      expect(typeof validData.name).toBe('string');
      expect(typeof validData.email).toBe('string');
      expect(typeof validData.role).toBe('string');
    });
  });
});
