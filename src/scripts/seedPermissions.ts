import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
import { RolePermission } from '../models/RolePermission';
import { MODULES, ACTIONS } from '../config/modules';
import { User } from '../models/User';

export const seedPermissionsAndRoles = async () => {
  try {
    console.log('Seeding permissions...');
    
    // Seed permissions
    for (const mod of MODULES) {
      for (const action of ACTIONS) {
        const key = `${mod.key}.${action}`;
        const label = `Can ${action} ${mod.label}`;
        
        await Permission.updateOne(
          { key },
          { $set: { module: mod.key, action, label } },
          { upsert: true }
        );
      }
    }

    // Seed admin role
    let adminRole = await Role.findOne({ name: 'Admin', is_system_role: true });
    if (!adminRole) {
      adminRole = await Role.create({ name: 'Admin', is_system_role: true });
    }

    // Give admin all permissions
    const allPermissions = await Permission.find();
    for (const perm of allPermissions) {
      await RolePermission.updateOne(
        { role_id: adminRole._id, permission_id: perm._id },
        { $set: { role_id: adminRole._id, permission_id: perm._id } },
        { upsert: true }
      );
    }
    
    console.log('Seeding finished.');
  } catch (err) {
    console.error('Seeding error:', err);
  }
};
