import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, BorderStyle, WidthType, AlignmentType, TextRun, HeadingLevel, UnderlineType, VerticalAlign } from "docx";
import archiver from "archiver";
import { Readable } from "stream";
import { pickSessionQuestions, getFullQuestion } from "./questions.js";

const app = express();
const PORT = process.env.PORT || 4000;

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
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,  // API key hidden server-side
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are a strict senior QA lead evaluating a trainee's Selenium track assessment answer.

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
{"score":<0|2|5|7|10>,"scoreLabel":"<Full marks|Good answer|Surface answer|Mostly wrong|Irrelevant>","feedback":"<3-4 sentences: what was correct, what example was given or missing, what to study>"}`,
        messages: [{
          role: "user",
          content: `QUESTION: ${fullQ.q}\n\nMODEL ANSWER: ${modelAnswer}\n\nTRAINEE ANSWER: ${answer}`
        }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.content?.find(c => c.type === "text")?.text || "{}";
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
        shading: { fill: "F0F8F0" },
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
        shading: { fill: "F0F5FF" },
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

// GET /api/trainer/trainee/:name/report — generate Word document report
app.get("/api/trainer/trainee/:name/report", requireTrainer, async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const traineeSessions = db.sessions.filter(s => s.trainee.toLowerCase() === name.toLowerCase());

  if (!traineeSessions.length) {
    return res.status(404).json({ error: "No sessions found for this trainee" });
  }

  try {
    const buffer = await generateTraineeReportDoc(name, traineeSessions, db);
    res.setHeader("Content-Disposition", `attachment; filename="Trainee_Report_${name.replace(/\s+/g, "_")}.docx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.send(buffer);
  } catch (err) {
    console.error("Report generation error:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// GET /api/trainer/reports/all/download — download all trainee reports as ZIP
app.get("/api/trainer/reports/all/download", requireTrainer, async (req, res) => {
  try {
    const allTrainees = [...new Set(db.sessions.map(s => s.trainee))];

    if (!allTrainees.length) {
      return res.status(404).json({ error: "No trainee data available" });
    }

    const archive = archiver("zip", { zlib: { level: 9 } });

    res.setHeader("Content-Disposition", `attachment; filename="All_Trainee_Reports_${new Date().getTime()}.zip"`);
    res.setHeader("Content-Type", "application/zip");

    archive.pipe(res);

    // Generate and add each trainee report to ZIP
    for (const trainee of allTrainees) {
      const traineeSessions = db.sessions.filter(s => s.trainee.toLowerCase() === trainee.toLowerCase());
      const buffer = await generateTraineeReportDoc(trainee, traineeSessions, db);
      archive.append(buffer, { name: `Trainee_Report_${trainee.replace(/\s+/g, "_")}.docx` });
    }

    archive.finalize();
  } catch (err) {
    console.error("Bulk report generation error:", err);
    res.status(500).json({ error: "Failed to generate reports" });
  }
});

app.listen(PORT, () => console.log(`✅ EvalPro backend running on http://localhost:${PORT}`));
