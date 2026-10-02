// controllers/challengeController.js
import * as assessmentService from "../services/assessmentService";

const toInt = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

// Create a targeted async challenge (opponent required)
export const createChallenge = async (req, res) => {
  try {
    const { quizId, opponentId, url } = req.body;

    if (!quizId) return res.status(422).json({ message: "quizId is required" });
    if (!opponentId)
      return res.status(422).json({ message: "opponentId is required" });

    const match = await assessmentService.createChallenge({
      creatorId: req.user.userId,
      opponentId,
      quizId,
      url, // <- pass through
    });

    return res.status(201).json({ message: "Challenge created", match });
  } catch (e) {
    console.error("createChallenge error:", e);
    return res
      .status(400)
      .json({ message: e.message || "Failed to create challenge" });
  }
};

// Optional accept (kept for parity; not required for async flow)
export const acceptChallenge = async (req, res) => {
  try {
    const matchId = req.params.matchId || req.body?.matchId;
    if (!matchId)
      return res.status(422).json({ message: "matchId param is required" });

    const userId = req.user?.userId || req.user?._id?.toString();
    const match = await assessmentService.acceptChallenge({
      matchId,
      userId,
    });

    return res.status(200).json({ message: "Challenge accepted", match });
  } catch (e) {
    console.error("acceptChallenge error:", e);
    return res
      .status(400)
      .json({ message: e.message || "Failed to accept challenge" });
  }
};

// Attach an existing submission to a match
export const submitMatchAttempt = async (req, res) => {
  try {
    const matchId = req.params.matchId || req.body?.matchId;
    const { submission_id } = req.body; // QuizSubmission _id

    if (!matchId)
      return res.status(422).json({ message: "matchId param is required" });
    if (!submission_id)
      return res.status(422).json({ message: "submission_id is required" });

    const userId = req.user?.userId || req.user?._id?.toString();
    const match = await assessmentService.submitMatchAttempt({
      matchId,
      userId,
      submissionId: submission_id,
    });

    return res.status(200).json({ message: "Submission attached", match });
  } catch (e) {
    console.error("submitMatchAttempt error:", e);
    return res
      .status(400)
      .json({ message: e.message || "Failed to attach submission" });
  }
};

// Prioritized friend list (same grade > same class > frequent/recent duels)
export const getFriendList = async (req, res) => {
  try {
    console.log("getFriendList called with query:", req.body, req.query);
    const limit = toInt(req.query.limit, 20);
    const recentDays = toInt(req.query.recentDays, 30);

    const friends = await assessmentService.getFriendList({
      userId: req.user.userId,
      limit,
      recentDays,
    });

    return res.status(200).json({
      count: Array.isArray(friends) ? friends.length : 0,
      results: friends || [],
    });
  } catch (e) {
    console.error("getFriendList error:", e);
    return res
      .status(400)
      .json({ message: e.message || "Failed to fetch friend list" });
  }
};

// List my challenges (optionally by status)
export const getMyChallenges = async (req, res) => {
  try {
    const status = req.query.status; // queued | in_progress | completed | expired | cancelled
    const rows = await assessmentService.getMyChallenges({
      userId: req.user.userId,
      status,
    });
    return res.status(200).json({ count: rows.length, results: rows });
  } catch (e) {
    console.error("getMyChallenges error:", e);
    return res
      .status(400)
      .json({ message: e.message || "Failed to fetch challenges" });
  }
};
