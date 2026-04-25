import { useState, useEffect } from "react";
import { Radar, Bar } from "react-chartjs-2";
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, CategoryScale, LinearScale, BarElement } from "chart.js";
import { api } from "./api.js";
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, CategoryScale, LinearScale, BarElement);

const TOPICS = ["Core Java", "Functional Testing", "SQL", "Selenium"];

function Spinner() { return <div className="spinner" />; }

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

// ─── OVERVIEW TAB ────────────────────────────────────────────────
function OverviewTab({ sessions, onDelete, onQuickView }) {
  if (!sessions.length) return <div className="empty-state">No sessions recorded yet.</div>;

  const avg = Math.round(sessions.reduce((s, r) => s + r.pct, 0) / sessions.length);
  const top = Math.max(...sessions.map(s => s.pct));
  const pass = sessions.filter(s => s.pct >= 60).length;
  const trainees = [...new Set(sessions.map(s => s.trainee))];

  // Bar chart data
  const byT = {};
  sessions.forEach(s => { if (!byT[s.trainee]) byT[s.trainee] = []; byT[s.trainee].push(s.pct); });
  const barLabels = Object.keys(byT);
  const barData = barLabels.map(n => Math.round(byT[n].reduce((a, b) => a + b, 0) / byT[n].length));
  const barColors = barData.map(v => v >= 70 ? "rgba(58,125,10,0.8)" : v >= 50 ? "rgba(179,106,0,0.8)" : "rgba(192,57,43,0.8)");

  // Radar chart
  const radarData = TOPICS.map(t => {
    let sc = [];
    sessions.forEach(s => s.results.filter(r => r.topic === t).forEach(r => sc.push(r.score)));
    return sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length * 10) : 0;
  });

  return (
    <div>
      <div className="metrics-grid">
        <div className="metric"><div className="metric-label">Sessions</div><div className="metric-value">{sessions.length}</div><div className="metric-sub">{trainees.length} trainees</div></div>
        <div className="metric"><div className="metric-label">Avg score</div><div className="metric-value">{avg}%</div></div>
        <div className="metric"><div className="metric-label">Pass rate</div><div className="metric-value">{Math.round(pass / sessions.length * 100)}%</div><div className="metric-sub">≥60%</div></div>
        <div className="metric"><div className="metric-label">Top score</div><div className="metric-value">{top}%</div></div>
      </div>

      <div className="chart-section">
        <div className="chart-title">Trainee performance</div>
        <div className="chart-box">
          <Bar data={{ labels: barLabels, datasets: [{ data: barData, backgroundColor: barColors, borderRadius: 6, borderSkipped: false }] }}
            options={{ responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.parsed.y + "%" } } }, scales: { x: { ticks: { color: "#6b6b65", font: { family: "'DM Mono'" } }, grid: { color: "rgba(0,0,0,0.05)" } }, y: { min: 0, max: 100, ticks: { color: "#6b6b65", callback: v => v + "%" }, grid: { color: "rgba(0,0,0,0.06)" } } } }} />
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-title">Topic strength & weakness</div>
        <div className="chart-box">
          <Radar data={{ labels: TOPICS, datasets: [{ data: radarData, backgroundColor: "rgba(58,125,10,0.08)", borderColor: "rgba(58,125,10,0.7)", borderWidth: 2, pointBackgroundColor: "#3a7d0a", pointRadius: 4 }] }}
            options={{ responsive: true, plugins: { legend: { display: false } }, scales: { r: { min: 0, max: 100, ticks: { color: "#a0a09a", backdropColor: "transparent", font: { size: 10 }, callback: v => v + "%" }, grid: { color: "rgba(0,0,0,0.07)" }, angleLines: { color: "rgba(0,0,0,0.05)" }, pointLabels: { color: "#6b6b65", font: { family: "'Outfit'", size: 11 } } } } }} />
        </div>
      </div>

      <div className="section-title">All trainees</div>
      <div className="card">
        {Object.entries(byT).map(([name, sess]) => {
          const latest = sessions.filter(s => s.trainee === name).slice(-1)[0];
          const avg2 = Math.round(sess.reduce((a, b) => a + b, 0) / sess.length);
          const cls = latest.pct >= 70 ? "pill-high" : latest.pct >= 50 ? "pill-mid" : "pill-low";
          const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
          return (
            <div key={name} className="trainee-row">
              <div className="avatar" onClick={() => onQuickView(name)}>{initials}</div>
              <div className="trainee-info" onClick={() => onQuickView(name)}>
                <div className="trainee-name">{name}</div>
                <div className="trainee-sub">{latest.cohort} · {sess.length} session{sess.length > 1 ? "s" : ""} · avg {avg2}%</div>
              </div>
              <span className={`score-pill ${cls}`}>{latest.pct}%</span>
              <button className="btn-delete" onClick={() => onDelete(name)}>✕ Delete</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── APPROVALS TAB ───────────────────────────────────────────────
function ApprovalsTab({ sessions, token, onRefresh }) {
  const [loading, setLoading] = useState({});

  const byT = {};
  sessions.forEach(s => { if (!byT[s.trainee] || s.id > byT[s.trainee].id) byT[s.trainee] = s; });

  // We need pending — fetched fresh from server
  const [pending, setPending] = useState([]);
  useEffect(() => {
    api.getPending(token).then(d => setPending(d.pending || [])).catch(() => {});
  }, [sessions]);

  async function act(id, action, name) {
    setLoading(l => ({ ...l, [id]: true }));
    try {
      await api.approveSession(token, id, action);
      setPending(p => p.filter(s => s.id !== id));
      onRefresh();
    } catch {}
    setLoading(l => ({ ...l, [id]: false }));
  }

  if (!pending.length) return <div className="empty-state" style={{ margin: "1.5rem" }}>No pending approvals. All trainees cleared ✓</div>;

  return (
    <div className="card" style={{ margin: "1rem 1.5rem" }}>
      {pending.map(s => {
        const cls = s.pct >= 70 ? "pill-high" : s.pct >= 50 ? "pill-mid" : "pill-low";
        return (
          <div key={s.id} className="approval-row">
            <div>
              <div className="trainee-name">{s.trainee}</div>
              <div className="trainee-sub">{s.cohort} · {s.date} · <span className={`score-pill ${cls}`} style={{ fontSize: 10 }}>{s.pct}%</span></div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-approve" onClick={() => act(s.id, "approve", s.trainee)} disabled={loading[s.id]}>✓ Approve</button>
              <button className="btn-deny" onClick={() => act(s.id, "deny", s.trainee)} disabled={loading[s.id]}>✗ Deny</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── INDIVIDUAL TAB ───────────────────────────────────────────────
function IndividualTab({ sessions, selectedName, onSelect, onDelete }) {
  const names = [...new Set(sessions.map(s => s.trainee))];
  const traineeSessions = sessions.filter(s => s.trainee === selectedName);
  const latest = traineeSession => traineeSession[traineeSession.length - 1];
  const avgPct = traineeSession => Math.round(traineeSession.reduce((s, r) => s + r.pct, 0) / traineeSession.length);

  return (
    <div>
      <div style={{ padding: "1rem 1.5rem 0.5rem", display: "flex", gap: 8, alignItems: "center" }}>
        <select style={{ flex: 1 }} value={selectedName || ""} onChange={e => onSelect(e.target.value)}>
          <option value="">— select trainee —</option>
          {names.map(n => <option key={n}>{n}</option>)}
        </select>
        {selectedName && <button className="btn-delete" onClick={() => onDelete(selectedName)}>✕ Delete</button>}
      </div>
      {selectedName && traineeSession.length > 0 && (() => {
        const sess = traineeSession;
        const lat = latest(sess);
        const avg = avgPct(sess);
        const grade = avg >= 80 ? "Excellent" : avg >= 60 ? "Good" : avg >= 40 ? "Needs improvement" : "Re-assessment";
        return (
          <div>
            <div className="metrics-grid">
              <div className="metric"><div className="metric-label">Sessions</div><div className="metric-value">{sess.length}</div></div>
              <div className="metric"><div className="metric-label">Avg score</div><div className="metric-value">{avg}%</div></div>
              <div className="metric"><div className="metric-label">Status</div><div className="metric-value" style={{ fontSize: 13, paddingTop: 6 }}>{grade}</div></div>
            </div>
            <div className="section-title">Latest session — {lat.date}</div>
            {lat.results.map((r, i) => (
              <div key={i} className="result-card" style={{ margin: "0 1.5rem 12px" }}>
                <div className="rc-header"><span className="rc-title">Q{i + 1} · {r.topic}</span><ScorePill score={r.score} label={r.scoreLabel} /></div>
                <div className="rc-body">
                  <div className="rc-question">{r.question}</div>
                  <div className="rc-label">Trainee answer</div>
                  <div className="rc-answer">{r.answer}</div>
                  <div className="rc-label">Evaluator feedback</div>
                  <div className="rc-feedback">{r.feedback}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ─── INSIGHTS TAB ─────────────────────────────────────────────────
function InsightsTab({ sessions }) {
  if (!sessions.length) return <div className="empty-state">No data yet.</div>;

  const topicData = TOPICS.map(t => {
    let sc = [], skipped = 0, surface = 0, wrong = 0;
    sessions.forEach(s => s.results.filter(r => r.topic === t).forEach(r => {
      if (r.answer === "[Skipped]" || r.answer === "[Time expired]") skipped++;
      else { sc.push(r.score); if (r.scoreLabel === "Surface answer") surface++; if (r.scoreLabel === "Mostly wrong" || r.scoreLabel === "Irrelevant") wrong++; }
    }));
    return { topic: t, avg: sc.length ? +(sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1) : 0, skipped, surface, wrong };
  });

  const sorted = [...topicData].sort((a, b) => b.avg - a.avg);
  const avgOverall = Math.round(sessions.reduce((s, r) => s + r.pct, 0) / sessions.length);
  const passRate = Math.round(sessions.filter(s => s.pct >= 60).length / sessions.length * 100);
  const totalSkips = sessions.reduce((sum, s) => sum + s.results.filter(r => r.answer === "[Skipped]" || r.answer === "[Time expired]").length, 0);
  const topScorer = sessions.reduce((a, b) => b.pct > a.pct ? b : a);
  const bottomScorer = sessions.reduce((a, b) => b.pct < a.pct ? b : a);
  const worst = sorted[sorted.length - 1];

  // Build dynamic actions
  const actions = [];
  const actMap = {
    "Core Java": `Run a 2-hour Java fundamentals workshop with live coding in TestNG context.`,
    "Functional Testing": `Hold a test design workshop: write real test cases for a login module using EP, BVA, and exploratory techniques.`,
    "SQL": `Conduct a hands-on SQL lab using a test database — JOINs, aggregations, data cleanup queries tied to test data setup.`,
    "Selenium": `Assign a mini POM project: BasePage, 2 page classes, TestNG suite, @DataProvider for login tests.`
  };

  let a1 = `<strong>${worst.topic}</strong> is weakest at ${worst.avg}/10. `;
  if (worst.skipped > 0) a1 += `${worst.skipped} skip(s) — schedule verbal Q&A sessions first to build confidence. `;
  if (worst.surface > 0) a1 += `${worst.surface} surface answer(s) — run a lab where trainees must implement, not just define. `;
  if (worst.wrong > 0) a1 += `${worst.wrong} incorrect answer(s) — revisit fundamentals using project context, not textbooks.`;
  if (!worst.skipped && !worst.surface && !worst.wrong) a1 += actMap[worst.topic];
  actions.push(a1);

  const surfaceTrainees = [...new Set(sessions.filter(s => s.results.filter(r => r.scoreLabel === "Surface answer").length >= 2).map(s => s.trainee))];
  if (surfaceTrainees.length) {
    actions.push(`<strong>${surfaceTrainees.join(", ")}</strong> gave repeated surface answers — run a "show don't tell" drill: explain THROUGH a code example or project scenario. Mark only when application is demonstrated.`);
  } else if (sorted.length >= 2) {
    const second = sorted[sorted.length - 2];
    actions.push(`<strong>${second.topic}</strong> also needs attention at ${second.avg}/10. Conduct peer-review: pairs critique each other's answers and identify missing real-world examples.`);
  }

  const highRisk = [...new Set(sessions.filter(s => s.suspicionLevel === "High" || s.suspicionLevel === "Medium").map(s => s.trainee))];
  if (highRisk.length) {
    actions.push(`<strong>Integrity:</strong> ${highRisk.join(", ")} flagged with suspicious behaviour. Consider in-person supervised verbal viva on weakest topics to confirm genuine understanding.`);
  } else if (totalSkips > 3) {
    actions.push(`Avg ${Math.round(totalSkips / sessions.length)} skips/session — run timed mock drills with no skipping allowed. Partial answers score better than blanks.`);
  } else if (passRate < 60) {
    const failing = [...new Set(sessions.filter(s => s.pct < 60).map(s => s.trainee))].slice(0, 4).join(", ");
    actions.push(`Only ${passRate}% pass rate. Trainees below 60%: <strong>${failing}</strong>. Schedule 20-min individual reviews — go through wrong answers together, assign homework before approving next session.`);
  } else {
    actions.push(`Cohort passing. Push to excellence: assign a capstone task combining all 4 topics — SQL test data, Core Java utilities, functional test design, Selenium execution. Score with the same rubric.`);
  }

  return (
    <div>
      <div className="metrics-grid">
        <div className="metric"><div className="metric-label">Best topic</div><div className="metric-value" style={{ fontSize: 13, color: "var(--green)", paddingTop: 4 }}>{sorted[0].topic}<div className="metric-sub">{sorted[0].avg}/10</div></div></div>
        <div className="metric"><div className="metric-label">Weakest topic</div><div className="metric-value" style={{ fontSize: 13, color: "var(--red)", paddingTop: 4 }}>{worst.topic}<div className="metric-sub">{worst.avg}/10</div></div></div>
        <div className="metric"><div className="metric-label">Total skips</div><div className="metric-value">{totalSkips}</div></div>
      </div>

      <div className="section-title">Overall assessment</div>
      <div className="card">
        <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text2)" }}>
          Cohort avg is <strong>{avgOverall}%</strong> — {avgOverall >= 80 ? "strong" : avgOverall >= 60 ? "satisfactory" : avgOverall >= 40 ? "below expectations" : "critically low"}.
          Pass rate is <strong>{passRate}%</strong>{passRate < 60 ? " — immediate intervention recommended." : passRate < 80 ? " — some trainees need targeted support." : " — cohort is performing well."}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <div className="metric-mini"><div className="rm-label">Top performer</div><div style={{ fontWeight: 600 }}>{topScorer.trainee}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{topScorer.pct}%</div></div>
          <div className="metric-mini"><div className="rm-label">Needs most support</div><div style={{ fontWeight: 600 }}>{bottomScorer.trainee}</div><div style={{ fontSize: 11, color: "var(--text3)" }}>{bottomScorer.pct}%</div></div>
        </div>
      </div>

      <div className="section-title">Topic-wise breakdown</div>
      <div className="card">
        {topicData.map(t => {
          const pct = Math.round(t.avg * 10);
          const col = t.avg >= 7 ? "var(--green)" : t.avg >= 5 ? "var(--amber)" : "var(--red)";
          const label = t.avg >= 7 ? "Strong" : t.avg >= 5 ? "Average" : "Weak";
          return (
            <div key={t.topic} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{t.topic}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: col, fontWeight: 600, background: col + "18", padding: "2px 8px", borderRadius: 100 }}>{label}</span>
                  <span style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--text2)" }}>{t.avg}/10</span>
                </div>
              </div>
              <div className="progress-bar"><div style={{ height: "100%", borderRadius: 100, background: col, width: pct + "%", transition: "width 0.8s" }} /></div>
              {t.skipped > 0 && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>⚠ {t.skipped} skipped</div>}
            </div>
          );
        })}
      </div>

      <div className="insight-card"><div className="insight-header">→ Trainer action plan</div><div className="insight-body">
        {actions.map((a, i) => (
          <div key={i} className="insight-item">
            <div className="insight-dot" style={{ background: "var(--blue)" }} />
            <div><strong>Action {i + 1}:</strong> <span dangerouslySetInnerHTML={{ __html: a }} /></div>
          </div>
        ))}
      </div></div>
    </div>
  );
}

// ─── INTEGRITY TAB ────────────────────────────────────────────────
function IntegrityTab({ sessions }) {
  const high = sessions.filter(s => s.suspicionLevel === "High").length;
  const medium = sessions.filter(s => s.suspicionLevel === "Medium").length;
  const clean = sessions.filter(s => !s.suspicionLevel || s.suspicionLevel === "Clean").length;

  const byT = {};
  sessions.forEach(s => { if (!byT[s.trainee] || s.id > byT[s.trainee].id) byT[s.trainee] = s; });
  const sorted = Object.values(byT).sort((a, b) => (b.suspicionScore || 0) - (a.suspicionScore || 0));

  const iconMap = { TAB_HIDDEN: "👁", TAB_RETURNED: "↩", WINDOW_BLUR: "🔓", COPY: "📋", PASTE: "📥", PASTE_SHORTCUT: "📥", SUDDEN_JUMP: "⚡", RIGHT_CLICK: "🖱", ALT_TAB: "⇥" };

  return (
    <div>
      <div className="metrics-grid">
        <div className="metric"><div className="metric-label">Total sessions</div><div className="metric-value">{sessions.length}</div></div>
        <div className="metric"><div className="metric-label" style={{ color: "var(--red)" }}>High risk</div><div className="metric-value" style={{ color: "var(--red)" }}>{high}</div></div>
        <div className="metric"><div className="metric-label" style={{ color: "var(--amber)" }}>Medium risk</div><div className="metric-value" style={{ color: "var(--amber)" }}>{medium}</div></div>
        <div className="metric"><div className="metric-label" style={{ color: "var(--green)" }}>Clean</div><div className="metric-value" style={{ color: "var(--green)" }}>{clean}</div></div>
      </div>
      {sorted.map(s => {
        const level = s.suspicionLevel || "Clean";
        const col = level === "High" ? "var(--red)" : level === "Medium" ? "var(--amber)" : level === "Low" ? "var(--amber)" : "var(--green)";
        const bgCol = level === "High" ? "var(--red-dim)" : level === "Medium" ? "var(--amber-dim)" : level === "Low" ? "var(--amber-dim)" : "var(--green-dim)";
        const log = s.proctorLog || [];
        return (
          <div key={s.id} className="card" style={{ margin: "0 1.5rem 1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div><div style={{ fontSize: 14, fontWeight: 600 }}>{s.trainee}</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{s.cohort} · {s.date} · Score: {s.pct}%</div></div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: col, background: bgCol, padding: "4px 12px", borderRadius: 100, display: "inline-block" }}>{level} risk</div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>Suspicion: {s.suspicionScore || 0}/100</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              {[["Tab switches", s.tabSwitches], ["Pastes", s.pastes], ["Copies", s.copies], ["Events", log.length]].map(([lbl, val]) => (
                <div key={lbl} style={{ background: "var(--bg3)", borderRadius: "var(--radius)", padding: "6px 12px", fontSize: 12 }}>
                  <span style={{ color: "var(--text3)" }}>{lbl}</span> <strong style={{ marginLeft: 6 }}>{val || 0}</strong>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Event log</div>
            <div style={{ background: "var(--bg3)", borderRadius: "var(--radius)", padding: "8px 12px", maxHeight: 200, overflowY: "auto" }}>
              {log.length === 0
                ? <div style={{ fontSize: 12, color: "var(--text3)" }}>No suspicious events recorded.</div>
                : log.slice(0, 10).map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "0.5px solid var(--border)", fontSize: 12 }}>
                    <span style={{ color: "var(--text3)", fontFamily: "var(--mono)", flexShrink: 0 }}>{e.time}</span>
                    <span>{iconMap[e.type] || "•"}</span>
                    <span style={{ color: "var(--text2)" }}>{e.detail}</span>
                  </div>
                ))
              }
              {log.length > 10 && <div style={{ fontSize: 11, color: "var(--text3)", padding: "6px 0" }}>+{log.length - 10} more events…</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TRAINER DASHBOARD ────────────────────────────────────────────
export default function TrainerDashboard({ token, onExit }) {
  const [tab, setTab] = useState("overview");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainee, setSelectedTrainee] = useState("");

  async function load() {
    setLoading(true);
    try { const d = await api.getSessions(token); setSessions(d.sessions || []); } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(name) {
    if (!window.confirm(`Delete ALL session data for "${name}"?\n\nThis cannot be undone.`)) return;
    await api.deleteTrainee(token, name);
    if (selectedTrainee === name) setSelectedTrainee("");
    load();
  }

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "approvals", label: "Approvals" },
    { id: "individual", label: "Individual" },
    { id: "insights", label: "Insights" },
    { id: "integrity", label: "Integrity" },
  ];

  return (
    <div className="screen trainer-screen">
      <div className="t-header">
        <div className="brand-logo">Trainer <span>Dashboard</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={load}>↺ Refresh</button>
          <button className="btn-ghost" onClick={onExit}>Exit</button>
        </div>
      </div>
      <div className="tabs">
        {TABS.map(t => <div key={t.id} className={`tab ${tab === t.id ? "tab-active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</div>)}
      </div>
      {loading ? <div style={{ padding: "2rem", display: "flex", justifyContent: "center" }}><Spinner /></div> : (
        <div className="tab-content">
          {tab === "overview" && <OverviewTab sessions={sessions} onDelete={handleDelete} onQuickView={n => { setSelectedTrainee(n); setTab("individual"); }} />}
          {tab === "approvals" && <ApprovalsTab sessions={sessions} token={token} onRefresh={load} />}
          {tab === "individual" && <IndividualTab sessions={sessions} selectedName={selectedTrainee} onSelect={setSelectedTrainee} onDelete={handleDelete} />}
          {tab === "insights" && <InsightsTab sessions={sessions} />}
          {tab === "integrity" && <IntegrityTab sessions={sessions} />}
        </div>
      )}
    </div>
  );
}
