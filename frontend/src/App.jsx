import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "./api.js";
import TrainerDashboard from "./TrainerDashboard.jsx";
import "./index.css";

// ─── PROCTORING HOOK ──────────────────────────────────────────────
function useProctor(sessionToken, active) {
  const currentQ = useRef(0);
  const log = useRef([]);

  const emit = useCallback(async (type, detail) => {
    if (!active || !sessionToken) return;
    const event = { type, detail, q: "Q" + (currentQ.current + 1), time: new Date().toLocaleTimeString("en-IN") };
    log.current.push(event);
    try { await api.logProctor(sessionToken, event); } catch {}
  }, [active, sessionToken]);

  useEffect(() => {
    if (!active) return;
    const onHide = () => emit("TAB_HIDDEN", `Tab hidden at Q${currentQ.current + 1}`);
    const onReturn = () => emit("TAB_RETURNED", `Returned to tab at Q${currentQ.current + 1}`);
    const onBlur = () => emit("WINDOW_BLUR", `Window lost focus at Q${currentQ.current + 1}`);
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") emit("COPY", `Ctrl+C at Q${currentQ.current + 1}`);
      if ((e.ctrlKey || e.metaKey) && e.key === "v") emit("PASTE_SHORTCUT", `Ctrl+V at Q${currentQ.current + 1}`);
      if (e.altKey && e.key === "Tab") emit("ALT_TAB", `Alt+Tab at Q${currentQ.current + 1}`);
    };
    const onCtx = () => emit("RIGHT_CLICK", `Right-click at Q${currentQ.current + 1}`);
    const onVisibility = () => document.hidden ? onHide() : onReturn();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("keydown", onKey);
    document.addEventListener("contextmenu", onCtx);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("contextmenu", onCtx);
    };
  }, [active, emit]);

  return { emit, currentQ, log };
}

// ─── COMPONENTS ───────────────────────────────────────────────────
function Spinner() {
  return <div className="spinner" />;
}

function ScorePill({ score, label }) {
  const cls = score >= 7 ? "pill-high" : score >= 4 ? "pill-mid" : "pill-low";
  const icons = { "Full marks": "🏆", "Good answer": "✓", "Surface answer": "📖", "Mostly wrong": "⚠", "Irrelevant": "✕" };
  return (
    <div className="score-pill-wrap">
      {label && <span className="score-label">{icons[label] || ""} {label}</span>}
      <span className={`score-pill ${cls}`}>{score}/10</span>
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────
function LoginScreen({ onTrainee, onTrainer }) {
  const [role, setRole] = useState("trainee");
  const [name, setName] = useState("");
  const [cohort, setCohort] = useState("");
  const [tName, setTName] = useState("");
  const [tCode, setTCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(""); setLoading(true);
    try {
      if (role === "trainee") {
        if (!name.trim() || !cohort.trim()) { setError("Please enter your name and cohort."); setLoading(false); return; }
        await onTrainee(name.trim(), cohort.trim());
      } else {
        if (!tName.trim() || !tCode.trim()) { setError("Please enter your name and access code."); setLoading(false); return; }
        await onTrainer(tName.trim(), tCode.trim());
      }
    } catch (e) {
      setError(e.message || "Cannot access the trainer dashboard. Check your credentials.");
    }
    setLoading(false);
  }

  return (
    <div className="screen login-screen">
      <div className="login-card">
        <div className="brand">
          <div className="brand-logo">EvalPro</div>
          <div className="brand-tag">SELENIUM TRACK · BU STANDARD</div>
        </div>
        <div className="login-hero">
          <h1>Interim<br /><em>Assessment</em></h1>
          <p>Timed 5-question sessions on Core Java, Functional Testing, SQL & Selenium/TestNG — evaluated against business unit standards.</p>
        </div>
        <div className="form-body">
          <div className="form-row">
            <label>Role</label>
            <select value={role} onChange={e => { setRole(e.target.value); setError(""); }}>
              <option value="trainee">Trainee — take assessment</option>
              <option value="trainer">Trainer — dashboard</option>
            </select>
          </div>
          {role === "trainee" ? (
            <>
              <div className="form-row"><label>Your name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma" /></div>
              <div className="form-row"><label>Cohort / Batch</label><input value={cohort} onChange={e => setCohort(e.target.value)} placeholder="e.g. Batch-12 May 2025" /></div>
            </>
          ) : (
            <>
              <div className="form-row"><label>Trainer name</label><input value={tName} onChange={e => { setTName(e.target.value); setError(""); }} placeholder="Enter trainer name" /></div>
              <div className="form-row"><label>Access code</label><input type="password" value={tCode} onChange={e => { setTCode(e.target.value); setError(""); }} placeholder="Enter access code" /></div>
            </>
          )}
          {error && <div className="inline-error">⚠ {error}</div>}
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <Spinner /> : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WAIT SCREEN ──────────────────────────────────────────────────
function WaitScreen({ waitId, trainee, onBack }) {
  const [status, setStatus] = useState("");

  async function check() {
    try {
      const d = await api.checkApproval(trainee);
      if (d.status === "approved") setStatus("approved");
      else if (d.status === "denied") setStatus("denied");
      else setStatus("pending");
    } catch { setStatus("error"); }
  }

  return (
    <div className="screen wait-screen">
      <div className="wait-card">
        <div className="wait-icon">🔒</div>
        <h2>Next session locked</h2>
        <p>Your previous session has been recorded. The trainer must approve your next session before you can continue.</p>
        <div className="wait-id">{waitId}</div>
        <p className="wait-hint">Show this ID to the trainer to get approved.</p>
        <div className="wait-actions">
          <button className="btn-secondary" onClick={check}>Check status</button>
          <button className="btn-ghost" onClick={onBack}>← Back</button>
        </div>
        {status === "approved" && <div className="status-msg status-ok">✓ Approved! Go back and start your session.</div>}
        {status === "denied" && <div className="status-msg status-err">✗ Session denied by trainer. Contact them for details.</div>}
        {status === "pending" && <div className="status-msg">Still pending. Please wait for trainer approval.</div>}
        {status === "error" && <div className="status-msg status-err">Could not reach server. Check your connection.</div>}
      </div>
    </div>
  );
}

// ─── QUESTION SCREEN ──────────────────────────────────────────────
function QuestionScreen({ sessionToken, questions, trainee, cohort, onFinish }) {
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(300);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState("");
  const [results, setResults] = useState([]);
  const [scoreSoFar, setScoreSoFar] = useState(0);

  const proctor = useProctor(sessionToken, true);
  proctor.currentQ.current = idx;

  // Timer
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(p => {
      if (p <= 1) { clearInterval(t); handleAutoFinish(); return 0; }
      return p - 1;
    }), 1000);
    return () => clearInterval(t);
  }, []);

  // Detect paste by text jump
  const lastLen = useRef(0);
  function onInput(e) {
    const cur = e.target.value.length;
    if (cur - lastLen.current >= 30) proctor.emit("SUDDEN_JUMP", `Answer jumped ${cur - lastLen.current} chars at Q${idx + 1}`);
    lastLen.current = cur;
  }
  function onPaste(e) {
    const txt = e.clipboardData?.getData("text") || "";
    proctor.emit("PASTE", `Pasted ${txt.trim().split(/\s+/).length} words at Q${idx + 1}`);
  }
  useEffect(() => { setAnswer(""); lastLen.current = 0; }, [idx]);

  // Alert banner
  useEffect(() => {
    const orig = proctor.emit;
    // Show alert on tab events
  }, []);

  function showAlert(msg) { setAlert(msg); setTimeout(() => setAlert(""), 4000); }

  async function submitAnswer(skipped = false) {
    const ans = skipped ? "[Skipped]" : answer.trim();
    if (!skipped && !ans) { showAlert("Please type an answer or skip."); return; }
    setLoading(true);
    let score = 0, scoreLabel = "Irrelevant", feedback = "Skipped.";
    if (!skipped) {
      try {
        const ev = await api.submitAnswer(sessionToken, questions[idx].id, ans);
        score = ev.score; scoreLabel = ev.scoreLabel; feedback = ev.feedback;
      } catch { score = 5; scoreLabel = "Surface answer"; feedback = "AI evaluation unavailable. Answer recorded."; }
    }
    const result = { questionId: questions[idx].id, topic: questions[idx].topic, question: questions[idx].q, answer: ans, score, scoreLabel, feedback };
    const newResults = [...results, result];
    setResults(newResults);
    setScoreSoFar(s => s + score);
    setLoading(false);
    if (idx < 4) setIdx(i => i + 1);
    else await finish(newResults);
  }

  async function handleAutoFinish() {
    const remaining = questions.slice(results.length).map(q => ({ questionId: q.id, topic: q.topic, question: q.q, answer: "[Time expired]", score: 0, scoreLabel: "Irrelevant", feedback: "Time expired." }));
    await finish([...results, ...remaining]);
  }

  async function finish(finalResults) {
    try { await api.finishSession(sessionToken, finalResults); } catch {}
    onFinish(finalResults, scoreSoFar);
  }

  const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
  const timerWarn = timeLeft <= 60;
  const progress = `${idx * 20}%`;
  const q = questions[idx];

  return (
    <div className="screen question-screen">
      {alert && <div className="proctor-alert">⚠ {alert}</div>}
      <div className="q-header">
        <div><div className="q-trainee">{trainee}</div><div className="q-cohort">{cohort}</div></div>
        <div className="timer-wrap">
          <div className={`timer ${timerWarn ? "timer-warn" : ""}`}>{m}:{String(s).padStart(2, "0")}</div>
          <div className="timer-label">TIME LEFT</div>
        </div>
      </div>
      <div className="q-progress-wrap">
        <div className="q-progress-bar"><div className="q-progress-fill" style={{ width: progress }} /></div>
        <div className="q-progress-labels">
          <span>Question {idx + 1} of 5</span>
          <span className="mono">{idx > 0 ? `${scoreSoFar}/${idx * 10} pts` : ""}</span>
        </div>
      </div>
      <div className="q-body">
        <div className="q-num mono">Q{idx + 1}</div>
        <div className="q-topic-pill">{q.topic} · {q.difficulty}</div>
        <div className="q-text">{q.q}</div>
        <textarea className="q-textarea" value={answer} onChange={e => setAnswer(e.target.value)} onInput={onInput} onPaste={onPaste} placeholder="Type your answer here. Include code snippets or real-world examples where relevant." />
      </div>
      {loading && <div className="q-loader"><Spinner /> Evaluating your answer…</div>}
      <div className="q-footer">
        <button className="btn-primary" onClick={() => submitAnswer(false)} disabled={loading}>{idx < 4 ? "Next question →" : "Submit & finish ✓"}</button>
        <button className="btn-ghost" onClick={() => submitAnswer(true)} disabled={loading}>Skip</button>
      </div>
    </div>
  );
}

// ─── RESULTS SCREEN ───────────────────────────────────────────────
function ResultsScreen({ results, onHome }) {
  const total = results.reduce((s, r) => s + r.score, 0);
  const pct = Math.round((total / 50) * 100);
  const grade = pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : pct >= 40 ? "Needs improvement" : "Re-assessment needed";

  return (
    <div className="screen results-screen">
      <div className="results-header">
        <div className="brand-logo">EvalPro</div>
        <button className="btn-ghost" onClick={onHome}>Home</button>
      </div>
      <div className="results-summary">
        <div className="result-metric"><div className="rm-label">Score</div><div className="rm-value">{total}/50</div></div>
        <div className="result-metric"><div className="rm-label">Percentage</div><div className="rm-value">{pct}%</div></div>
        <div className="result-metric"><div className="rm-label">Grade</div><div className="rm-value rm-sm">{grade}</div></div>
      </div>
      <div className="approval-banner">
        <div className="ab-title">⏸ Next session locked</div>
        <div className="ab-body">Your results have been recorded. The trainer must approve your next session. Show your name to the trainer.</div>
      </div>
      <div className="results-list">
        {results.map((r, i) => (
          <div key={i} className="result-card">
            <div className="rc-header">
              <span className="rc-title">Q{i + 1} · {r.topic}</span>
              <ScorePill score={r.score} label={r.scoreLabel} />
            </div>
            <div className="rc-body">
              <div className="rc-question">{r.question}</div>
              <div className="rc-label">Your answer</div>
              <div className="rc-answer">{r.answer}</div>
              <div className="rc-label">Evaluator feedback</div>
              <div className="rc-feedback">{r.feedback}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login");
  const [traineeInfo, setTraineeInfo] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [waitData, setWaitData] = useState(null);
  const [results, setResults] = useState([]);
  const [trainerToken, setTrainerToken] = useState(null);

  async function handleTrainee(name, cohort) {
    const data = await api.startSession(name, cohort);
    setTraineeInfo({ name, cohort });
    setSessionData(data);
    setScreen("question");
  }

  async function handleTrainer(name, code) {
    const data = await api.trainerLogin(name, code);
    setTrainerToken(data.token);
    setScreen("trainer");
  }

  // catch approval_required from startSession
  async function handleTraineeWithApprovalCheck(name, cohort) {
    try {
      await handleTrainee(name, cohort);
    } catch (e) {
      if (e.error === "approval_required") {
        setWaitData({ waitId: e.waitId, name, cohort });
        setScreen("wait");
      } else throw e;
    }
  }

  function handleFinish(finalResults) {
    setResults(finalResults);
    setScreen("results");
  }

  if (screen === "login") return <LoginScreen onTrainee={handleTraineeWithApprovalCheck} onTrainer={handleTrainer} />;
  if (screen === "wait") return <WaitScreen waitId={waitData.waitId} trainee={waitData.name} onBack={() => setScreen("login")} />;
  if (screen === "question") return <QuestionScreen sessionToken={sessionData.sessionToken} questions={sessionData.questions} trainee={traineeInfo.name} cohort={traineeInfo.cohort} onFinish={handleFinish} />;
  if (screen === "results") return <ResultsScreen results={results} onHome={() => setScreen("login")} />;
  if (screen === "trainer") return <TrainerDashboard token={trainerToken} onExit={() => setScreen("login")} />;
  return null;
}
