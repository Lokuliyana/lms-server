"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const meetingController_1 = require("../controllers/meetingController");
const router = (0, express_1.Router)();
router.post("/ticket", auth_1.authenticate, meetingController_1.createMeetingTicketHandler);
router.get("/ticket/:ticket", meetingController_1.meetingByTicketPublic);
exports.default = router;
