"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const studyPackController_1 = require("../controllers/studyPackController");
const router = (0, express_1.Router)();
// Public / student catalog
router.get('/', auth_1.optionalAuth, studyPackController_1.getStudyPacks);
router.get('/class-recordings/:classId', auth_1.authenticate, studyPackController_1.getClassRecordingsForStudyPack);
router.get('/:id', auth_1.optionalAuth, studyPackController_1.getStudyPackById);
// Staff management
router.post('/', auth_1.authenticate, (0, auth_1.requirePermission)('study_packs.manage'), studyPackController_1.createStudyPack);
router.put('/:id', auth_1.authenticate, (0, auth_1.requirePermission)('study_packs.manage'), studyPackController_1.updateStudyPack);
router.delete('/:id', auth_1.authenticate, (0, auth_1.requirePermission)('study_packs.manage'), studyPackController_1.deleteStudyPack);
exports.default = router;
