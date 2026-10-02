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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const challengeController = __importStar(require("../controllers/challengeController"));
const auth_1 = require("../middlewares/auth");
// Challenges - Student actions gated by challenges.attempt
router.post("/create", (0, auth_1.requirePermission)("challenges.attempt"), challengeController.createChallenge);
router.get("/my-challenges", (0, auth_1.requirePermission)("challenges.attempt"), challengeController.getMyChallenges);
router.get("/mine", (0, auth_1.requirePermission)("challenges.attempt"), challengeController.getMyChallenges);
// Accept challenge routes supporting :matchId in params or body
router.put("/:matchId/accept", (0, auth_1.requirePermission)("challenges.attempt"), challengeController.acceptChallenge);
router.post("/:matchId/accept", (0, auth_1.requirePermission)("challenges.attempt"), challengeController.acceptChallenge);
router.put("/accept/:matchId", (0, auth_1.requirePermission)("challenges.attempt"), challengeController.acceptChallenge);
router.put("/accept", (0, auth_1.requirePermission)("challenges.attempt"), (req, res, next) => {
    if (req.body?.matchId && !req.params.matchId) {
        req.params.matchId = req.body.matchId;
    }
    challengeController.acceptChallenge(req, res);
});
// Submit match attempt routes supporting :matchId in params or body
router.post("/:matchId/submit", (0, auth_1.requirePermission)("challenges.attempt"), challengeController.submitMatchAttempt);
router.post("/submit/:matchId", (0, auth_1.requirePermission)("challenges.attempt"), challengeController.submitMatchAttempt);
router.post("/submit", (0, auth_1.requirePermission)("challenges.attempt"), (req, res, next) => {
    if (req.body?.matchId && !req.params.matchId) {
        req.params.matchId = req.body.matchId;
    }
    challengeController.submitMatchAttempt(req, res);
});
router.get("/friends", (0, auth_1.requirePermission)("challenges.attempt"), challengeController.getFriendList);
exports.default = router;
