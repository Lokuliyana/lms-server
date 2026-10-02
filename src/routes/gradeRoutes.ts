import { Router } from "express";
import { requirePermission, authenticate } from "../middlewares/auth";
import {
  recordExamResults,
  updateExamResults,
  togglePublishExamResults,
  getClassExamResults,
  getMyExamResults,
  exportClassExamResults,
} from "../controllers/gradeController";

const router = Router();

router.post("/", requirePermission("grades.record"), recordExamResults);
router.put("/:id", requirePermission("grades.record"), updateExamResults);
router.put("/:id/publish", requirePermission("grades.publish"), togglePublishExamResults);
router.get("/class/:classId", requirePermission("grades.view"), getClassExamResults);
router.get("/export/:id", requirePermission("grades.exportReport"), exportClassExamResults);
router.get("/my", authenticate, getMyExamResults);

export default router;
