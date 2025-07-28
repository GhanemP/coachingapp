import { PrismaClient } from '@prisma/client';

import { UserRole } from '@/lib/constants';

const prisma = new PrismaClient();

async function seedPermissions() {
  console.log('🌱 Seeding permissions...');

  try {
    // Define core permissions
    const permissions = [
      // Scorecard permissions
      { name: 'view_scorecards', resource: 'scorecards', action: 'read' },
      { name: 'create_scorecards', resource: 'scorecards', action: 'create' },
      { name: 'update_scorecards', resource: 'scorecards', action: 'update' },
      { name: 'delete_scorecards', resource: 'scorecards', action: 'delete' },
      
      // Agent permissions
      { name: 'view_agents', resource: 'agents', action: 'read' },
      { name: 'manage_agents', resource: 'agents', action: 'manage' },
      
      // Session permissions
      { name: 'view_sessions', resource: 'sessions', action: 'read' },
      { name: 'create_sessions', resource: 'sessions', action: 'create' },
      { name: 'update_sessions', resource: 'sessions', action: 'update' },
      
      // Dashboard permissions
      { name: 'view_dashboard', resource: 'dashboard', action: 'read' },
      { name: 'view_reports', resource: 'reports', action: 'read' },
      
      // User management permissions
      { name: 'manage_users', resource: 'users', action: 'manage' },
      { name: 'view_users', resource: 'users', action: 'read' },
    ];

    // Create permissions (upsert to avoid duplicates)
    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: {
          resource_action: {
            resource: permission.resource,
            action: permission.action
          }
        },
        update: {
          name: permission.name,
        },
        create: permission,
      });
    }

    console.log('✅ Permissions created successfully');

    // Define role permissions mapping
    const rolePermissions = {
      ADMIN: [
        'view_scorecards', 'create_scorecards', 'update_scorecards', 'delete_scorecards',
        'view_agents', 'manage_agents',
        'view_sessions', 'create_sessions', 'update_sessions',
        'view_dashboard', 'view_reports',
        'manage_users', 'view_users'
      ],
      MANAGER: [
        'view_scorecards', 'create_scorecards', 'update_scorecards', 'delete_scorecards',
        'view_agents', 'manage_agents',
        'view_sessions', 'create_sessions', 'update_sessions',
        'view_dashboard', 'view_reports',
        'view_users'
      ],
      TEAM_LEADER: [
        'view_scorecards', 'create_scorecards', 'update_scorecards',
        'view_agents',
        'view_sessions', 'create_sessions', 'update_sessions',
        'view_dashboard'
      ],
      AGENT: [
        'view_scorecards', // Agents can view their own scorecards
        'view_sessions', // Agents can view their own sessions
        'view_dashboard' // Agents can view their own dashboard
      ]
    };

    // Assign permissions to roles
    for (const [role, permissionNames] of Object.entries(rolePermissions)) {
      console.log(`🔐 Setting up permissions for ${role}...`);
      
      for (const permissionName of permissionNames) {
        const permission = await prisma.permission.findUnique({
          where: { name: permissionName }
        });

        if (permission) {
          await prisma.rolePermission.upsert({
            where: {
              role_permissionId: {
                role: role as UserRole,
                permissionId: permission.id
              }
            },
            update: {},
            create: {
              role: role as UserRole,
              permissionId: permission.id
            }
          });
        }
      }
    }

    console.log('✅ Role permissions assigned successfully');
    console.log('🎉 Permission seeding completed!');

  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedPermissions()
    .catch((error) => {
      console.error('Failed to seed permissions:', error);
      process.exit(1);
    });
}

export { seedPermissions };