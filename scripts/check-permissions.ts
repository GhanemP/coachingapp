import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPermissions() {
  console.log('🔍 Checking current permissions and role assignments...\n');

  // Check all permissions
  const permissions = await prisma.permission.findMany({
    orderBy: { name: 'asc' },
  });
  console.log(`📋 Total permissions: ${permissions.length}`);
  permissions.forEach(p => {
    console.log(`  - ${p.name} (${p.resource}:${p.action})`);
  });

  // Check role permissions
  console.log('\n🔐 Role Permission Assignments:');
  const rolePermissions = await prisma.rolePermission.findMany({
    include: {
      permission: true,
    },
    orderBy: [{ role: 'asc' }, { permission: { name: 'asc' } }],
  });

  if (rolePermissions.length === 0) {
    console.log('❌ NO ROLE PERMISSIONS FOUND! This is the problem.');
  } else {
    console.log(`📊 Total role permissions: ${rolePermissions.length}`);

    const roleGroups = rolePermissions.reduce(
      (acc, rp) => {
        if (!acc[rp.role]) {
          acc[rp.role] = [];
        }
        acc[rp.role].push(rp.permission.name);
        return acc;
      },
      {} as Record<string, string[]>
    );

    Object.entries(roleGroups).forEach(([role, perms]) => {
      console.log(`\n${role}:`);
      perms.forEach(perm => console.log(`  - ${perm}`));
    });
  }

  // Check users
  console.log('\n👥 Users:');
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
    orderBy: { role: 'asc' },
  });

  const usersByRole = users.reduce(
    (acc, user) => {
      if (!acc[user.role]) {
        acc[user.role] = [];
      }
      acc[user.role].push(user.email);
      return acc;
    },
    {} as Record<string, string[]>
  );

  Object.entries(usersByRole).forEach(([role, emails]) => {
    console.log(`\n${role} (${emails.length}):`);
    emails.forEach(email => console.log(`  - ${email}`));
  });
}

checkPermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
