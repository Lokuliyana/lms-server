"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assignmentController_1 = require("../controllers/assignmentController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Fix 2.3: Add requirePermission("assignments.create") to upsertSubmission
router.post('/:assignmentId/submit', (0, auth_1.requirePermission)('assignments.create'), assignmentController_1.upsertSubmission);
exports.default = router;
