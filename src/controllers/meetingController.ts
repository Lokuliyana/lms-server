import { Request, Response } from "express";
import crypto from "crypto";
import { Class } from "../models/Class";
import MeetingTicket from "../models/MeetingTicket";
import { ClassEnrollment } from "../models/ClassEnrollment";

export const createMeetingTicketHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, mode = "join" } = req.body || {};
    const user = (req as any).user;

    if (!classId) {
      res.status(400).json({ success: false, message: "classId is required" });
      return;
    }

    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc || classDoc.is_deleted) {
      res.status(404).json({ success: false, message: "Class not found" });
      return;
    }

    const permissions: string[] = user.permissions || [];
    const isPrivileged = permissions.includes("zoom.manage") || 
                         permissions.includes("classes.update") || 
                         ["teacher", "admin"].includes(user.role);

    if (mode === "start") {
      if (!isPrivileged) {
        res.status(403).json({ success: false, message: "Forbidden: You do not have permission to start meetings" });
        return;
      }
    } else {
      // join mode
      if (!isPrivileged) {
        // Must be enrolled
        const isEnrolled = await ClassEnrollment.exists({
          classId: classDoc._id,
          userId: user.userId || user._id,
          status: "active"
        }) || (classDoc.enrolled_students && classDoc.enrolled_students.some(s => s.toString() === (user.userId || user._id).toString()));

        if (!isEnrolled) {
          res.status(403).json({ success: false, message: "Forbidden: You are not enrolled in this class" });
          return;
        }
      }
    }

    const rawUrl = mode === "start"
      ? (classDoc.zoom_start_url || classDoc.zoom_join_url)
      : classDoc.zoom_join_url;

    if (!rawUrl) {
      res.status(404).json({ success: false, message: "No live session URL is configured for this class" });
      return;
    }

    const ticket = crypto.randomBytes(18).toString("hex");
    const expiresAt = new Date(Date.now() + 120 * 1000); // 120s

    await MeetingTicket.create({
      ticket,
      class_id: classDoc._id,
      user_id: user.userId || user._id,
      mode,
      join_url: rawUrl,
      expires_at: expiresAt
    });

    res.json({
      success: true,
      ticket,
      redirect: `/api/meetings/ticket/${ticket}`
    });
  } catch (err: any) {
    console.error("Error creating meeting ticket:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const meetingByTicketPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ticket } = req.params;
    if (!ticket) {
      res.status(400).send("Ticket parameter required");
      return;
    }

    const ticketDoc = await MeetingTicket.findOne({ ticket });
    if (!ticketDoc || new Date() > ticketDoc.expires_at) {
      res.status(410).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Ticket Expired</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f3f4f6;">
          <div style="background:#fff;padding:2rem;border-radius:1rem;text-align:center;max-width:400px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
            <h2 style="color:#dc2626;margin-top:0;">Link Expired</h2>
            <p style="color:#4b5563;">This live session link has expired or has already been used. Please return to the class page and click Join again.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }

    const targetUrl = ticketDoc.join_url;
    // Delete single-use ticket
    await MeetingTicket.deleteOne({ _id: ticketDoc._id }).catch(() => {});

    // Render clean launcher page with auto-redirect
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connecting to Live Session...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }
          .card { background: white; padding: 2.5rem; border-radius: 1.25rem; text-align: center; max-width: 440px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0; }
          .spinner { width: 44px; height: 44px; border: 4px solid #e2e8f0; border-top-color: #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1.5rem; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          h2 { color: #0f172a; margin: 0 0 0.5rem; font-size: 1.35rem; }
          p { color: #64748b; font-size: 0.95rem; line-height: 1.5; margin: 0 0 1.5rem; }
          .btn { display: inline-block; background: #4f46e5; color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; text-decoration: none; font-weight: 500; font-size: 0.9rem; transition: background 0.2s; }
          .btn:hover { background: #4338ca; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="spinner"></div>
          <h2>Connecting to Live Session...</h2>
          <p>Redirecting you to Zoom. If the session doesn't open automatically, click the button below.</p>
          <a href="${targetUrl}" class="btn">Launch Zoom</a>
        </div>
        <script>
          setTimeout(() => {
            window.location.href = "${targetUrl}";
          }, 800);
        </script>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err: any) {
    console.error("Error launching meeting by ticket:", err);
    res.status(500).send("Internal server error");
  }
};
