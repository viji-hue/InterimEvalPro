# EvalPro — Assessment Platform
React + Node.js. Credentials and model answers live ONLY on the server.

## Quick Start

### Backend
```bash
cd backend && npm install
# Edit .env with your credentials
npm run dev   # http://localhost:4000
```

### Frontend
```bash
cd frontend && npm install
npm run dev   # http://localhost:5173
```

### HTML reports
Completed sessions automatically update persistent HTML reports under `backend/reports/`:
- `backend/reports/cohorts/<cohort-code>.html` contains every trainee and session in that cohort.
- `backend/reports/trainees/<trainee-name>.html` contains that trainee's dashboard-style report.

Trainers can select a cohort code in the Overview tab to open its report, or select a trainee in the Individual tab to open the trainee report. The files remain on disk when the backend is stopped and are served only through trainer-authenticated routes.

## Security: What's hidden server-side
- Trainer name + code → .env only
- All question model answers → questions.js, never sent to browser
- Anthropic API key → .env only, AI eval runs server-side
- JWT secret → .env only

## Add Questions
Edit backend/questions.js — add to QUESTION_BANK array with id, topic, difficulty, q, key, evalHints.
Topics: "Core Java" | "Functional Testing" | "SQL" | "Selenium" | "Spring Boot" | "REST API" | "Data JPA" | "Angular"

## Deploy
1. cd frontend && npm run build
2. Serve dist/ from your Node server or deploy to Netlify/Vercel
3. Deploy backend to Render/Railway/VPS with .env secrets set
