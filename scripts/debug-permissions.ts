import { prisma } from '../src/lib/prisma';

async function debugPermissions() {
  console.log('=== DEBUGGING PERMISSIONS AND USERS ===\n');

  // Check all users
  console.log('1. All Users:');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      teamLeaderId: true,
      managedBy: true,
    }
  });
  console.table(users);

  // Check all permissions
  console.log('\n2. All Permissions:');
  const permissions = await prisma.permission.findMany({
    select: {
      id: true,
      name: true,
      resource: true,
      action: true,
      description: true,
    }
  });
  console.table(permissions);

  // Check role permissions
  console.log('\n3. Role Permissions:');
  const rolePermissions = await prisma.rolePermission.findMany({
    include: {
      permission: {
        select: {
          name: true,
          resource: true,
          action: true,
        }
      }
    }
  });
  console.table(rolePermissions.map(rp => ({
    role: rp.role,
    permissionName: rp.permission.name,
    resource: rp.permission.resource,
    action: rp.permission.action,
  })));

  // Check agents
  console.log('\n4. Agent Profiles:');
  const agents = await prisma.agent.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        }
      }
    }
  });
  console.table(agents);

  await prisma.$disconnect();
}

debugPermissions().catch(console.error);