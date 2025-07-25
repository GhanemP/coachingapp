import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAdminPermissions() {
  console.log('🔧 Fixing admin permissions...\n');

  try {
    // First, ensure all required permissions exist
    const requiredPermissions = [
      // User management
      { name: 'VIEW_USERS', resource: 'users', action: 'read', description: 'View user list and details' },
      { name: 'CREATE_USERS', resource: 'users', action: 'create', description: 'Create new users' },
      { name: 'UPDATE_USERS', resource: 'users', action: 'update', description: 'Update user information' },
      { name: 'DELETE_USERS', resource: 'users', action: 'delete', description: 'Delete users' },
      { name: 'MANAGE_USERS', resource: 'users', action: 'manage', description: 'Full user management access' },
      
      // Role management
      { name: 'VIEW_ROLES', resource: 'roles', action: 'read', description: 'View roles and permissions' },
      { name: 'MANAGE_ROLES', resource: 'roles', action: 'manage', description: 'Manage roles and permissions' },
      
      // Permission management
      { name: 'MANAGE_PERMISSIONS', resource: 'permissions', action: 'manage', description: 'Manage system permissions' },
    ];

    console.log('📝 Creating/updating permissions...');
    for (const perm of requiredPermissions) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: {
          resource: perm.resource,
          action: perm.action,
          description: perm.description,
        },
        create: perm,
      });
      console.log(`  ✓ ${perm.name}`);
    }

    // Get all permissions for ADMIN role
    const allPermissions = await prisma.permission.findMany();
    console.log(`\n📊 Total permissions in system: ${allPermissions.length}`);

    // Assign all permissions to ADMIN role
    console.log('\n🔐 Assigning all permissions to ADMIN role...');
    let assignedCount = 0;
    let existingCount = 0;

    for (const permission of allPermissions) {
      const existing = await prisma.rolePermission.findUnique({
        where: {
          role_permissionId: {
            role: 'ADMIN',
            permissionId: permission.id,
          },
        },
      });

      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            role: 'ADMIN',
            permissionId: permission.id,
          },
        });
        assignedCount++;
        console.log(`  ✓ Assigned: ${permission.name}`);
      } else {
        existingCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`  - Newly assigned: ${assignedCount}`);
    console.log(`  - Already assigned: ${existingCount}`);
    console.log(`  - Total ADMIN permissions: ${assignedCount + existingCount}`);

    // Verify admin user exists
    const adminUser = await prisma.user.findFirst({
      where: { 
        email: 'admin@company.com',
        role: 'ADMIN'
      },
    });

    if (adminUser) {
      console.log(`\n✅ Admin user verified: ${adminUser.email}`);
      
      // List admin's permissions
      const adminPermissions = await prisma.rolePermission.findMany({
        where: { role: 'ADMIN' },
        include: { permission: true },
      });
      
      console.log(`\n🔑 Admin has ${adminPermissions.length} permissions:`);
      const permissionsByResource = adminPermissions.reduce((acc, rp) => {
        const resource = rp.permission.resource;
        if (!acc[resource]) acc[resource] = [];
        acc[resource].push(rp.permission.name);
        return acc;
      }, {} as Record<string, string[]>);

      Object.entries(permissionsByResource).forEach(([resource, perms]) => {
        console.log(`  ${resource}: ${perms.join(', ')}`);
      });
    } else {
      console.log('\n⚠️  Admin user not found! Run prisma db seed to create it.');
    }

    console.log('\n✅ Admin permissions fixed successfully!');
    console.log('\n📌 Next steps:');
    console.log('  1. Restart your application');
    console.log('  2. Login as admin@company.com');
    console.log('  3. You should now have access to all admin features');

  } catch (error) {
    console.error('\n❌ Error fixing permissions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixAdminPermissions();