"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedPermissionsAndRoles = void 0;
const Role_1 = require("../models/Role");
const Permission_1 = require("../models/Permission");
const RolePermission_1 = require("../models/RolePermission");
const modules_1 = require("../config/modules");
const seedPermissionsAndRoles = async () => {
    try {
        console.log('Seeding permissions...');
        // Seed permissions
        for (const mod of modules_1.MODULES) {
            for (const action of modules_1.ACTIONS) {
                const key = `${mod.key}.${action}`;
                const label = `Can ${action} ${mod.label}`;
                await Permission_1.Permission.updateOne({ key }, { $set: { module: mod.key, action, label } }, { upsert: true });
            }
        }
        // Seed admin role
        let adminRole = await Role_1.Role.findOne({ name: 'Admin', is_system_role: true });
        if (!adminRole) {
            adminRole = await Role_1.Role.create({ name: 'Admin', is_system_role: true });
        }
        // Give admin all permissions
        const allPermissions = await Permission_1.Permission.find();
        for (const perm of allPermissions) {
            await RolePermission_1.RolePermission.updateOne({ role_id: adminRole._id, permission_id: perm._id }, { $set: { role_id: adminRole._id, permission_id: perm._id } }, { upsert: true });
        }
        console.log('Seeding finished.');
    }
    catch (err) {
        console.error('Seeding error:', err);
    }
};
exports.seedPermissionsAndRoles = seedPermissionsAndRoles;
