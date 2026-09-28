"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeRolePermission = exports.addRolePermission = exports.updateRolePermissions = exports.getRolePermissions = exports.getPermissions = exports.getRoles = void 0;
const Role_1 = require("../models/Role");
const Permission_1 = require("../models/Permission");
const RolePermission_1 = require("../models/RolePermission");
const getRoles = async (req, res) => {
    try {
        const roles = await Role_1.Role.find().lean();
        res.json({ success: true, data: roles });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
exports.getRoles = getRoles;
const getPermissions = async (req, res) => {
    try {
        const permissions = await Permission_1.Permission.find().lean();
        res.json({ success: true, data: permissions });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
exports.getPermissions = getPermissions;
const getRolePermissions = async (req, res) => {
    try {
        const roleId = req.params.roleId;
        const rolePermissions = await RolePermission_1.RolePermission.find({ role_id: roleId }).lean();
        const permissionIds = rolePermissions.map(rp => rp.permission_id);
        res.json({ success: true, data: permissionIds });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
exports.getRolePermissions = getRolePermissions;
const updateRolePermissions = async (req, res) => {
    try {
        const roleId = req.params.roleId;
        const { permissionIds } = req.body; // array of Permission IDs
        if (!Array.isArray(permissionIds)) {
            return res.status(400).json({ success: false, message: 'Invalid permissionIds array' });
        }
        // Protect system admin role from losing access maybe? We'll assume admin handles with care or we could add check
        const role = await Role_1.Role.findById(roleId);
        if (!role) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }
        // Remove existing
        await RolePermission_1.RolePermission.deleteMany({ role_id: roleId });
        // Add new ones
        if (permissionIds.length > 0) {
            const inserts = permissionIds.map(permId => ({ role_id: roleId, permission_id: permId }));
            await RolePermission_1.RolePermission.insertMany(inserts);
        }
        res.json({ success: true, message: 'Permissions updated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
exports.updateRolePermissions = updateRolePermissions;
const addRolePermission = async (req, res) => {
    try {
        const { roleId, permissionId } = req.params;
        const role = await Role_1.Role.findById(roleId);
        const permission = await Permission_1.Permission.findById(permissionId);
        if (!role || !permission)
            return res.status(404).json({ success: false, message: 'Role or Permission not found' });
        await RolePermission_1.RolePermission.updateOne({ role_id: roleId, permission_id: permissionId }, { $set: { role_id: roleId, permission_id: permissionId } }, { upsert: true });
        res.json({ success: true, message: 'Permission added' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
exports.addRolePermission = addRolePermission;
const removeRolePermission = async (req, res) => {
    try {
        const { roleId, permissionId } = req.params;
        await RolePermission_1.RolePermission.deleteOne({ role_id: roleId, permission_id: permissionId });
        res.json({ success: true, message: 'Permission removed' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
exports.removeRolePermission = removeRolePermission;
