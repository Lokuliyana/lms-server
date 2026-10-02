import express from "express";
const router = express.Router();
import * as challengeController from "../controllers/challengeController";
import { requirePermission } from "../middlewares/auth";

// Challenges - Student actions gated by challenges.attempt
router.post("/create", requirePermission("challenges.attempt"), challengeController.createChallenge);
router.get("/my-challenges", requirePermission("challenges.attempt"), challengeController.getMyChallenges);
router.get("/mine", requirePermission("challenges.attempt"), challengeController.getMyChallenges);

// Accept challenge routes supporting :matchId in params or body
router.put("/:matchId/accept", requirePermission("challenges.attempt"), challengeController.acceptChallenge);
router.post("/:matchId/accept", requirePermission("challenges.attempt"), challengeController.acceptChallenge);
router.put("/accept/:matchId", requirePermission("challenges.attempt"), challengeController.acceptChallenge);
router.put("/accept", requirePermission("challenges.attempt"), (req, res, next) => {
  if (req.body?.matchId && !req.params.matchId) {
    req.params.matchId = req.body.matchId;
  }
  challengeController.acceptChallenge(req, res);
});

// Submit match attempt routes supporting :matchId in params or body
router.post("/:matchId/submit", requirePermission("challenges.attempt"), challengeController.submitMatchAttempt);
router.post("/submit/:matchId", requirePermission("challenges.attempt"), challengeController.submitMatchAttempt);
router.post("/submit", requirePermission("challenges.attempt"), (req, res, next) => {
  if (req.body?.matchId && !req.params.matchId) {
    req.params.matchId = req.body.matchId;
  }
  challengeController.submitMatchAttempt(req, res);
});

router.get("/friends", requirePermission("challenges.attempt"), challengeController.getFriendList);

export default router;
