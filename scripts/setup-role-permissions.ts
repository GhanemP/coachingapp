import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupRolePermissions() {
  console.log('🔧 Setting up role permissions...\n');

  // Define role-based permission assignments
  const rolePermissions = {
    ADMIN: [
      // Admin has all permissions
      'view_dashboard',
      'view_admin_dashboard',
      'manage_users',
      'view_users',
      'manage_agents',
      'view_agents',
      'manage_sessions',
      'view_sessions',
      'conduct_sessions',
      'view_reports',
      'generate_reports',
      'view_analytics',
      'view_scorecards',
      'manage_scorecards',
      'manage_action_items',
      'view_action_items',
      'manage_quick_notes',
      'view_quick_notes',
      'system_admin',
      'manage_permissions',
    ],
    MANAGER: [
      // Manager permissions
      'view_dashboard',
      'view_users',
      'manage_agents',
      'view_agents',
      'manage_sessions',
      'view_sessions',
      'conduct_sessions',
      'view_reports',
      'generate_reports',
      'view_analytics',
      'view_scorecards',
      'manage_scorecards',
      'manage_action_items',
      'view_action_items',
      'manage_quick_notes',
      'view_quick_notes',
    ],
    TEAM_LEADER: [
      // Team Leader permissions
      'view_dashboard',
      'view_agents',
      'manage_sessions',
      'view_sessions',
      'conduct_sessions',
      'view_reports',
      'view_analytics',
      'view_scorecards',
      'manage_scorecards',
      'manage_action_items',
      'view_action_items',
      'manage_quick_notes',
      'view_quick_notes',
    ],
    AGENT: [
      // Agent permissions (limited)
      'view_dashboard',
      'view_sessions',
      'view_action_items',
      'view_quick_notes',
      'view_scorecards', // Agents can view their own scorecards
    ],
  };

  // Get all permissions from database
  const permissions = await prisma.permission.findMany();
  const permissionMap = new Map(permissions.map(p => [p.name, p.id]));

  console.log('📋 Available permissions:', permissions.length);

  // Clear existing role permissions first
  console.log('🧹 Clearing existing role permissions...');
  await prisma.rolePermission.deleteMany();

  // Create role permissions
  for (const [role, permissionNames] of Object.entries(rolePermissions)) {
    console.log(`\n🔐 Setting up permissions for ${role}:`);

    for (const permissionName of permissionNames) {
      const permissionId = permissionMap.get(permissionName);

      if (!permissionId) {
        console.log(`  ❌ Permission not found: ${permissionName}`);
        continue;
      }

      try {
        await prisma.rolePermission.create({
          data: {
            role,
            permissionId,
          },
        });
        console.log(`  ✅ ${permissionName}`);
      } catch (error) {
        console.log(`  ❌ Failed to assign ${permissionName}: ${error}`);
      }
    }
  }

  // Verify the setup
  console.log('\n🔍 Verifying role permissions...');
  const rolePermissionCounts = await prisma.rolePermission.groupBy({
    by: ['role'],
    _count: {
      role: true,
    },
  });

  rolePermissionCounts.forEach(({ role, _count }) => {
    console.log(`  ${role}: ${_count.role} permissions`);
  });

  console.log('\n✅ Role permissions setup completed!');
}

setupRolePermissions()
  .catch(error => {
    console.error('❌ Error setting up role permissions:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
