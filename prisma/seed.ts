import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Define all permissions
  const permissions = [
    // User management permissions
    { name: 'VIEW_USERS', resource: 'users', action: 'read', description: 'View user list and details' },
    { name: 'CREATE_USERS', resource: 'users', action: 'create', description: 'Create new users' },
    { name: 'UPDATE_USERS', resource: 'users', action: 'update', description: 'Update user information' },
    { name: 'DELETE_USERS', resource: 'users', action: 'delete', description: 'Delete users' },
    { name: 'MANAGE_USERS', resource: 'users', action: 'manage', description: 'Full user management access' },
    
    // Role management permissions
    { name: 'VIEW_ROLES', resource: 'roles', action: 'read', description: 'View roles and permissions' },
    { name: 'MANAGE_ROLES', resource: 'roles', action: 'manage', description: 'Manage roles and permissions' },
    
    // Permission management
    { name: 'MANAGE_PERMISSIONS', resource: 'permissions', action: 'manage', description: 'Manage system permissions' },
    
    // Scorecard permissions
    { name: 'VIEW_SCORECARDS', resource: 'scorecards', action: 'read', description: 'View agent scorecards' },
    { name: 'CREATE_SCORECARDS', resource: 'scorecards', action: 'create', description: 'Create agent scorecards' },
    { name: 'UPDATE_SCORECARDS', resource: 'scorecards', action: 'update', description: 'Update agent scorecards' },
    { name: 'DELETE_SCORECARDS', resource: 'scorecards', action: 'delete', description: 'Delete agent scorecards' },
    
    // Agent permissions
    { name: 'VIEW_AGENTS', resource: 'agents', action: 'read', description: 'View agent list' },
    { name: 'CREATE_AGENTS', resource: 'agents', action: 'create', description: 'Create new agents' },
    { name: 'UPDATE_AGENTS', resource: 'agents', action: 'update', description: 'Update agent information' },
    { name: 'DELETE_AGENTS', resource: 'agents', action: 'delete', description: 'Delete agents' },
    
    // Quick notes permissions
    { name: 'VIEW_QUICK_NOTES', resource: 'quick_notes', action: 'read', description: 'View quick notes' },
    { name: 'CREATE_QUICK_NOTES', resource: 'quick_notes', action: 'create', description: 'Create quick notes' },
    { name: 'UPDATE_QUICK_NOTES', resource: 'quick_notes', action: 'update', description: 'Update quick notes' },
    { name: 'DELETE_QUICK_NOTES', resource: 'quick_notes', action: 'delete', description: 'Delete quick notes' },
    
    // Action items permissions
    { name: 'VIEW_ACTION_ITEMS', resource: 'action_items', action: 'read', description: 'View action items' },
    { name: 'CREATE_ACTION_ITEMS', resource: 'action_items', action: 'create', description: 'Create action items' },
    { name: 'UPDATE_ACTION_ITEMS', resource: 'action_items', action: 'update', description: 'Update action items' },
    { name: 'DELETE_ACTION_ITEMS', resource: 'action_items', action: 'delete', description: 'Delete action items' },
    
    // Session permissions
    { name: 'VIEW_SESSIONS', resource: 'sessions', action: 'read', description: 'View coaching sessions' },
    { name: 'CREATE_SESSIONS', resource: 'sessions', action: 'create', description: 'Create coaching sessions' },
    { name: 'UPDATE_SESSIONS', resource: 'sessions', action: 'update', description: 'Update coaching sessions' },
    { name: 'DELETE_SESSIONS', resource: 'sessions', action: 'delete', description: 'Delete coaching sessions' },
  ];

  // Create or update permissions
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
      },
      create: permission,
    });
    console.log(`✓ Created/Updated permission: ${permission.name}`);
  }

  // Define role permissions
  const rolePermissions = {
    ADMIN: permissions.map(p => p.name), // Admin gets all permissions
    MANAGER: [
      'VIEW_USERS', 'VIEW_ROLES',
      'VIEW_SCORECARDS', 'CREATE_SCORECARDS', 'UPDATE_SCORECARDS', 'DELETE_SCORECARDS',
      'VIEW_AGENTS', 'CREATE_AGENTS', 'UPDATE_AGENTS',
      'VIEW_QUICK_NOTES', 'CREATE_QUICK_NOTES', 'UPDATE_QUICK_NOTES', 'DELETE_QUICK_NOTES',
      'VIEW_ACTION_ITEMS', 'CREATE_ACTION_ITEMS', 'UPDATE_ACTION_ITEMS', 'DELETE_ACTION_ITEMS',
      'VIEW_SESSIONS', 'CREATE_SESSIONS', 'UPDATE_SESSIONS', 'DELETE_SESSIONS',
    ],
    TEAM_LEADER: [
      'VIEW_SCORECARDS', 'CREATE_SCORECARDS', 'UPDATE_SCORECARDS',
      'VIEW_AGENTS',
      'VIEW_QUICK_NOTES', 'CREATE_QUICK_NOTES', 'UPDATE_QUICK_NOTES',
      'VIEW_ACTION_ITEMS', 'CREATE_ACTION_ITEMS', 'UPDATE_ACTION_ITEMS',
      'VIEW_SESSIONS', 'CREATE_SESSIONS', 'UPDATE_SESSIONS',
    ],
    AGENT: [
      'VIEW_QUICK_NOTES',
      'VIEW_ACTION_ITEMS',
      'VIEW_SESSIONS',
    ],
  };

  // Assign permissions to roles
  for (const [role, permissionNames] of Object.entries(rolePermissions)) {
    console.log(`\nAssigning permissions to ${role} role...`);
    
    for (const permissionName of permissionNames) {
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
      });

      if (permission) {
        // Check if the role-permission combination already exists
        const existingRolePermission = await prisma.rolePermission.findUnique({
          where: {
            role_permissionId: {
              role,
              permissionId: permission.id,
            },
          },
        });

        if (!existingRolePermission) {
          await prisma.rolePermission.create({
            data: {
              role,
              permissionId: permission.id,
            },
          });
          console.log(`  ✓ Assigned ${permissionName} to ${role}`);
        } else {
          console.log(`  - ${permissionName} already assigned to ${role}`);
        }
      }
    }
  }

  // Create test users if they don't exist
  const testUsers = [
    {
      email: 'admin@company.com',
      name: 'Admin User',
      role: 'ADMIN',
      password: 'admin123',
    },
    {
      email: 'manager1@company.com',
      name: 'Manager One',
      role: 'MANAGER',
      password: 'manager123',
    },
    {
      email: 'teamleader1@company.com',
      name: 'Team Leader One',
      role: 'TEAM_LEADER',
      password: 'teamleader123',
    },
    {
      email: 'agent1@company.com',
      name: 'Agent One',
      role: 'AGENT',
      password: 'agent123',
      employeeId: 'EMP001',
    },
    {
      email: 'agent2@company.com',
      name: 'Agent Two',
      role: 'AGENT',
      password: 'agent123',
      employeeId: 'EMP002',
    },
  ];

  console.log('\nCreating test users...');
  
  for (const userData of testUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        role: userData.role,
      },
      create: {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        hashedPassword,
      },
    });

    console.log(`✓ Created/Updated user: ${userData.email} (${userData.role})`);

    // Create agent profile if needed
    if (userData.role === 'AGENT' && userData.employeeId) {
      await prisma.agent.upsert({
        where: { userId: user.id },
        update: {
          employeeId: userData.employeeId,
        },
        create: {
          userId: user.id,
          employeeId: userData.employeeId,
          department: 'Customer Service',
        },
      });
      console.log(`  ✓ Created agent profile for ${userData.email}`);
    }

    // Create team leader profile if needed
    if (userData.role === 'TEAM_LEADER') {
      await prisma.teamLeader.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          department: 'Customer Service',
        },
      });
      console.log(`  ✓ Created team leader profile for ${userData.email}`);
    }

    // Create manager profile if needed
    if (userData.role === 'MANAGER') {
      await prisma.manager.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
        },
      });
      console.log(`  ✓ Created manager profile for ${userData.email}`);
    }
  }

  // Assign agents to team leader
  const teamLeader = await prisma.user.findUnique({
    where: { email: 'teamleader1@company.com' },
  });

  if (teamLeader) {
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT' },
    });

    for (const agent of agents) {
      await prisma.user.update({
        where: { id: agent.id },
        data: { teamLeaderId: teamLeader.id },
      });
    }
    console.log(`\n✓ Assigned ${agents.length} agents to team leader`);
  }

  console.log('\n✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });