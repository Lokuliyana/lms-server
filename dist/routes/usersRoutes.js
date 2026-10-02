"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRoutes = void 0;
const express_1 = require("express");
const usersController_1 = require("../controllers/usersController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Fix 1.2: Privilege escalation — authorization for editing users only checks requirePermission("users.update")
router.get('/', (0, auth_1.requirePermission)('users.read'), usersController_1.usersController.getAllUsers);
router.post('/', (0, auth_1.requirePermission)('users.create'), usersController_1.usersController.createUser);
router.put('/:id/roles', (0, auth_1.requirePermission)('users.update'), usersController_1.usersController.updateUserRole);
exports.usersRoutes = router;
