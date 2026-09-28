import express from "express";
const router = express.Router();
import * as challengeController from "../controllers/challengeController";
import { requirePermission } from "../middlewares/auth";

// Challenges
router.post("/create", requirePermission("challenges.create"), challengeController.createChallenge);
router.get("/my-challenges", requirePermission("challenges.read"), challengeController.getMyChallenges);
router.put("/accept", requirePermission("challenges.create"), challengeController.acceptChallenge);
router.post("/submit", requirePermission("challenges.create"), challengeController.submitMatchAttempt);
router.get("/friends", requirePermission("challenges.read"), challengeController.getFriendList);

export default router;
