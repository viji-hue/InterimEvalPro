import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, BorderStyle, WidthType, AlignmentType, TextRun, HeadingLevel, UnderlineType, VerticalAlign } from "docx";
import archiver from "archiver";
import XLSX from "xlsx";
import { Readable } from "stream";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pickSessionQuestions, getFullQuestion } from "./questions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Initialize Google Generative AI ────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Middleware ────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

// ─── In-memory store (replace with DB in production) ──────────────
// Stores: sessions, approvals, proctor logs
const db = {
  sessions: [],       // completed trainee sessions
  approvals: {},      // sessionId → true/false
  activeSessions: {}, // token → { questions with keys, traineeInfo }
};

// ─── Auth middleware ───────────────────────────────────────────────
function requireTrainer(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (payload.role !== "trainer") return res.status(403).json({ error: "Forbidden" });
    req.trainer = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC ROUTES (trainee-facing, no credentials exposed)
// ─────────────────────────────────────────────────────────────────

// GET /api/session/questions — start a session, get questions (no answers)
app.post("/api/session/start", (req, res) => {
  const { trainee, cohort } = req.body;
  if (!trainee || !cohort) return res.status(400).json({ error: "Trainee name and cohort required" });

  // Check if trainee needs approval (has a prior session not yet approved)
  const priorSessions = db.sessions.filter(s => s.trainee.toLowerCase() === trainee.toLowerCase());
  if (priorSessions.length > 0) {
    const last = priorSessions[priorSessions.length - 1];
    if (!db.approvals[last.id]) {
      return res.status(403).json({
        error: "approval_required",
        message: "Your previous session is pending trainer approval.",
        sessionId: last.id,
        waitId: trainee.toUpperCase().replace(/\s+/g, "-") + "-" + String(last.id).slice(-4)
      });
    }
  }

  // Pick questions — model answers stay on server
  const fullQuestions = pickSessionQuestions();
  const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Store full questions (with keys) server-side
  db.activeSessions[sessionToken] = {
    trainee,
    cohort,
    fullQuestions, // includes model answers — never sent to client
    startedAt: new Date().toISOString(),
    proctorLog: [],
  };

  // Send ONLY question text + metadata to client
  const clientQuestions = fullQuestions.map(({ id, topic, difficulty, q }) => ({ id, topic, difficulty, q }));

  res.json({ sessionToken, questions: clientQuestions });
});

// POST /api/session/answer — evaluate one answer (AI runs server-side)
app.post("/api/session/answer", async (req, res) => {
  const { sessionToken, questionId, answer } = req.body;
  if (!sessionToken || !questionId || !answer) return res.status(400).json({ error: "Missing fields" });

  const session = db.activeSessions[sessionToken];
  if (!session) return res.status(404).json({ error: "Session not found or expired" });

  // Get full question with model answer — server-side only
  const fullQ = session.fullQuestions.find(q => q.id === questionId);
  if (!fullQ) return res.status(404).json({ error: "Question not found" });

  const modelAnswer = getFullQuestion(questionId)?.key || fullQ.key || "";
  const evalHints = getFullQuestion(questionId)?.evalHints || [];

  let score = 0, scoreLabel = "Irrelevant", feedback = "";

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: `You are a strict senior QA lead evaluating a trainee's interim assessment answer across Java, testing, SQL, Selenium, Spring Boot, REST APIs, Data JPA, and Angular.

SCORING RUBRIC (only use these exact scores):
- 10: Complete, accurate AND includes real-world example (code, project context, framework usage)
- 7: Mostly correct, covers main points, basic/generic example or clear explanation without example  
- 5: Surface-level — knows the term/concept but only definition, NO practical application shown
- 2: Vague, confused, mostly wrong, or fundamental misunderstanding
- 0: Irrelevant, off-topic, no technical substance

KEY EVALUATION HINTS for this question: ${evalHints.join(", ")}

RULES:
1. Score 10 ONLY if answer is correct AND has a real-world example
2. Score MAX 5 if answer is just a textbook definition with no application
3. Score 0 if answer doesn't address the question at all
4. Feedback must say exactly WHY the score was given

Respond ONLY with valid JSON, no markdown:
{"score":<0|2|5|7|10>,"scoreLabel":"<Full marks|Good answer|Surface answer|Mostly wrong|Irrelevant>","feedback":"<3-4 sentences: what was correct, what example was given or missing, what to study>"}`
    });

    const result = await model.generateContent(`QUESTION: ${fullQ.q}\n\nMODEL ANSWER: ${modelAnswer}\n\nTRAINEE ANSWER: ${answer}`);
    const text = result.response.text();
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    score = typeof parsed.score === "number" ? parsed.score : 0;
    scoreLabel = parsed.scoreLabel || "Irrelevant";
    feedback = parsed.feedback || "Evaluation could not be generated.";

  } catch (err) {
    console.error("AI eval error:", err.message);
    // Fallback: keyword-based local scoring
    const ansLower = answer.toLowerCase();
    const matched = evalHints.filter(h => ansLower.includes(h.toLowerCase())).length;
    const hasExample = /example|e\.g\.|for instance|in my project|in our framework|code snippet|class |method |new |\.java|@Test|@Before/i.test(answer);
    const ratio = matched / Math.max(evalHints.length, 1);
    if (ratio < 0.1) { score = 0; scoreLabel = "Irrelevant"; feedback = "Answer does not address the question. Review this topic thoroughly."; }
    else if (ratio < 0.3) { score = 2; scoreLabel = "Mostly wrong"; feedback = "Very limited understanding shown. Key concepts missing. Study this topic before next session."; }
    else if (hasExample && ratio >= 0.5) { score = 10; scoreLabel = "Full marks"; feedback = "Strong answer with practical context. (AI scoring unavailable — estimated locally)"; }
    else if (ratio >= 0.4) { score = 7; scoreLabel = "Good answer"; feedback = "Good coverage of main points. (AI scoring unavailable — estimated locally)"; }
    else { score = 5; scoreLabel = "Surface answer"; feedback = "Surface-level answer. Add real-world examples and practical context next time. (AI scoring unavailable)"; }
  }

  res.json({ score, scoreLabel, feedback });
});

// POST /api/session/proctor — log a proctoring event
app.post("/api/session/proctor", (req, res) => {
  const { sessionToken, event } = req.body;
  const session = db.activeSessions[sessionToken];
  if (!session) return res.status(404).json({ error: "Session not found" });
  session.proctorLog.push({ ...event, serverTime: new Date().toISOString() });
  res.json({ ok: true });
});

// POST /api/session/finish — save completed session
app.post("/api/session/finish", (req, res) => {
  const { sessionToken, results } = req.body;
  const session = db.activeSessions[sessionToken];
  if (!session) return res.status(404).json({ error: "Session not found" });

  // Enrich results with model answers for trainer view
  const enrichedResults = results.map(r => {
    const fullQuestion = getFullQuestion(r.questionId);
    return {
      ...r,
      modelAnswer: fullQuestion?.key || "Model answer not available",
      detailedAnswer: fullQuestion?.detailedAnswer || null
    };
  });

  const total = enrichedResults.reduce((s, r) => s + (r.score || 0), 0);
  const pct = Math.round((total / 50) * 100);
  const log = session.proctorLog || [];
  const tabSwitches = log.filter(e => e.type === "TAB_HIDDEN" || e.type === "WINDOW_BLUR").length;
  const pastes = log.filter(e => e.type === "PASTE" || e.type === "PASTE_SHORTCUT").length;
  const copies = log.filter(e => e.type === "COPY").length;
  const suspicionScore = Math.min(100, tabSwitches * 20 + pastes * 25 + copies * 10);
  const suspicionLevel = suspicionScore >= 60 ? "High" : suspicionScore >= 30 ? "Medium" : suspicionScore === 0 ? "Clean" : "Low";

  const record = {
    id: Date.now(),
    trainee: session.trainee,
    cohort: session.cohort,
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    score: total,
    pct,
    results: enrichedResults,
    proctorLog: log,
    suspicionScore,
    suspicionLevel,
    tabSwitches,
    pastes,
    copies,
  };

  db.sessions.push(record);
  delete db.activeSessions[sessionToken]; // clean up
  res.json({ ok: true, sessionId: record.id, pct, suspicionLevel });
});

// GET /api/approval/check — trainee checks if they are approved
app.get("/api/approval/check", (req, res) => {
  const { trainee } = req.query;
  if (!trainee) return res.status(400).json({ error: "Trainee name required" });
  const sessions = db.sessions.filter(s => s.trainee.toLowerCase() === trainee.toLowerCase());
  if (!sessions.length) return res.json({ status: "no_sessions" });
  const last = sessions[sessions.length - 1];
  const approved = db.approvals[last.id];
  res.json({ status: approved === true ? "approved" : approved === "denied" ? "denied" : "pending", sessionId: last.id });
});

// ─────────────────────────────────────────────────────────────────
// TRAINER ROUTES (protected — credentials verified server-side)
// ─────────────────────────────────────────────────────────────────

// POST /api/trainer/login — verify credentials, return JWT
app.post("/api/trainer/login", async (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: "Name and code required" });

  // Compare against env vars — never exposed to client
  const validName = name.trim() === process.env.TRAINER_NAME;
  const validCode = code.trim() === process.env.TRAINER_CODE;

  if (!validName || !validCode) {
    return res.status(401).json({ error: "cannot_access", message: "Cannot access the trainer dashboard. Check your credentials." });
  }

  const token = jwt.sign({ role: "trainer", name: name.trim() }, process.env.JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, name: name.trim() });
});

// GET /api/trainer/sessions — all sessions with full details
app.get("/api/trainer/sessions", requireTrainer, (req, res) => {
  res.json({ sessions: db.sessions });
});

// GET /api/trainer/approvals/pending — get pending approvals
app.get("/api/trainer/approvals/pending", requireTrainer, (req, res) => {
  const byT = {};
  db.sessions.forEach(s => { if (!byT[s.trainee] || s.id > byT[s.trainee].id) byT[s.trainee] = s; });
  const pending = Object.values(byT).filter(s => !db.approvals[s.id]);
  res.json({ pending });
});

// POST /api/trainer/approvals/:id — approve or deny
app.post("/api/trainer/approvals/:id", requireTrainer, (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // "approve" | "deny"
  if (!["approve", "deny"].includes(action)) return res.status(400).json({ error: "Invalid action" });
  db.approvals[Number(id)] = action === "approve" ? true : "denied";
  res.json({ ok: true });
});

// DELETE /api/trainer/trainee/:name — delete all sessions for a trainee
app.delete("/api/trainer/trainee/:name", requireTrainer, (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const before = db.sessions.length;
  db.sessions = db.sessions.filter(s => s.trainee.toLowerCase() !== name.toLowerCase());
  res.json({ ok: true, deleted: before - db.sessions.length });
});

// Helper function to generate consolidated report with all trainees
async function generateConsolidatedReportDoc(db) {
  if (!db.sessions.length) return null;

  const allTrainees = [...new Set(db.sessions.map(s => s.trainee))];
  const sections = [];

  // Header
  sections.push(new Paragraph({
    children: [new TextRun({ text: "COMPREHENSIVE TRAINEE EVALUATION REPORT", bold: true, size: 32 })],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
  }));

  sections.push(new Paragraph({
    children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}`, size: 20, color: "666666" })],
    alignment: AlignmentType.CENTER,
  }));

  sections.push(new Paragraph({ text: "" }));

  // Overall Summary
  sections.push(new Paragraph({
    children: [new TextRun({ text: "OVERALL SUMMARY", bold: true, size: 28 })],
    heading: HeadingLevel.HEADING_1,
  }));

  sections.push(new Paragraph({ children: [new TextRun("")] }));

  const totalSessions = db.sessions.length;
  const overallAvg = Math.round(db.sessions.reduce((s, r) => s + r.pct, 0) / totalSessions);
  const passCount = db.sessions.filter(s => s.pct >= 60).length;
  const excellentCount = db.sessions.filter(s => s.pct >= 80).length;

  const summaryTable = new Table({
    rows: [
      new TableRow({
        cells: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Total Trainees", bold: true })] })],
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(allTrainees.length) })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Total Sessions", bold: true })] })],
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(totalSessions) })] })],
          }),
        ],
      }),
      new TableRow({
        cells: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Overall Avg Score", bold: true })] })],
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${overallAvg}%` })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Pass Rate (≥60%)", bold: true })] })],
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${Math.round(passCount / totalSessions * 100)}%` })] })],
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  sections.push(summaryTable);
  sections.push(new Paragraph({ children: [new TextRun("")] }));
  sections.push(new Paragraph({ children: [new TextRun("")] }));

  // Individual Trainee Sections
  sections.push(new Paragraph({
    children: [new TextRun({ text: "INDIVIDUAL TRAINEE REPORTS", bold: true, size: 28 })],
    heading: HeadingLevel.HEADING_1,
  }));

  sections.push(new Paragraph({ children: [new TextRun("")] }));

  for (const trainee of allTrainees) {
    const traineeSessions = db.sessions.filter(s => s.trainee.toLowerCase() === trainee.toLowerCase());
    const latest = traineeSessions[traineeSessions.length - 1];
    const avgScore = Math.round(traineeSessions.reduce((s, r) => s + r.pct, 0) / traineeSessions.length);
    const grade = avgScore >= 80 ? "Excellent" : avgScore >= 60 ? "Good" : avgScore >= 40 ? "Needs improvement" : "Re-assessment";

    // Trainee Header
    sections.push(new Paragraph({
      children: [new TextRun({ text: `${trainee} — ${traineeSessions.length} session(s)`, bold: true, size: 26 })],
      heading: HeadingLevel.HEADING_2,
    }));

    // Trainee Summary Table
    const traineeTable = new Table({
      rows: [
        new TableRow({
          cells: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Cohort", bold: true })] })],
              shading: { fill: "E8E8E8" },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: latest.cohort || "N/A" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Avg Score", bold: true })] })],
              shading: { fill: "E8E8E8" },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${avgScore}%`, bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true })] })],
              shading: { fill: "E8E8E8" },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: grade })] })],
            }),
          ],
        }),
        new TableRow({
          cells: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Latest Score", bold: true })] })],
              shading: { fill: "E8E8E8" },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${latest.pct}%` })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Approval", bold: true })] })],
              shading: { fill: "E8E8E8" },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: db.approvals[latest.id] === true ? "✓ APPROVED" : db.approvals[latest.id] === "denied" ? "✗ DENIED" : "⏳ PENDING" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true })] })],
              shading: { fill: "E8E8E8" },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: latest.date || "N/A" })] })],
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    sections.push(traineeTable);
    sections.push(new Paragraph({ children: [new TextRun("")] }));

    // Latest Session Details
    sections.push(new Paragraph({
      children: [new TextRun({ text: `Latest Session (${latest.date})`, bold: true, size: 22 })],
      heading: HeadingLevel.HEADING_3,
    }));

    sections.push(new Paragraph({ children: [new TextRun("")] }));

    // Results for latest session
    latest.results.forEach((result, idx) => {
      sections.push(new Paragraph({
        children: [new TextRun({ text: `Q${idx + 1} · ${result.topic}`, bold: true, size: 20 })],
      }));

      const scoreColor = result.score >= 7 ? "228B22" : result.score >= 5 ? "FF8C00" : "DC143C";
      sections.push(new Paragraph({
        children: [new TextRun({ text: `Score: ${result.score}/10 — ${result.scoreLabel}`, bold: true, color: scoreColor })],
      }));

      sections.push(new Paragraph({
        children: [new TextRun({ text: `Q: ${result.question}`, size: 18 })],
      }));

      sections.push(new Paragraph({
        children: [new TextRun({ text: `A: ${result.answer || "[No answer provided]"}`, size: 18 })],
      }));

      sections.push(new Paragraph({
        children: [new TextRun({ text: `Feedback: ${result.feedback}`, size: 18, italic: true })],
      }));

      sections.push(new Paragraph({ children: [new TextRun("")] }));
    });

    sections.push(new Paragraph({ children: [new TextRun("")] }));
    sections.push(new Paragraph({ children: [new TextRun("─".repeat(80))] }));
    sections.push(new Paragraph({ children: [new TextRun("")] }));
    sections.push(new Paragraph({ children: [new TextRun("")] }));
  }

  const doc = new Document({ sections: [{ children: sections }] });
  return await Packer.toBuffer(doc);
}

// Helper function to generate trainee report document
async function generateTraineeReportDoc(name, traineeSessions, db) {
  if (!traineeSessions.length) return null;

  const latest = traineeSessions[traineeSessions.length - 1];
  const avgScore = Math.round(traineeSessions.reduce((s, r) => s + r.pct, 0) / traineeSessions.length);
  const grade = avgScore >= 80 ? "Excellent" : avgScore >= 60 ? "Good" : avgScore >= 40 ? "Needs improvement" : "Re-assessment";

  const sections = [];

  // Header
  sections.push(new Paragraph({
    children: [new TextRun({ text: "TRAINEE EVALUATION REPORT", bold: true, size: 32 })],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
  }));

  sections.push(new Paragraph({
    children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}`, size: 20, color: "666666" })],
    alignment: AlignmentType.CENTER,
  }));

  sections.push(new Paragraph({ text: "" }));

  // Metrics Grid (Summary)
  sections.push(new Paragraph({
    children: [new TextRun({ text: "SUMMARY", bold: true })],
    heading: HeadingLevel.HEADING_2,
  }));

  const metricsTable = new Table({
    rows: [
      new TableRow({
        cells: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Name", bold: true, size: 20 })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: name, size: 20 })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Cohort", bold: true, size: 20 })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: latest.cohort || "N/A", size: 20 })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      new TableRow({
        cells: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Sessions", bold: true, size: 20 })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(traineeSessions.length), size: 20 })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Avg Score", bold: true, size: 20 })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${avgScore}%`, bold: true, size: 20 })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      new TableRow({
        cells: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Status", bold: true, size: 20 })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: grade, size: 20 })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Approval", bold: true, size: 20 })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: db.approvals[latest.id] === true ? "✓ APPROVED" : db.approvals[latest.id] === "denied" ? "✗ DENIED" : "⏳ PENDING", size: 20 })] })],
            width: { size: 25, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  sections.push(metricsTable);
  sections.push(new Paragraph({ children: [new TextRun("")] }));

  // Integrity & Proctoring
  sections.push(new Paragraph({
    children: [new TextRun({ text: "INTEGRITY & PROCTORING ANALYSIS", bold: true })],
    heading: HeadingLevel.HEADING_2,
  }));

  const integrityTable = new Table({
    rows: [
      new TableRow({
        cells: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true })] })],
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Value", bold: true })] })],
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: "E8E8E8" },
          }),
        ],
      }),
      new TableRow({
        cells: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Latest Session Status" })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: latest.suspicionLevel || "Clean" })] })] }),
        ],
      }),
      new TableRow({
        cells: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tab Switches" })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(latest.tabSwitches || 0) })] })] }),
        ],
      }),
      new TableRow({
        cells: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Paste Events" })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(latest.pastes || 0) })] })] }),
        ],
      }),
      new TableRow({
        cells: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Copy Events" })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(latest.copies || 0) })] })] }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  sections.push(integrityTable);
  sections.push(new Paragraph({ children: [new TextRun("")] }));

  // Latest Session
  sections.push(new Paragraph({
    children: [new TextRun({ text: `LATEST SESSION — ${latest.date}`, bold: true })],
    heading: HeadingLevel.HEADING_2,
  }));

  sections.push(new Paragraph({
    children: [new TextRun({ text: `Session Score: ${latest.pct}% (${latest.score}/50)`, bold: true, size: 22 })],
  }));

  sections.push(new Paragraph({ children: [new TextRun("")] }));

  // Results
  latest.results.forEach((result, idx) => {
    sections.push(new Paragraph({
      children: [new TextRun({ text: `Q${idx + 1} · ${result.topic}`, bold: true, size: 24 })],
      heading: HeadingLevel.HEADING_3,
    }));

    const scoreColor = result.score >= 7 ? "228B22" : result.score >= 5 ? "FF8C00" : "DC143C";
    sections.push(new Paragraph({
      children: [new TextRun({ text: `Score: ${result.score}/10 — ${result.scoreLabel}`, bold: true, color: scoreColor })],
    }));

    sections.push(new Paragraph({ children: [new TextRun("")] }));

    // Question
    sections.push(new Paragraph({
      children: [new TextRun({ text: "Question:", bold: true, size: 22 })],
    }));
    sections.push(new Paragraph({
      children: [new TextRun({ text: result.question, size: 20 })],
    }));
    sections.push(new Paragraph({ children: [new TextRun("")] }));

    // Trainee Answer
    sections.push(new Paragraph({
      children: [new TextRun({ text: "Trainee Answer:", bold: true, size: 22, color: "333333" })],
    }));
    sections.push(new Paragraph({
      children: [new TextRun({ text: result.answer || "[No answer provided]", size: 20 })],
    }));
    sections.push(new Paragraph({ children: [new TextRun("")] }));

    // Model Answer
    if (result.modelAnswer && result.modelAnswer !== "Model answer not available") {
      sections.push(new Paragraph({
        children: [new TextRun({ text: "✓ Model Answer:", bold: true, size: 22, color: "228B22" })],
      }));
      sections.push(new Paragraph({
        children: [new TextRun({ text: result.modelAnswer, size: 20 })],
      }));
      sections.push(new Paragraph({ children: [new TextRun("")] }));
    }

    // Detailed Explanation
    if (result.detailedAnswer) {
      sections.push(new Paragraph({
        children: [new TextRun({ text: "📖 Detailed Explanation & Real-World Scenario:", bold: true, size: 22, color: "1E5A96" })],
      }));
      sections.push(new Paragraph({
        children: [new TextRun({ text: result.detailedAnswer, size: 20 })],
      }));
      sections.push(new Paragraph({ children: [new TextRun("")] }));
    }

    // Feedback
    sections.push(new Paragraph({
      children: [new TextRun({ text: "Evaluator Feedback:", bold: true, size: 22 })],
    }));
    sections.push(new Paragraph({
      children: [new TextRun({ text: result.feedback, size: 20 })],
    }));
    sections.push(new Paragraph({ children: [new TextRun("")] }));
    sections.push(new Paragraph({ children: [new TextRun("")] }));
  });

  const doc = new Document({ sections: [{ children: sections }] });
  return await Packer.toBuffer(doc);
}

// Helper function to generate trainee dashboard document (all sessions)
async function generateTraineeDashboardDoc(name, traineeSessions, db) {
  if (!traineeSessions.length) return null;

  const avgScore = Math.round(traineeSessions.reduce((s, r) => s + r.pct, 0) / traineeSessions.length);
  const grade = avgScore >= 80 ? "Excellent" : avgScore >= 60 ? "Good" : avgScore >= 40 ? "Needs improvement" : "Re-assessment";
  const latest = traineeSessions[traineeSessions.length - 1];

  const sections = [];

  // Header
  sections.push(new Paragraph({
    children: [new TextRun({ text: "TRAINEE DASHBOARD REPORT", bold: true, size: 32 })],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
  }));

  sections.push(new Paragraph({
    children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}`, size: 20, color: "666666" })],
    alignment: AlignmentType.CENTER,
  }));

  sections.push(new Paragraph({ text: "" }));

  // Summary metrics
  sections.push(new Paragraph({
    children: [new TextRun({ text: "SUMMARY", bold: true })],
    heading: HeadingLevel.HEADING_2,
  }));

  const summaryTable = new Table({
    rows: [
      new TableRow({
        cells: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Name", bold: true })] })],
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: name })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Cohort", bold: true })] })],
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: latest.cohort || "N/A" })] })],
          }),
        ],
      }),
      new TableRow({
        cells: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Sessions", bold: true })] })],
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(traineeSessions.length) })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Avg Score", bold: true })] })],
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `${avgScore}%`, bold: true })] })],
          }),
        ],
      }),
      new TableRow({
        cells: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Grade", bold: true })] })],
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: grade })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Approval", bold: true })] })],
            shading: { fill: "E8E8E8" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: db.approvals[latest.id] === true ? "✓ APPROVED" : db.approvals[latest.id] === "denied" ? "✗ DENIED" : "⏳ PENDING" })] })],
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  sections.push(summaryTable);
  sections.push(new Paragraph({ children: [new TextRun("")] }));
  sections.push(new Paragraph({ children: [new TextRun("")] }));

  // All sessions breakdown
  sections.push(new Paragraph({
    children: [new TextRun({ text: "ALL SESSIONS", bold: true })],
    heading: HeadingLevel.HEADING_2,
  }));

  traineeSessions.forEach((session, sessionIdx) => {
    sections.push(new Paragraph({
      children: [new TextRun({ text: `Session ${sessionIdx + 1} — ${session.date}`, bold: true })],
      heading: HeadingLevel.HEADING_3,
    }));

    sections.push(new Paragraph({
      children: [new TextRun({ text: `Score: ${session.pct}% (${session.score}/50)` })],
    }));

    // Session results
    session.results.forEach((result, idx) => {
      sections.push(new Paragraph({
        children: [new TextRun({ text: `Q${idx + 1}. ${result.topic} — ${result.scoreLabel} (${result.score}/10)`, bold: true, size: 22 })],
      }));

      sections.push(new Paragraph({
        children: [new TextRun({ text: `Question: ${result.question}` })],
      }));

      sections.push(new Paragraph({
        children: [new TextRun({ text: `Trainee Answer: ${result.answer || "[Skipped]"}` })],
      }));

      if (result.feedback) {
        sections.push(new Paragraph({
          children: [new TextRun({ text: `Feedback: ${result.feedback}` })],
        }));
      }

      sections.push(new Paragraph({ children: [new TextRun("")] }));
    });

    sections.push(new Paragraph({
      children: [new TextRun({ text: `Integrity: ${session.suspicionLevel || "Clean"}  |  Tab Switches: ${session.tabSwitches || 0}  |  Pastes: ${session.pastes || 0}` })],
    }));
    sections.push(new Paragraph({ children: [new TextRun("")] }));
    sections.push(new Paragraph({ children: [new TextRun("")] }));
  });

  const doc = new Document({ sections: [{ children: sections }] });
  return await Packer.toBuffer(doc);
}

function styleHeaderRow(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const address = XLSX.utils.encode_cell({ c: col, r: 0 });
    if (!worksheet[address]) continue;
    worksheet[address].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1F4E79" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "FFFFFF" } },
        bottom: { style: "thin", color: { rgb: "FFFFFF" } },
        left: { style: "thin", color: { rgb: "FFFFFF" } },
        right: { style: "thin", color: { rgb: "FFFFFF" } },
      },
    };
  }
}

function styleDataRows(worksheet) {
  if (!worksheet || !worksheet["!ref"]) return;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const headerMap = {};
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const headerAddress = XLSX.utils.encode_cell({ c: col, r: range.s.r });
    if (worksheet[headerAddress]) headerMap[col] = String(worksheet[headerAddress].v || "");
  }

  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    const isStriped = (row % 2) === 0;
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const address = XLSX.utils.encode_cell({ c: col, r: row });
      const cell = worksheet[address];
      if (!cell) continue;

      const isTextColumn = ["Question", "Trainee Answer", "Model Answer"].includes(headerMap[col]);
      const alignment = {
        horizontal: "left",
        vertical: "top",
        wrapText: true,
      };

      const fill = isStriped ? { fgColor: { rgb: "DCE6F1" } } : undefined;
      cell.s = {
        ...(cell.s || {}),
        alignment,
        ...(fill ? { fill } : {}),
      };

      if (isTextColumn) {
        cell.s.alignment.wrapText = true;
      }
    }
  }
}

function formatWorksheet(worksheet) {
  worksheet["!cols"] = [
    { wch: 20 }, // Trainee Name
    { wch: 16 }, // Session Date
    { wch: 22 }, // Session ID
    { wch: 6 },  // Q No
    { wch: 80 }, // Question
    { wch: 100 },// Trainee Answer
    { wch: 100 },// Model Answer
    { wch: 8 },  // Score
    { wch: 12 }, // Score Label
    { wch: 18 }, // Integrity
    { wch: 12 }, // Tab Switches
    { wch: 10 }, // Pastes
    { wch: 10 }, // Copies
  ];
  worksheet["!autofilter"] = { ref: "A1:M1" };
  styleHeaderRow(worksheet);
  styleDataRows(worksheet);
}

async function generateTraineeExcelReport(name, traineeSessions) {
  if (!traineeSessions.length) return null;

  const rows = [
    { "Trainee Name": `Trainee: ${name}`, "Session Date": `Sessions: ${traineeSessions.length}` },
    {},
  ];

  traineeSessions.forEach((session) => {
    rows.push({
      "Trainee Name": "Session Summary",
      "Session Date": session.date,
      "Session ID": session.id,
      "Q No": "",
      "Question": `Integrity: ${session.suspicionLevel || "Clean"}`,
      "Trainee Answer": `Tab switches: ${session.tabSwitches || 0}`,
      "Model Answer": `Pastes: ${session.pastes || 0}`,
      "Score": `Copies: ${session.copies || 0}`,
    });

    session.results.forEach((result, idx) => {
      rows.push({
        "Trainee Name": name,
        "Session Date": session.date,
        "Session ID": session.id,
        "Q No": idx + 1,
        "Question": result.question,
        "Trainee Answer": result.answer || "[Skipped]",
        "Model Answer": result.modelAnswer || "Model answer not available",
        "Score": result.score,
        "Score Label": result.scoreLabel,
        "Integrity": session.suspicionLevel || "Clean",
        "Tab Switches": session.tabSwitches || 0,
        "Pastes": session.pastes || 0,
        "Copies": session.copies || 0,
      });
    });

    rows.push({});
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ["Trainee Name", "Session Date", "Session ID", "Q No", "Question", "Trainee Answer", "Model Answer", "Score", "Score Label", "Integrity", "Tab Switches", "Pastes", "Copies"],
    skipHeader: false,
  });
  formatWorksheet(worksheet);
  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(name));
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer", cellStyles: true });
}

// GET /api/trainer/trainee/:name/report — generate Word document report
app.get("/api/trainer/trainee/:name/report", requireTrainer, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const traineeSessions = db.sessions.filter(s => s.trainee.toLowerCase() === name.toLowerCase());

  if (!traineeSessions.length) {
    return res.status(404).json({ error: "No sessions found for this trainee" });
  }

  try {
    const buffer = await generateTraineeReportDoc(name, traineeSessions, db);
    if (!buffer) {
      return res.status(500).json({ error: "Failed to generate report document" });
    }
    
    const filename = `Trainee_Report_${name.replace(/\s+/g, "_")}.docx`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.end(buffer);
  } catch (err) {
    console.error("Report generation error:", err);
    res.status(500).json({ error: "Failed to generate report", details: err.message });
  }
});

app.get("/api/trainer/trainee/:name/excel", requireTrainer, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const traineeSessions = db.sessions.filter(s => s.trainee.toLowerCase() === name.toLowerCase());

  if (!traineeSessions.length) {
    return res.status(404).json({ error: "No sessions found for this trainee" });
  }

  try {
    const buffer = await generateTraineeExcelReport(name, traineeSessions);
    if (!buffer) {
      return res.status(500).json({ error: "Failed to generate Excel report" });
    }

    const filename = `Trainee_Report_${name.replace(/\s+/g, "_")}_${new Date().getTime()}.xlsx`;
    const frontendDir = path.join(__dirname, "../frontend");
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }
    fs.writeFileSync(path.join(frontendDir, filename), buffer);

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.end(buffer);
  } catch (err) {
    console.error("Excel report generation error:", err);
    res.status(500).json({ error: "Failed to generate Excel report", details: err.message });
  }
});

// GET /api/trainer/reports/all/download — download all trainee reports as ZIP
function sanitizeSheetName(name) {
  return name.replace(/[:\\/?\[\]*]/g, "_").slice(0, 31) || "Sheet1";
}

async function generateAllTraineesExcelReport(db) {
  const allTrainees = [...new Set(db.sessions.map(s => s.trainee))];
  if (!allTrainees.length) return null;

  const workbook = XLSX.utils.book_new();

  allTrainees.forEach((trainee) => {
    const traineeSessions = db.sessions.filter(s => s.trainee.toLowerCase() === trainee.toLowerCase());
    const rows = [];

    traineeSessions.forEach((session) => {
      session.results.forEach((result, idx) => {
        rows.push({
          "Trainee Name": trainee,
          "Session Date": session.date,
          "Session ID": session.id,
          "Q No": idx + 1,
          "Question": result.question,
          "Trainee Answer": result.answer || "[Skipped]",
          "Model Answer": result.modelAnswer || "Model answer not available",
          "Score": result.score,
          "Score Label": result.scoreLabel,
          "Integrity": session.suspicionLevel || "Clean",
          "Tab Switches": session.tabSwitches || 0,
          "Pastes": session.pastes || 0,
          "Copies": session.copies || 0,
        });
      });
      rows.push({
        "Trainee Name": trainee,
        "Session Date": session.date,
        "Session ID": session.id,
        "Q No": "",
        "Question": "Session integrity summary",
        "Trainee Answer": `Integrity: ${session.suspicionLevel || "Clean"} | Tab switches: ${session.tabSwitches || 0} | Pastes: ${session.pastes || 0} | Copies: ${session.copies || 0}`,
        "Model Answer": "",
        "Score": "",
        "Score Label": "",
        "Integrity": session.suspicionLevel || "Clean",
        "Tab Switches": session.tabSwitches || 0,
        "Pastes": session.pastes || 0,
        "Copies": session.copies || 0,
      });
      rows.push({});
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: ["Trainee Name", "Session Date", "Session ID", "Q No", "Question", "Trainee Answer", "Model Answer", "Score", "Score Label", "Integrity", "Tab Switches", "Pastes", "Copies"],
      skipHeader: false,
    });

    formatWorksheet(worksheet);
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(trainee));
  });

  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer", cellStyles: true });
}

app.get("/api/trainer/reports/all/download", requireTrainer, async (req, res) => {
  try {
    const buffer = await generateAllTraineesExcelReport(db);
    if (!buffer) {
      return res.status(404).json({ error: "No trainee data available" });
    }

    const filename = `All_Trainee_Reports_${new Date().getTime()}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.end(buffer);
  } catch (err) {
    console.error("Bulk Excel generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate Excel report", details: err.message });
    }
  }
});

// GET /api/trainer/trainee/:name/dashboard — download current dashboard view as Word document
app.get("/api/trainer/trainee/:name/dashboard", requireTrainer, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const traineeSessions = db.sessions.filter(s => s.trainee.toLowerCase() === name.toLowerCase());

  if (!traineeSessions.length) {
    return res.status(404).json({ error: "No sessions found for this trainee" });
  }

  try {
    const buffer = await generateTraineeDashboardDoc(name, traineeSessions, db);
    if (!buffer) {
      return res.status(500).json({ error: "Failed to generate dashboard document" });
    }
    
    const filename = `Dashboard_${name.replace(/\s+/g, "_")}_${new Date().getTime()}.docx`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.end(buffer);
  } catch (err) {
    console.error("Dashboard download error:", err);
    res.status(500).json({ error: "Failed to generate dashboard", details: err.message });
  }
});

// GET /api/trainer/consolidated-report — generate and save consolidated report with all trainees to frontend folder
app.get("/api/trainer/consolidated-report", requireTrainer, async (req, res) => {
  try {
    if (!db.sessions.length) {
      return res.status(404).json({ error: "No session data available" });
    }

    const buffer = await generateConsolidatedReportDoc(db);
    const timestamp = new Date().getTime();
    const filename = `Consolidated_Trainee_Report_${timestamp}.docx`;
    const frontendPath = path.join(__dirname, "../frontend", filename);

    // Ensure frontend directory exists
    const frontendDir = path.join(__dirname, "../frontend");
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }

    // Save file to frontend folder
    fs.writeFileSync(frontendPath, buffer);

    res.json({
      ok: true,
      filename: filename,
      path: `/frontend/${filename}`,
      message: "Consolidated report generated and saved successfully"
    });
  } catch (err) {
    console.error("Consolidated report generation error:", err);
    res.status(500).json({ error: "Failed to generate consolidated report", details: err?.message || String(err) });
  }
});

// Serve static files from frontend folder (including reports)
app.use("/frontend", express.static(path.join(__dirname, "../frontend")));


app.listen(PORT, () => console.log(`✅ EvalPro backend running on http://localhost:${PORT}`));
