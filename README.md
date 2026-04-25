# EvalPro — Selenium Track Assessment
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

## Security: What's hidden server-side
- Trainer name + code → .env only
- All question model answers → questions.js, never sent to browser
- Anthropic API key → .env only, AI eval runs server-side
- JWT secret → .env only

## Add Questions
Edit backend/questions.js — add to QUESTION_BANK array with id, topic, difficulty, q, key, evalHints.
Topics: "Core Java" | "Functional Testing" | "SQL" | "Selenium"

## Deploy
1. cd frontend && npm run build
2. Serve dist/ from your Node server or deploy to Netlify/Vercel
3. Deploy backend to Render/Railway/VPS with .env secrets set
