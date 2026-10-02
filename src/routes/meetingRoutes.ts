import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { createMeetingTicketHandler, meetingByTicketPublic } from "../controllers/meetingController";

const router = Router();

router.post("/ticket", authenticate, createMeetingTicketHandler);
router.get("/ticket/:ticket", meetingByTicketPublic);

export default router;
