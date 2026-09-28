import { Request, Response } from 'express';
import { Role } from '../models/Role';
import { Permission } from '../models/Permission';
import { RolePermission } from '../models/RolePermission';

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await Role.find().lean();
    res.json({ success: true, data: roles });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await Permission.find().lean();
    res.json({ success: true, data: permissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getRolePermissions = async (req: Request, res: Response) => {
  try {
    const roleId = req.params.roleId;
    const rolePermissions = await RolePermission.find({ role_id: roleId }).lean();
    const permissionIds = rolePermissions.map(rp => rp.permission_id);
    res.json({ success: true, data: permissionIds });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const updateRolePermissions = async (req: Request, res: Response) => {
  try {
    const roleId = req.params.roleId;
    const { permissionIds } = req.body; // array of Permission IDs

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ success: false, message: 'Invalid permissionIds array' });
    }

    // Protect system admin role from losing access maybe? We'll assume admin handles with care or we could add check
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // Remove existing
    await RolePermission.deleteMany({ role_id: roleId });

    // Add new ones
    if (permissionIds.length > 0) {
      const inserts = permissionIds.map(permId => ({ role_id: roleId, permission_id: permId }));
      await RolePermission.insertMany(inserts);
    }

    res.json({ success: true, message: 'Permissions updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const addRolePermission = async (req: Request, res: Response) => {
  try {
    const { roleId, permissionId } = req.params;
    const role = await Role.findById(roleId);
    const permission = await Permission.findById(permissionId);
    if (!role || !permission) return res.status(404).json({ success: false, message: 'Role or Permission not found' });

    await RolePermission.updateOne(
      { role_id: roleId, permission_id: permissionId },
      { $set: { role_id: roleId, permission_id: permissionId } },
      { upsert: true }
    );
    res.json({ success: true, message: 'Permission added' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const removeRolePermission = async (req: Request, res: Response) => {
  try {
    const { roleId, permissionId } = req.params;
    await RolePermission.deleteOne({ role_id: roleId, permission_id: permissionId });
    res.json({ success: true, message: 'Permission removed' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
