import { PrismaClient } from '@prisma/client';
import { UserRole } from '../src/lib/constants';

const prisma = new PrismaClient();

// Define all available permissions
const permissions = [
  // User Management
  { name: 'manage_users', displayName: 'Manage Users', description: 'Create, update, and delete user accounts', resource: 'users', action: 'manage', category: 'user_management' },
  { name: 'view_users', displayName: 'View Users', description: 'View user profiles and information', resource: 'users', action: 'read', category: 'user_management' },
  
  // Role Management
  { name: 'manage_roles', displayName: 'Manage Roles', description: 'Modify role permissions and assignments', resource: 'roles', action: 'manage', category: 'user_management' },
  { name: 'view_roles', displayName: 'View Roles', description: 'View role information and permissions', resource: 'roles', action: 'read', category: 'user_management' },
  
  // Reports
  { name: 'view_reports', displayName: 'View Reports', description: 'Access system-wide reports and analytics', resource: 'reports', action: 'read', category: 'reporting' },
  { name: 'create_reports', displayName: 'Create Reports', description: 'Generate custom reports', resource: 'reports', action: 'create', category: 'reporting' },
  
  // System Management
  { name: 'manage_system', displayName: 'Manage System', description: 'Configure system settings and preferences', resource: 'system', action: 'manage', category: 'system' },
  { name: 'manage_database', displayName: 'Manage Database', description: 'Access and manage database operations', resource: 'database', action: 'manage', category: 'system' },
  
  // Sessions
  { name: 'manage_sessions', displayName: 'Manage Sessions', description: 'Schedule and manage coaching sessions', resource: 'sessions', action: 'manage', category: 'sessions' },
  { name: 'view_sessions', displayName: 'View Sessions', description: 'View coaching session details', resource: 'sessions', action: 'read', category: 'sessions' },
  { name: 'conduct_sessions', displayName: 'Conduct Sessions', description: 'Conduct coaching sessions with agents', resource: 'sessions', action: 'conduct', category: 'sessions' },
  
  // Team Leadership
  { name: 'view_team_leaders', displayName: 'View Team Leaders', description: 'View team leader profiles and performance', resource: 'team_leaders', action: 'read', category: 'team_management' },
  { name: 'manage_team_leaders', displayName: 'Manage Team Leaders', description: 'Assign and manage team leaders', resource: 'team_leaders', action: 'manage', category: 'team_management' },
  
  // Agent Management
  { name: 'view_agents', displayName: 'View Agents', description: 'View agent profiles and performance', resource: 'agents', action: 'read', category: 'agent_management' },
  { name: 'manage_agents', displayName: 'Manage Agents', description: 'Assign and manage agents', resource: 'agents', action: 'manage', category: 'agent_management' },
  
  // Metrics and Performance
  { name: 'view_agent_metrics', displayName: 'View Agent Metrics', description: 'View detailed agent performance metrics', resource: 'metrics', action: 'read', category: 'performance' },
  { name: 'manage_agent_metrics', displayName: 'Manage Agent Metrics', description: 'Update and manage agent performance metrics', resource: 'metrics', action: 'manage', category: 'performance' },
  { name: 'view_own_metrics', displayName: 'View Own Metrics', description: 'View personal performance metrics', resource: 'own_metrics', action: 'read', category: 'self_service' },
  
  // Data Access
  { name: 'view_all_data', displayName: 'View All Data', description: 'Access all data across the system', resource: 'all_data', action: 'read', category: 'data_access' },
  { name: 'view_team_data', displayName: 'View Team Data', description: 'Access team performance metrics', resource: 'team_data', action: 'read', category: 'data_access' },
  
  // Self Service
  { name: 'view_own_sessions', displayName: 'View Own Sessions', description: 'View personal coaching sessions', resource: 'own_sessions', action: 'read', category: 'self_service' },
  { name: 'update_profile', displayName: 'Update Profile', description: 'Update personal profile information', resource: 'profile', action: 'update', category: 'self_service' },
  
  // Scorecard Management
  { name: 'VIEW_SCORECARDS', displayName: 'View Scorecards', description: 'View agent performance scorecards', resource: 'scorecards', action: 'read', category: 'performance' },
  { name: 'CREATE_SCORECARDS', displayName: 'Create Scorecards', description: 'Create and edit agent performance scorecards', resource: 'scorecards', action: 'create', category: 'performance' },
  { name: 'MANAGE_SCORECARDS', displayName: 'Manage Scorecards', description: 'Full scorecard management including deletion', resource: 'scorecards', action: 'manage', category: 'performance' },
];

// Define role-permission mappings
const rolePermissions = {
  [UserRole.ADMIN]: [
    'manage_users', 'view_users', 'manage_roles', 'view_roles', 'view_reports', 'create_reports',
    'manage_system', 'manage_database', 'manage_sessions', 'view_sessions', 'conduct_sessions',
    'view_team_leaders', 'manage_team_leaders', 'view_agents', 'manage_agents',
    'view_agent_metrics', 'manage_agent_metrics', 'view_all_data', 'view_team_data',
    'view_own_sessions', 'update_profile', 'VIEW_SCORECARDS', 'CREATE_SCORECARDS', 'MANAGE_SCORECARDS'
  ],
  [UserRole.MANAGER]: [
    'view_users', 'view_team_leaders', 'manage_team_leaders', 'view_reports', 'create_reports',
    'manage_sessions', 'view_sessions', 'view_agents', 'view_agent_metrics', 'view_team_data',
    'view_own_sessions', 'update_profile', 'VIEW_SCORECARDS', 'CREATE_SCORECARDS'
  ],
  [UserRole.TEAM_LEADER]: [
    'view_agents', 'manage_agents', 'conduct_sessions', 'view_sessions', 'manage_sessions',
    'view_agent_metrics', 'manage_agent_metrics', 'view_own_sessions', 'update_profile',
    'VIEW_SCORECARDS', 'CREATE_SCORECARDS'
  ],
  [UserRole.AGENT]: [
    'view_own_metrics', 'view_own_sessions', 'update_profile'
  ],
};

async function seedPermissions() {
  console.log('🌱 Seeding permissions...');
  
  try {
    // Create permissions
    for (const permission of permissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: permission,
        create: permission,
      });
    }
    console.log(`✅ Created ${permissions.length} permissions`);

    // Create role permissions
    let totalRolePermissions = 0;
    for (const [role, permissionNames] of Object.entries(rolePermissions)) {
      for (const permissionName of permissionNames) {
        const permission = await prisma.permission.findUnique({
          where: { name: permissionName }
        });
        
        if (permission) {
          await prisma.rolePermission.upsert({
            where: {
              role_permissionId: {
                role,
                permissionId: permission.id
              }
            },
            update: {},
            create: {
              role,
              permissionId: permission.id,
            }
          });
          totalRolePermissions++;
        }
      }
    }
    console.log(`✅ Created ${totalRolePermissions} role permissions`);
    console.log('🎉 Permission seeding completed successfully!');
    
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
      console.error(error);
      process.exit(1);
    });
}

export default seedPermissions;
