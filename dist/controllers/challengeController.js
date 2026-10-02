"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyChallenges = exports.getFriendList = exports.submitMatchAttempt = exports.acceptChallenge = exports.createChallenge = void 0;
// controllers/challengeController.js
const assessmentService = __importStar(require("../services/assessmentService"));
const toInt = (v, def) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
};
// Create a targeted async challenge (opponent required)
const createChallenge = async (req, res) => {
    try {
        const { quizId, opponentId, url } = req.body;
        if (!quizId)
            return res.status(422).json({ message: "quizId is required" });
        if (!opponentId)
            return res.status(422).json({ message: "opponentId is required" });
        const match = await assessmentService.createChallenge({
            creatorId: req.user.userId,
            opponentId,
            quizId,
            url, // <- pass through
        });
        return res.status(201).json({ message: "Challenge created", match });
    }
    catch (e) {
        console.error("createChallenge error:", e);
        return res
            .status(400)
            .json({ message: e.message || "Failed to create challenge" });
    }
};
exports.createChallenge = createChallenge;
// Optional accept (kept for parity; not required for async flow)
const acceptChallenge = async (req, res) => {
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
    }
    catch (e) {
        console.error("acceptChallenge error:", e);
        return res
            .status(400)
            .json({ message: e.message || "Failed to accept challenge" });
    }
};
exports.acceptChallenge = acceptChallenge;
// Attach an existing submission to a match
const submitMatchAttempt = async (req, res) => {
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
    }
    catch (e) {
        console.error("submitMatchAttempt error:", e);
        return res
            .status(400)
            .json({ message: e.message || "Failed to attach submission" });
    }
};
exports.submitMatchAttempt = submitMatchAttempt;
// Prioritized friend list (same grade > same class > frequent/recent duels)
const getFriendList = async (req, res) => {
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
    }
    catch (e) {
        console.error("getFriendList error:", e);
        return res
            .status(400)
            .json({ message: e.message || "Failed to fetch friend list" });
    }
};
exports.getFriendList = getFriendList;
// List my challenges (optionally by status)
const getMyChallenges = async (req, res) => {
    try {
        const status = req.query.status; // queued | in_progress | completed | expired | cancelled
        const rows = await assessmentService.getMyChallenges({
            userId: req.user.userId,
            status,
        });
        return res.status(200).json({ count: rows.length, results: rows });
    }
    catch (e) {
        console.error("getMyChallenges error:", e);
        return res
            .status(400)
            .json({ message: e.message || "Failed to fetch challenges" });
    }
};
exports.getMyChallenges = getMyChallenges;
