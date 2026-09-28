// services/quizAndChallengeService.js

import mongoose from "mongoose";
import nodemailer from "nodemailer";
const { ObjectId } = mongoose.Types;

import { Class } from "../models/Class";
import { Quiz } from "../models/Quiz";
import { QuizQuestion } from "../models/QuizQuestion";
import { QuizSubmission } from "../models/QuizSubmission";
import { UserPerformance } from "../models/UserPerformance";
import { ChallengeMatch } from "../models/ChallengeMatch";
import { User } from "../models/User";

const weekKey = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d.toISOString().split("T")[0];
};

const monthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// =====================================================
// Mailer (best-effort; never crashes core flows)
// =====================================================
const mailer = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // e.g., smtp.gmail.com
  port: Number(process.env.EMAIL_PORT || 587),
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

async function sendMail({ to, subject, text, html }) {
  try {
    await mailer.sendMail({
      from: `"Mr. MathsScience" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    });
  } catch (e) {
    console.warn("Email send failed:", e?.message || e);
  }
}

// =====================================================
/** Helpers & Shared Logic */
// =====================================================

// supportsTransactions: true on replSet/mongos; false on standalone
async function supportsTransactions() {
  try {
    await mongoose.connection.db.admin().command({ replSetGetStatus: 1 });
    return true;
  } catch {
    return false;
  }
}

// Never leak correct answers to clients
function stripSolutions(q) {
  const { correct_answer, explanation, ...safe } = q;
  return safe;
}

// Compute grading for a submission
function computeGrading(questions: any[], answerMap: any) {
  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;
  let totalTimeMs = 0;
  const formattedAnswers = [];

  for (const q of questions) {
    const marks = q.marks || 1;
    maxScore += marks;

    const raw = answerMap[q._id.toString()];
    const userAnswer = typeof raw === "object" && raw !== null ? raw.answer : raw;
    const timeMs = typeof raw === "object" && raw !== null && typeof raw.time_ms === "number" ? raw.time_ms : 0;

    let isCorrect = false;
    let earnedMarks = 0;

    if (Array.isArray(q.correct_answer) && Array.isArray(userAnswer)) {
      // Set intersection for partial credit
      const correctSet = new Set(q.correct_answer.map(String));
      const userSet = new Set(userAnswer.map(String));
      
      let matchCount = 0;
      let wrongCount = 0;
      userSet.forEach(val => {
        if (correctSet.has(val)) matchCount++;
        else wrongCount++;
      });

      // Partial credit formula: Max(0, matches - penalties) / totalCorrect
      const netCorrect = Math.max(0, matchCount - wrongCount);
      earnedMarks = correctSet.size > 0 ? (netCorrect / correctSet.size) * marks : 0;
      isCorrect = (earnedMarks === marks); // fully correct
    } else {
      isCorrect = String(userAnswer) === String(q.correct_answer);
      if (isCorrect) earnedMarks = marks;
    }

    if (isCorrect) {
      correctCount += 1;
    }
    totalScore += earnedMarks;

    formattedAnswers.push({
      question_id: q._id,
      answer: userAnswer,
      is_correct: isCorrect,
      score: earnedMarks,
      time_ms: timeMs,
    });

    totalTimeMs += timeMs;
  }

  const percent = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  return {
    formattedAnswers,
    totalScore,
    maxScore,
    correctCount,
    totalQuestions: questions.length,
    totalTimeSec: Math.round(totalTimeMs / 1000),
    percent,
  };
}

// Perf windows & scopes
function windowsFor(when) {
  return [
    { window: "lifetime", window_key: "all" },
    { window: "weekly", window_key: weekKey(when) },
    { window: "monthly", window_key: monthKey(when) },
  ];
}
function scopesFor(quiz) {
  const scopes = [
    { scope_type: "global" },
    { scope_type: "subject", subject: quiz.subject },
    { scope_type: "quiz", scope_id: quiz._id },
  ];
  if (quiz.class_id)
    scopes.push({ scope_type: "class", scope_id: quiz.class_id });
  return scopes;
}

// Single place to compute percent/time from a QuizSubmission doc
function toPctAndTimeMs(sub) {
  const pct =
    sub?.max_score > 0
      ? (sub.total_score / sub.max_score) * 100
      : sub?.total_questions > 0
      ? (sub.correct_answers / sub.total_questions) * 100
      : 0;
  const timeMs = Math.max(0, (sub?.time_spent || 0) * 1000);
  return { pct, timeMs };
}

// FIRST attempt for a quiz for a user (earliest)
async function getFirstAttemptSubmission({ userId, quizId }) {
  const sub = await QuizSubmission.findOne({ user_id: userId, quiz_id: quizId })
    .sort({ attempt_number: 1, submitted_at: 1 })
    .lean();
  if (!sub) return null;
  const { pct, timeMs } = toPctAndTimeMs(sub);
  return {
    _id: sub._id,
    percent: pct,
    timeMs,
    submitted_at: sub.submitted_at || new Date(0),
  };
}

// =====================================================
// Performance aggregation (exported and used internally)
// =====================================================
async function applySubmissionToPerf({
  userId,
  quiz,
  scorePct,
  timeSec,
  when = new Date(),
}) {
  const scopes = scopesFor(quiz);
  const windows = windowsFor(when);

  for (const s of scopes) {
    for (const w of windows) {
      const filter = { user_id: userId, ...s, ...w };
      const inc = {
        attempts: 1,
        sum_score: scorePct,
        sum_time_sec: timeSec,
        sum_sq_score: scorePct * scorePct,
      };

      await UserPerformance.updateOne(
        filter,
        {
          $inc: inc,
          $setOnInsert: { elo: 1200 },
          $set: { last_attempt_at: when, generated_at: new Date() },
        },
        { upsert: true }
      );

      const row = await UserPerformance.findOne(filter).lean();
      const attempts = Math.max(1, row.attempts);
      const avg = row.sum_score / attempts;
      const avgTime = row.sum_time_sec / attempts || 1;
      const ex2 = row.sum_sq_score / attempts;
      const variance = Math.max(0, ex2 - avg * avg);

      await UserPerformance.updateOne(filter, {
        $set: {
          average_score: Number(avg.toFixed(2)),
          efficiency: Number((avg / avgTime).toFixed(6)),
          consistency: Number((1 / (1 + Math.sqrt(variance))).toFixed(6)),
        },
      });
    }
  }
}

// =====================================================
// Quiz: Authoring & Retrieval
// =====================================================
exports.createQuiz = async (data) => {
  try {
    const doc = {
      title: data.title,
      instructions: data.instructions,
      class_id: data.class_id || undefined,
      subject: data.subject || undefined,
      difficulty: data.difficulty || "Easy",
      time_limit_sec: data.time_limit_sec ?? 0,
      question_count: data.question_count ?? undefined,
      version: 1,
      matchmaking_enabled: data.matchmaking_enabled ?? true,
      async_enabled: data.async_enabled ?? true,
      is_active: data.is_active ?? true,
      created_by: data.created_by || undefined,
    };
    return await Quiz.create(doc);
  } catch (error) {
    if (error?.name === "ValidationError") {
      throw new Error(
        Object.values(error.errors)
          .map((e) => e.message)
          .join(", ")
      );
    }
    throw new Error("Error creating quiz");
  }
};

exports.addQuestionsToQuiz = async (quizId, questions) => {
  try {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new Error("Quiz not found");
    if (!Array.isArray(questions))
      throw new Error("Questions should be an array");

    const newQuestions = questions.map((q) => ({ ...q, quiz_id: quizId }));
    await QuizQuestion.insertMany(newQuestions, { ordered: false });
    return { message: "Questions added successfully" };
  } catch {
    throw new Error("Error adding questions to quiz");
  }
};

exports.updateQuestion = async (questionId, data) => {
  try {
    const question = await QuizQuestion.findById(questionId);
    if (!question) throw new Error("Question not found");

    const allowed = [
      "question",
      "type",
      "marks",
      "options",
      "correct_answer",
      "explanation",
      "image",
      "formula",
      "dragItems",
      "sliderRange",
      "meta",
    ];
    const $set = {};
    for (const k of allowed) if (k in data) $set[k] = data[k];

    const updated = await QuizQuestion.findByIdAndUpdate(
      questionId,
      { $set },
      { new: true }
    );
    return { message: "Question updated successfully", question: updated };
  } catch {
    throw new Error("Error updating question");
  }
};

// SAFE list with grade + questions sans answers
exports.getAllQuizzesForPlay = async () => {
  try {
    const quizzes = await Quiz.find({ is_active: true })
      .populate("class_id", "grade")
      .lean();

    const quizIds = quizzes.map((q) => q._id);
    const questions = await QuizQuestion.find({ quiz_id: { $in: quizIds } })
      .select("quiz_id type question options image marks sliderRange dragItems")
      .lean();

    const map = {};
    for (const q of questions) {
      const id = q.quiz_id.toString();
      if (!map[id]) map[id] = [];
      map[id].push(stripSolutions(q));
    }

    return quizzes.map((quiz) => ({
      ...quiz,
      grade: quiz.class_id?.grade || null,
      questions: map[quiz._id.toString()] || [],
    }));
  } catch {
    throw new Error("Error fetching quizzes");
  }
};

// SAFE single quiz for play
exports.getQuizByIdForPlay = async (quizId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(quizId)) return null;

    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz) return null;

    const questions = await QuizQuestion.find({ quiz_id: quiz._id })
      .select("quiz_id type question options image marks sliderRange dragItems")
      .lean();

    return { ...quiz, questions: questions.map(stripSolutions) };
  } catch {
    throw new Error("Error retrieving quiz");
  }
};

// Owner-only detailed view after a submission
exports.getSubmissionById = async (submissionId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(submissionId)) return null;

  const submission = await QuizSubmission.findById(submissionId)
    .populate("quiz_id", "title subject")
    .populate("answers.question_id");

  if (!submission) return null;
  if (submission.user_id.toString() !== userId.toString()) return null;

  const fullQuiz = await QuizQuestion.find({
    quiz_id: submission.quiz_id._id,
  }).lean();
  const questionsMap = {};
  for (const q of fullQuiz) {
    questionsMap[q._id.toString()] = {
      id: q._id,
      type: q.type,
      question: q.question,
      formula: q.formula,
      image: q.image,
      options: q.options,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      dragItems: q.dragItems,
      sliderRange: q.sliderRange,
    };
  }

  const mappedAnswers = submission.answers.map((ans) => {
    const qid =
      ans.question_id && ans.question_id._id
        ? ans.question_id._id.toString()
        : ans.question_id
        ? ans.question_id.toString()
        : "";
    const question = questionsMap[qid] || {};
    return { ...question, userAnswer: ans.answer, isCorrect: ans.is_correct };
  });

  const percent =
    submission.max_score > 0
      ? Number(
          ((submission.total_score / submission.max_score) * 100).toFixed(2)
        )
      : submission.total_questions > 0
      ? Number(
          (
            (submission.correct_answers / submission.total_questions) *
            100
          ).toFixed(2)
        )
      : 0;

  return {
    id: submission._id,
    quizTitle:
      submission.paper_title || submission.quiz_id?.title || "Untitled",
    subject: submission.subject || submission.quiz_id?.subject || "Unknown",
    score: submission.total_score,
    maxScore: submission.max_score,
    percent,
    timeSpent: Math.round((submission.time_spent || 0) / 60),
    date: submission.submitted_at,
    questions: mappedAnswers,
  };
};

// =====================================================
// Quiz: Submission (+perf, +attach to challenges)
// =====================================================
exports.submitQuiz = async (
  userId,
  quizId,
  answerMap,
  clientTotalTimeSec = 0
) => {
  try {
    // Validate ids up front
    const toObjId = (v) => new mongoose.Types.ObjectId(v);
    const quizObjId = toObjId(quizId);
    const userObjId = toObjId(userId);

    // 1) Fetch quiz
    const quiz = await Quiz.findById(quizObjId);
    if (!quiz) {
      const e = new Error("Quiz not found");
      e.code = "QUIZ_NOT_FOUND";
      throw e;
    }

    // 2) Fetch questions
    const questions = await QuizQuestion.find({ quiz_id: quizObjId }).lean();

    // 3) Grade
    let grading;
    try {
      grading = computeGrading(questions, answerMap);
    } catch (e) {
      e.code = "GRADING_FAILED";
      e.meta = { questionsCount: questions.length };
      throw e;
    }
    const {
      formattedAnswers,
      totalScore,
      maxScore,
      correctCount,
      totalQuestions,
      totalTimeSec,
      percent,
    } = grading;

    // 4) Attempt number
    const existingCount = await QuizSubmission.countDocuments({
      user_id: userObjId,
      quiz_id: quizObjId,
    });
    const attempt_number = existingCount + 1;

    // 5) Write submission
    const submission = await QuizSubmission.create({
      user_id: userObjId,
      quiz_id: quizObjId,
      subject: quiz.subject,
      paper_title: quiz.title,
      answers: formattedAnswers,
      total_score: totalScore,
      max_score: maxScore,
      total_questions: totalQuestions,
      correct_answers: correctCount,
      time_spent: clientTotalTimeSec || totalTimeSec,
      attempt_number,
      submitted_at: new Date(),
    });

    // 6) Aggregates
    try {
      await applySubmissionToPerf({
        userId: userObjId,
        quiz,
        scorePct: percent,
        timeSec: submission.time_spent || 0,
        when: submission.submitted_at,
      });
    } catch (e) {
      e.code = "AGGREGATE_PERF_FAILED";
      e.meta = { submissionId: submission._id.toString() };
      throw e;
    }

    // 7) Attach to active challenges for this quiz
    try {
      await tryAttachSubmissionToChallenges({ submission });
    } catch (e) {
      console.error("ATTACH_CHALLENGES_FAILED (ignored):", {
        message: e?.message,
        name: e?.name,
        stack: e?.stack,
        submissionId: submission?._id?.toString(),
      });
    }

    return submission;
  } catch (error) {
    console.error("submitQuiz failed:", {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      meta: error.meta,
    });
    throw new Error(`Error submitting quiz: ${error.message}`);
  }
};

// =====================================================
// First-Attempt Leaderboard
// =====================================================
exports.getFirstAttemptLeaderboard = async ({
  quizId,
  limit = 50,
  grade, // optional StudentProfile.grade
  classId, // optional class filter
}) => {
  if (!mongoose.Types.ObjectId.isValid(quizId))
    throw new Error("Invalid quiz id");

  const match = {
    quiz_id: new mongoose.Types.ObjectId(quizId),
    attempt_number: 1,
  };

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        percent: {
          $cond: [
            { $gt: ["$max_score", 0] },
            { $multiply: [{ $divide: ["$total_score", "$max_score"] }, 100] },
            {
              $cond: [
                { $gt: ["$total_questions", 0] },
                {
                  $multiply: [
                    { $divide: ["$correct_answers", "$total_questions"] },
                    100,
                  ],
                },
                0,
              ],
            },
          ],
        },
      },
    },
    { $sort: { percent: -1, submitted_at: 1 } },
    { $limit: Number(limit) },
    {
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "u",
      },
    },
    { $unwind: "$u" },
    ...(grade
      ? [
          {
            $lookup: {
              from: "studentprofiles",
              localField: "user_id",
              foreignField: "user_id",
              as: "sp",
            },
          },
          { $unwind: "$sp" },
          { $match: { "sp.grade": grade } },
        ]
      : []),
    ...(classId
      ? [
          {
            $lookup: {
              from: "classes",
              localField: "user_id",
              foreignField: "enrolled_students",
              as: "cls",
            },
          },
          { $match: { "cls._id": new mongoose.Types.ObjectId(classId) } },
        ]
      : []),
    {
      $project: {
        userId: "$user_id",
        name: "$u.full_name",
        email: "$u.email",
        percent: { $round: ["$percent", 2] },
        submitted_at: 1,
      },
    },
  ];

  return await QuizSubmission.aggregate(pipeline);
};

// =====================================================
// Admin/Student summaries
// =====================================================
exports.getUserQuizPerformance = async ({ user_id, month }) => {
  const match = { user_id: new mongoose.Types.ObjectId(user_id) };

  if (month) {
    const [year, m] = month.split("-");
    const from = new Date(`${year}-${m}-01`);
    const to = new Date(from);
    to.setMonth(to.getMonth() + 1);
    match.submitted_at = { $gte: from, $lt: to };
  }

  const submissionsRaw = await QuizSubmission.find(match)
    .populate("user_id", "full_name")
    .populate("quiz_id", "title subject")
    .lean();

  const submissions = submissionsRaw.map((sub) => {
    const percent =
      sub.max_score > 0
        ? Number(((sub.total_score / sub.max_score) * 100).toFixed(2))
        : sub.total_questions > 0
        ? Number(((sub.correct_answers / sub.total_questions) * 100).toFixed(2))
        : 0;
    return {
      id: sub._id,
      studentId: sub.user_id?._id?.toString(),
      studentName: sub.user_id?.full_name || "N/A",
      paperTitle: sub.quiz_id?.title || "Untitled",
      subject: sub.quiz_id?.subject || "Unknown",
      score: sub.total_score,
      maxScore: sub.max_score,
      percent,
      timeSpent: Math.round((sub.time_spent || 0) / 60),
      date: sub.submitted_at,
    };
  });

  const avgPercent =
    submissions.reduce((acc, cur) => acc + cur.percent, 0) /
    (submissions.length || 1);

  return {
    total_attempts: submissions.length,
    average_percent: Number(avgPercent.toFixed(2)),
    submissions,
  };
};

// =====================================================
// Challenge (async + email)
// =====================================================

// =======================
// HTML Escape helper
// =======================
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// =======================
// EMAIL TEMPLATE generator
// =======================
function buildChallengeEmailHtml({
  logoUrl,
  appUrl,
  quizTitle,
  creatorName,
  opponentName,
  matchUrl,
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You’ve been challenged – ${escapeHtml(quizTitle)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f8fafc;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(79, 70, 229, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      height: 60px;
      width: auto;
      margin-bottom: 20px;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
    }
    .badge {
      display: inline-block;
      padding: 6px 16px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 100px;
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      backdrop-filter: blur(4px);
    }
    .content {
      padding: 48px 40px;
      text-align: center;
    }
    .greeting {
      font-size: 16px;
      color: #64748b;
      margin-bottom: 12px;
    }
    .title {
      font-size: 28px;
      font-weight: 800;
      color: #1e293b;
      line-height: 1.2;
      margin-bottom: 24px;
    }
    .highlight {
      color: #4f46e5;
    }
    .description {
      font-size: 16px;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 40px;
    }
    .rules-card {
      background-color: #f1f5f9;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 40px;
      text-align: left;
    }
    .rules-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }
    .rule-item {
      font-size: 14px;
      color: #475569;
      margin-bottom: 8px;
      display: flex;
      align-items: flex-start;
    }
    .rule-icon {
      margin-right: 10px;
      color: #4f46e5;
    }
    .cta-button {
      display: inline-block;
      padding: 18px 44px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4);
      transition: all 0.3s ease;
    }
    .footer {
      padding: 32px 40px;
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }
    .footer-text {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .footer-link {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 500;
    }
    .fallback-link {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 24px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="${logoUrl}" alt="Logo" class="logo" />
        <br />
        <div class="badge">Challenge Invite</div>
      </div>
      <div class="content">
        <div class="greeting">Hi ${escapeHtml(opponentName)},</div>
        <h1 class="title">
          <span class="highlight">${escapeHtml(creatorName)}</span> has challenged you!
        </h1>
        <p class="description">
          Think you can beat them? You've been invited to compete in <br />
          <strong style="color: #1e293b;">“${escapeHtml(quizTitle)}”</strong>
        </p>
        
        <div class="rules-card">
          <div class="rules-title">🏆 Scoring Rules</div>
          <div class="rule-item">
            <span class="rule-icon">●</span>
            <span>Higher accuracy wins the match.</span>
          </div>
          <div class="rule-item">
            <span class="rule-icon">●</span>
            <span>If scores are tied, the faster completion time wins.</span>
          </div>
          <div class="rule-item">
            <span class="rule-icon">●</span>
            <span>Your first attempt from this moment counts!</span>
          </div>
        </div>

        <a href="${matchUrl}" class="cta-button">Accept Challenge</a>
        
        <div class="fallback-link">
          If the button doesn't work, copy this link: <br />
          <a href="${matchUrl}" class="footer-link">${escapeHtml(matchUrl)}</a>
        </div>
      </div>
      <div class="footer">
        <p class="footer-text">
          © ${new Date().getFullYear()} Mr MathsScience LK. All rights reserved.<br />
          You received this because you are part of the ${escapeHtml(appUrl.replace(/^https?:\/\//, ""))} community.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

function buildChallengeResultEmailHtml({
  logoUrl,
  appUrl,
  quizTitle,
  p1Name,
  p2Name,
  p1Score,
  p2Score,
  p1Time,
  p2Time,
  winnerName,
  isDraw,
  tiebreak,
}) {
  const winnerText = isDraw ? "It's a Draw!" : `${winnerName} Won!`;
  const resultColor = isDraw ? "#64748b" : "#10b981";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Challenge Result – ${escapeHtml(quizTitle)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 40px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; text-align: center; }
    .logo { height: 50px; }
    .content { padding: 40px; text-align: center; }
    .result-badge { display: inline-block; padding: 8px 24px; background-color: ${resultColor}; color: white; border-radius: 100px; font-weight: 700; font-size: 18px; margin-bottom: 24px; }
    .quiz-title { font-size: 20px; color: #64748b; margin-bottom: 32px; }
    .stats-container { display: flex; justify-content: space-between; margin-bottom: 40px; gap: 20px; }
    .player-card { flex: 1; background-color: #f1f5f9; padding: 20px; border-radius: 16px; }
    .player-name { font-weight: 700; color: #1e293b; margin-bottom: 12px; font-size: 16px; }
    .stat-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; }
    .stat-label { color: #64748b; }
    .stat-value { font-weight: 600; color: #1e293b; }
    .tiebreak-info { font-size: 13px; color: #94a3b8; margin-top: 20px; font-style: italic; }
    .footer { padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="${logoUrl}" alt="Logo" class="logo" />
      </div>
      <div class="content">
        <div class="result-badge">${winnerText}</div>
        <div class="quiz-title">Match Result: <strong>${escapeHtml(quizTitle)}</strong></div>
        
        <div style="display: table; width: 100%; border-spacing: 10px;">
          <div style="display: table-cell; background: #f8fafc; padding: 20px; border-radius: 16px; width: 50%;">
            <div class="player-name">${escapeHtml(p1Name)}</div>
            <div class="stat-row"><span class="stat-label">Score:</span> <span class="stat-value">${p1Score}%</span></div>
            <div class="stat-row"><span class="stat-label">Time:</span> <span class="stat-value">${p1Time}s</span></div>
          </div>
          <div style="display: table-cell; background: #f8fafc; padding: 20px; border-radius: 16px; width: 50%;">
            <div class="player-name">${escapeHtml(p2Name)}</div>
            <div class="stat-row"><span class="stat-label">Score:</span> <span class="stat-value">${p2Score}%</span></div>
            <div class="stat-row"><span class="stat-label">Time:</span> <span class="stat-value">${p2Time}s</span></div>
          </div>
        </div>

        ${tiebreak !== "none" ? `<div class="tiebreak-info">Tiebreak applied: ${tiebreak.replace("_", " ")}</div>` : ""}
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Mr MathsScience LK. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
`;
}


const APP_URL =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.danidu.com";

// Create a targeted async challenge and email the opponent
exports.createChallenge = async ({ creatorId, opponentId, quizId, url }) => {
  const [quiz, creator, opponent] = await Promise.all([
    Quiz.findById(quizId).lean(),
    User.findById(creatorId).lean(),
    User.findById(opponentId).lean(),
  ]);

  if (!quiz) throw new Error("Quiz not found");
  if (!creator || !opponent) throw new Error("Users not found");
  if (creator._id.toString() === opponent._id.toString()) {
    throw new Error("Cannot challenge yourself");
  }

  const match = await ChallengeMatch.create({
    quiz_id: quiz._id,
    mode: "async",
    status: "queued",
    p1_id: creator._id,
    p2_id: opponent._id,
    class_id: quiz.class_id || undefined,
    requires_enrollment: false,
    question_seed: Math.random().toString(36).slice(2, 10),
    quiz_version: quiz.version || 1,
    time_limit_sec: quiz.time_limit_sec || 0,
    started_at: null,
  });

  // Prefill both sides from FIRST attempts (if already played)
  const [creatorFirst, opponentFirst] = await Promise.all([
    getFirstAttemptSubmission({ userId: creator._id, quizId: quiz._id }),
    getFirstAttemptSubmission({ userId: opponent._id, quizId: quiz._id }),
  ]);

  let needsResolve = false;

  if (creatorFirst) {
    match.p1_submission_id = creatorFirst._id;
    match.p1_score_pct = creatorFirst.percent;
    match.p1_time_ms = creatorFirst.timeMs;
    match.status = "in_progress";
    match.started_at = match.started_at || new Date();
  }
  if (opponentFirst) {
    match.p2_submission_id = opponentFirst._id;
    match.p2_score_pct = opponentFirst.percent;
    match.p2_time_ms = opponentFirst.timeMs;
    match.status = "in_progress";
    match.started_at = match.started_at || new Date();
  }
  if (match.p1_submission_id && match.p2_submission_id) needsResolve = true;

  if (needsResolve) {
    await resolveChallenge(match);
  } else {
    await match.save();
  }

  // ----- Build URLs -----
  const baseQuizUrl =
    url && typeof url === "string"
      ? url
      : `${APP_URL}/quizzes/${quiz._id.toString()}`;

  const matchUrl = `${baseQuizUrl}${
    baseQuizUrl.includes("?") ? "&" : "?"
  }match=${match._id}`;

  const logoUrl = "https://akeagjxcoxqqfjurotod.supabase.co/storage/v1/object/public/files/class/new/1766611984449-logo.png";

  // Plain-text fallback
  const textLines = [
    `${creator.full_name} challenged you on "${quiz.title}".`,
    "",
    `Play now: ${matchUrl}`,
    "",
    `Scoring rules:`,
    ` • If you already played this quiz, your FIRST attempt is used.`,
    ` • Otherwise, your first attempt AFTER now will count.`,
    `Winner: higher %; tie → faster total time.`,
  ];

  const text = textLines.join("\n");

  const html = buildChallengeEmailHtml({
    logoUrl,
    appUrl: APP_URL,
    quizTitle: quiz.title,
    creatorName: creator.full_name,
    opponentName: opponent.full_name,
    matchUrl,
  });

  // Email opponent (HTML + text)
  await sendMail({
    to: opponent.email,
    subject: `You’ve been challenged – ${quiz.title}`,
    text,
    html,
  });

  return match;
};

// List my challenges
exports.getMyChallenges = async ({ userId, status }) => {
  const match = { $or: [{ p1_id: userId }, { p2_id: userId }] };
  if (status) match.status = status;

  return await ChallengeMatch.find(match)
    .sort({ created_at: -1 })
    .populate("quiz_id", "title")
    .populate("p1_id", "full_name email")
    .populate("p2_id", "full_name email");
};

// Explicitly attach a finished submission (idempotent per side)
exports.acceptChallenge = async ({ matchId, userId }) => {
  const match = await ChallengeMatch.findById(matchId);
  if (!match) throw new Error("Match not found");
  if (match.status !== "queued") throw new Error("Match not available");
  if (match.p1_id.toString() === userId.toString())
    throw new Error("Cannot accept your own challenge");
  if (match.p2_id && match.p2_id.toString() !== userId.toString())
    throw new Error("This challenge is not addressed to you");

  match.status = "in_progress";
  match.started_at = new Date();
  await match.save();
  return match;
};

exports.submitMatchAttempt = async ({ matchId, userId, submissionId }) => {
  const match = await ChallengeMatch.findById(matchId);
  if (!match) throw new Error("Match not found");
  if (!["queued", "in_progress"].includes(match.status))
    throw new Error("Match is not active");
  if (
    match.p1_id.toString() !== userId.toString() &&
    match.p2_id?.toString() !== userId.toString()
  )
    throw new Error("User not in this match");

  const sub = await QuizSubmission.findById(submissionId).lean();
  if (!sub) throw new Error("Submission not found");
  if (sub.user_id.toString() !== userId.toString())
    throw new Error("Not your submission");
  if (sub.quiz_id.toString() !== match.quiz_id.toString())
    throw new Error("Submission not for this quiz");
  if (sub.submitted_at < match.created_at)
    throw new Error("Submission was before the challenge was created");

  const { pct, timeMs } = toPctAndTimeMs(sub);

  const isP1 = match.p1_id.toString() === userId.toString();
  if (isP1) {
    if (match.p1_submission_id)
      throw new Error("Already submitted for this match");
    match.p1_submission_id = sub._id;
    match.p1_score_pct = pct;
    match.p1_time_ms = timeMs;
  } else {
    if (match.p2_submission_id)
      throw new Error("Already submitted for this match");
    match.p2_submission_id = sub._id;
    match.p2_score_pct = pct;
    match.p2_time_ms = timeMs;
  }

  if (match.status === "queued") match.status = "in_progress";
  if (!match.started_at) match.started_at = new Date();

  if (match.p1_submission_id && match.p2_submission_id) {
    await resolveChallenge(match);
  } else {
    await match.save();
  }

  return match;
};

// Auto-attach from quiz submit flow.
// Rule: replace side’s attached sub if the new one is newer than the currently attached.
async function tryAttachSubmissionToChallenges({ submission }) {
  const { user_id, quiz_id, submitted_at } = submission;

  const matches = await ChallengeMatch.find({
    quiz_id,
    status: { $in: ["queued", "in_progress"] },
    $or: [{ p1_id: user_id }, { p2_id: user_id }],
  }).sort({ created_at: -1 });

  const getSubmittedAt = async (subId) =>
    subId
      ? (await QuizSubmission.findById(subId, { submitted_at: 1 }).lean())
          ?.submitted_at || null
      : null;

  for (const m of matches) {
    const isP1 = m.p1_id?.toString() === user_id.toString();
    const isP2 = m.p2_id?.toString() === user_id.toString();
    if (!isP1 && !isP2) continue;

    const { pct, timeMs } = toPctAndTimeMs(submission);

    let shouldOverwrite = false;
    if (isP1) {
      if (!m.p1_submission_id) {
        shouldOverwrite = true;
      } else {
        const prevAt = await getSubmittedAt(m.p1_submission_id);
        if (!prevAt || prevAt < submitted_at) shouldOverwrite = true;
      }
      if (shouldOverwrite) {
        m.p1_submission_id = submission._id;
        m.p1_score_pct = pct;
        m.p1_time_ms = timeMs;
      }
    } else {
      if (!m.p2_submission_id) {
        shouldOverwrite = true;
      } else {
        const prevAt = await getSubmittedAt(m.p2_submission_id);
        if (!prevAt || prevAt < submitted_at) shouldOverwrite = true;
      }
      if (shouldOverwrite) {
        m.p2_submission_id = submission._id;
        m.p2_score_pct = pct;
        m.p2_time_ms = timeMs;
      }
    }

    if (shouldOverwrite) {
      if (m.status === "queued") m.status = "in_progress";
      if (!m.started_at) m.started_at = new Date();

      if (m.p1_submission_id && m.p2_submission_id) {
        await resolveChallenge(m);
      } else {
        await m.save();
      }
    }
  }
}

// Resolve challenge: winner by higher %, tie → faster time.
// Uses transactions if supported; otherwise, non-TX fallback.
async function resolveChallenge(match) {
  const canTx = await supportsTransactions();

  const computeOutcomeAndElos = async (m, session) => {
    const p1Pct = m.p1_score_pct ?? 0;
    const p2Pct = m.p2_score_pct ?? 0;
    const p1Time = m.p1_time_ms ?? 0;
    const p2Time = m.p2_time_ms ?? 0;

    let winner = null;
    let tiebreak = "none";
    if (p1Pct > p2Pct) winner = m.p1_id;
    else if (p2Pct > p1Pct) winner = m.p2_id;
    else {
      if (p1Time < p2Time) {
        winner = m.p1_id;
        tiebreak = "faster_time";
      } else if (p2Time < p1Time) {
        winner = m.p2_id;
        tiebreak = "faster_time";
      } else {
        winner = null;
      }
    }

    const [p1Stats, p2Stats] = await Promise.all([
      session
        ? UserQuizStats.findOne({ user_id: m.p1_id }).session(session)
        : UserQuizStats.findOne({ user_id: m.p1_id }),
      session
        ? UserQuizStats.findOne({ user_id: m.p2_id }).session(session)
        : UserQuizStats.findOne({ user_id: m.p2_id }),
    ]);

    const p1E = p1Stats?.elo ?? 1200;
    const p2E = p2Stats?.elo ?? 1200;

    const expectA = 1 / (1 + Math.pow(10, (p2E - p1E) / 400));
    const scoreA =
      winner === null ? 0.5 : winner.toString() === m.p1_id.toString() ? 1 : 0;
    const newA = Math.round(p1E + 24 * (scoreA - expectA));
    const newB = Math.round(p2E + 24 * (1 - scoreA - (1 - expectA)));

    const p1Won = !!winner && winner.toString() === m.p1_id.toString();
    const p2Won = !!winner && winner.toString() === m.p2_id.toString();
    const tied = winner === null;

    const bump = ({ eloAfter, won, tied }) => ({
      $set: { elo: eloAfter, last_played_at: new Date() },
      $inc: {
        wins: won ? 1 : 0,
        losses: !won && !tied ? 1 : 0,
        ties: tied ? 1 : 0,
        streak: tied ? 0 : won ? 1 : -1,
      },
    });

    // Update match
    m.p1_elo_before = p1E;
    m.p2_elo_before = p2E;
    m.p1_elo_after = newA;
    m.p2_elo_after = newB;
    m.winner = winner;
    m.tiebreak = tiebreak;
    m.status = "completed";
    m.completed_at = new Date();

    if (session) {
      await m.save({ session });
      await UserQuizStats.updateOne(
        { user_id: m.p1_id },
        bump({ eloAfter: newA, won: p1Won, tied }),
        {
          upsert: true,
          session,
        }
      );
      await UserQuizStats.updateOne(
        { user_id: m.p2_id },
        bump({ eloAfter: newB, won: p2Won, tied }),
        {
          upsert: true,
          session,
        }
      );
    } else {
      await m.save();
      await Promise.all([
        UserQuizStats.updateOne(
          { user_id: m.p1_id },
          bump({ eloAfter: newA, won: p1Won, tied }),
          {
            upsert: true,
          }
        ),
        UserQuizStats.updateOne(
          { user_id: m.p2_id },
          bump({ eloAfter: newB, won: p2Won, tied }),
          {
            upsert: true,
          }
        ),
      ]);
    }
  };

  if (!canTx) {
    const m = await ChallengeMatch.findById(match._id);
    if (!m || m.status === "completed") return m;
    await computeOutcomeAndElos(m, null);
  } else {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const m = await ChallengeMatch.findById(match._id).session(session);
        if (!m || m.status === "completed") return;
        await computeOutcomeAndElos(m, session);
      });
    } finally {
      session.endSession();
    }
  }

  // Post-resolution email (best-effort)
  const doc = await ChallengeMatch.findById(match._id)
    .populate("quiz_id", "title")
    .populate("p1_id", "full_name email")
    .populate("p2_id", "full_name email");
  if (!doc) return null;

  const title = doc.quiz_id?.title || "Quiz";
  const p1 = doc.p1_id;
  const p2 = doc.p2_id;

  const resultLine =
    doc.winner === null
      ? `It’s a draw on "${title}".`
      : `${
          doc.winner.toString() === p1._id.toString()
            ? p1.full_name
            : p2.full_name
        } won on "${title}".`;

  const bodyText = [
    resultLine,
    `P1: ${p1.full_name} – ${doc.p1_score_pct?.toFixed(2) ?? 0}% in ${
      (doc.p1_time_ms || 0) / 1000
    }s`,
    `P2: ${p2.full_name} – ${doc.p2_score_pct?.toFixed(2) ?? 0}% in ${
      (doc.p2_time_ms || 0) / 1000
    }s`,
    doc.tiebreak !== "none" ? `Tiebreak: ${doc.tiebreak}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = buildChallengeResultEmailHtml({
    logoUrl: "https://akeagjxcoxqqfjurotod.supabase.co/storage/v1/object/public/files/class/new/1766611984449-logo.png",
    appUrl: APP_URL,
    quizTitle: title,
    p1Name: p1.full_name,
    p2Name: p2.full_name,
    p1Score: doc.p1_score_pct?.toFixed(2) ?? 0,
    p2Score: doc.p2_score_pct?.toFixed(2) ?? 0,
    p1Time: (doc.p1_time_ms || 0) / 1000,
    p2Time: (doc.p2_time_ms || 0) / 1000,
    winnerName: doc.winner
      ? doc.winner.toString() === p1._id.toString()
        ? p1.full_name
        : p2.full_name
      : null,
    isDraw: doc.winner === null,
    tiebreak: doc.tiebreak,
  });

  await Promise.all([
    sendMail({
      to: p1.email,
      subject: `Challenge result – ${title}`,
      text: bodyText,
      html,
    }),
    sendMail({
      to: p2.email,
      subject: `Challenge result – ${title}`,
      text: bodyText,
      html,
    }),
  ]);

  return doc;
}

// =====================================================
// Generic Leaderboard (UserPerformance)
// =====================================================
function buildPerfFilter({
  scope_type,
  scope_id,
  subject,
  window,
  window_key,
  when,
}) {
  const filter = { scope_type, window };
  if (scope_type === "subject") filter.subject = subject;
  if ((scope_type === "class" || scope_type === "quiz") && scope_id) {
    filter.scope_id = new mongoose.Types.ObjectId(scope_id);
  }
  if (!window_key) {
    const wk =
      window === "weekly"
        ? weekKey(when || new Date())
        : window === "monthly"
        ? monthKey(when || new Date())
        : "all";
    filter.window_key = typeof wk === "string" ? wk : wk?.windowKey || "all";
  } else {
    filter.window_key = window_key;
  }
  if (window === "lifetime") filter.window_key = "all";
  return filter;
}

exports.getLeaderboard = async ({
  scope_type,
  scope_id,
  subject,
  window,
  window_key,
  metric,
  limit = 100,
}) => {
  const allowed = ["average_score", "efficiency", "elo"];
  const sortKey = allowed.includes(metric) ? metric : "average_score";
  const filter = buildPerfFilter({
    scope_type,
    scope_id,
    subject,
    window,
    window_key,
  });

  const rows = await UserPerformance.find(filter)
    .sort({ [sortKey]: -1, attempts: -1 })
    .limit(limit)
    .populate("user_id", "full_name avatar");

  return {
    params: {
      scope_type,
      scope_id,
      subject,
      window,
      window_key: filter.window_key,
      metric,
    },
    count: rows.length,
    results: rows.map((r) => ({
      userId: r.user_id?._id,
      name: r.user_id?.full_name,
      avatar: r.user_id?.avatar,
      attempts: r.attempts,
      averageScore: r.average_score,
      efficiency: r.efficiency,
      consistency: r.consistency,
      elo: r.elo,
      lastAttemptAt: r.last_attempt_at,
    })),
  };
};

exports.getMyLeaderboardPosition = async ({ userId, ...rest }) => {
  const filter = buildPerfFilter(rest);
  const metric = ["average_score", "efficiency", "elo"].includes(rest.metric)
    ? rest.metric
    : "average_score";

  const me = await UserPerformance.findOne({ user_id: userId, ...filter });
  if (!me) return { position: null, me: null };

  const betterCount = await UserPerformance.countDocuments({
    ...filter,
    [metric]: { $gt: me[metric] },
  });

  return {
    position: betterCount + 1,
    me: {
      userId,
      attempts: me.attempts,
      averageScore: me.average_score,
      efficiency: me.efficiency,
      consistency: me.consistency,
      elo: me.elo,
    },
  };
};

async function getMyClassIds(meId) {
  const rows = await Class.find(
    {
      $or: [
        { students: meId },
        { student_ids: meId },
        { "members.user_id": meId },
        { enrolled_students: meId },
      ],
    },
    { _id: 1 }
  ).lean();
  return rows.map((r) => r._id);
}

/**
 * getFriendList
 * Priority score = same grade (x3) + same class (x2) + capped recent duels + recency bonus
 * Inputs: { userId, limit = 20, recentDays = 30 }
 */
exports.getFriendList = async ({ userId, limit = 20, recentDays = 30 }) => {
  // harden params
  limit = Number.isFinite(+limit) ? +limit : 20;
  recentDays = Number.isFinite(+recentDays) ? +recentDays : 30;

  const meId = new ObjectId(userId);

  // My profile (grade/school)
  const meProfile = await StudentProfile.findOne(
    { user_id: meId },
    { grade: 1, school: 1 }
  ).lean();
  const myGrade = meProfile?.grade ?? null;

  // My classes (tolerant shapes)
  const myClassIds = await getMyClassIds(meId);

  // Lookback window for recent duels
  const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);

  const pipeline = [
    { $match: { role: "student", _id: { $ne: meId } } },

    // Profile join
    {
      $lookup: {
        from: "studentprofiles",
        localField: "_id",
        foreignField: "user_id",
        as: "profile",
      },
    },
    { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

    // Common classes with me (supports multiple class schemas)
    {
      $lookup: {
        from: "classes",
        let: {
          candidate: "$_id",
          my: Array.isArray(myClassIds) ? myClassIds : [],
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$_id", { $ifNull: ["$$my", []] }] },
                  {
                    $or: [
                      { $in: ["$$candidate", { $ifNull: ["$students", []] }] },
                      {
                        $in: ["$$candidate", { $ifNull: ["$student_ids", []] }],
                      },
                      {
                        $in: [
                          "$$candidate",
                          { $ifNull: ["$members.user_id", []] },
                        ],
                      },
                      {
                        $in: [
                          "$$candidate",
                          { $ifNull: ["$enrolled_students", []] },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
          { $project: { _id: 1 } },
        ],
        as: "commonClasses",
      },
    },

    // Duels with me within lookback
    {
      $lookup: {
        from: "challengematches",
        let: { candidate: "$_id", me: meId, since },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$status", "completed"] },
                  { $gte: ["$completed_at", "$$since"] },
                  {
                    $or: [
                      {
                        $and: [
                          { $eq: ["$p1_id", "$$me"] },
                          { $eq: ["$p2_id", "$$candidate"] },
                        ],
                      },
                      {
                        $and: [
                          { $eq: ["$p2_id", "$$me"] },
                          { $eq: ["$p1_id", "$$candidate"] },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
          { $project: { completed_at: 1 } },
          {
            $group: {
              _id: null,
              duels: { $sum: 1 },
              lastPlayed: { $max: "$completed_at" },
            },
          },
        ],
        as: "duelAgg",
      },
    },

    // Features
    {
      $addFields: {
        duels: { $ifNull: [{ $arrayElemAt: ["$duelAgg.duels", 0] }, 0] },
        lastPlayed: { $arrayElemAt: ["$duelAgg.lastPlayed", 0] },
        sameClass: { $gt: [{ $size: { $ifNull: ["$commonClasses", []] } }, 0] },
        gradeMatch: myGrade
          ? { $cond: [{ $eq: ["$profile.grade", myGrade] }, 1, 0] }
          : 0,
      },
    },
    {
      $addFields: {
        duelsCapped: { $min: ["$duels", 5] },
        recencyBonus: {
          $switch: {
            branches: [
              {
                case: {
                  $gte: ["$lastPlayed", new Date(Date.now() - 7 * 86400000)],
                },
                then: 1.0,
              },
              {
                case: {
                  $gte: ["$lastPlayed", new Date(Date.now() - 30 * 86400000)],
                },
                then: 0.5,
              },
            ],
            default: 0,
          },
        },
      },
    },
    {
      $addFields: {
        score: {
          $add: [
            { $multiply: ["$gradeMatch", 3] },
            { $multiply: [{ $cond: ["$sameClass", 1, 0] }, 2] },
            "$duelsCapped",
            "$recencyBonus",
          ],
        },
      },
    },

    // Shape
    {
      $project: {
        _id: 1,
        full_name: 1,
        email: 1,
        profile: {
          grade: "$profile.grade",
          school: "$profile.school",
          profile_picture: "$profile.profile_picture",
        },
        metrics: {
          score: "$score",
          gradeMatch: "$gradeMatch",
          sameClass: "$sameClass",
          duels: "$duels",
          lastPlayed: "$lastPlayed",
        },
      },
    },

    {
      $sort: {
        "metrics.score": -1,
        "metrics.duels": -1,
        "metrics.lastPlayed": -1,
        full_name: 1,
      },
    },
    { $limit: Number(limit) },
  ];

  return await User.aggregate(pipeline);
};

// Explicit export so existing imports still work
exports.applySubmissionToPerf = applySubmissionToPerf;
