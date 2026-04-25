const BASE = "/api";

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export const api = {
  // Trainee
  startSession: (trainee, cohort) => req("POST", "/session/start", { trainee, cohort }),
  submitAnswer: (sessionToken, questionId, answer) => req("POST", "/session/answer", { sessionToken, questionId, answer }),
  logProctor: (sessionToken, event) => req("POST", "/session/proctor", { sessionToken, event }),
  finishSession: (sessionToken, results) => req("POST", "/session/finish", { sessionToken, results }),
  checkApproval: (trainee) => req("GET", `/approval/check?trainee=${encodeURIComponent(trainee)}`),

  // Trainer
  trainerLogin: (name, code) => req("POST", "/trainer/login", { name, code }),
  getSessions: (token) => req("GET", "/trainer/sessions", null, token),
  getPending: (token) => req("GET", "/trainer/approvals/pending", null, token),
  approveSession: (token, id, action) => req("POST", `/trainer/approvals/${id}`, { action }, token),
  deleteTrainee: (token, name) => req("DELETE", `/trainer/trainee/${encodeURIComponent(name)}`, null, token),
};
