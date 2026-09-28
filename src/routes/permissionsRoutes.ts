import { Router } from 'express';
import { getRoles, getPermissions, getRolePermissions, updateRolePermissions, addRolePermission, removeRolePermission } from '../controllers/permissionsController';
import { requirePermission } from '../middlewares/auth';

const router = Router();

router.get('/roles', requirePermission('users.read'), getRoles);
router.get('/', requirePermission('users.read'), getPermissions);
router.get('/roles/:roleId', requirePermission('users.read'), getRolePermissions);
router.post('/roles/:roleId', requirePermission('users.update'), updateRolePermissions);

router.post('/roles/:roleId/permissions/:permissionId', requirePermission('users.update'), addRolePermission);
router.delete('/roles/:roleId/permissions/:permissionId', requirePermission('users.update'), removeRolePermission);

export default router;
