# Backend Setup Guide

## Environment Variables

The backend requires the following environment variables to run:

### 1. **GEMINI_API_KEY** (Required)
- Get your free Gemini API key from: https://aistudio.google.com/app/apikey
- Click "Create API key" and copy it
- Add to `.env` file:
  ```
  GEMINI_API_KEY=your_key_here
  ```
- If this is missing or invalid, the backend will fail to start with an error

### 2. **JWT_SECRET** (Required)
- Used to sign trainer session tokens
- Default provided in `.env` (but change for production!)
- Generate a strong random string:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 3. **TRAINER_NAME** and **TRAINER_CODE** (Required)
- Credentials for the trainer dashboard login
- Defined in `.env` (change these!)

### 4. **PORT** (Optional)
- Server port, defaults to 4000

### 5. **FRONTEND_URL** (Optional)
- CORS origin for frontend, defaults to http://localhost:5173

## Troubleshooting API Key Errors

**Error: "Missing environment variable: GEMINI_API_KEY"**
- You haven't set the GEMINI_API_KEY in .env
- Solution: Get an API key from https://aistudio.google.com/app/apikey and add it to .env

**Error: "Invalid API key" or "401 Unauthorized"**
- The API key is incorrect or expired
- Solution: Generate a new API key from https://aistudio.google.com/app/apikey

**Error: "API quota exceeded"**
- You've used up your free quota
- Solution: Upgrade your Gemini API plan or wait for the quota to reset

**Error: "Failed to evaluate answer"**
- The AI evaluation feature failed but using local keyword-based fallback
- This is normal if the API is temporarily unavailable
- The test will still be scored using keyword matching

## Setup Steps

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Get a Gemini API key:
   - Visit https://aistudio.google.com/app/apikey
   - Click "Create API key" or select an existing one
   - Copy the full key

3. Update `.env` with your values:
   ```
   GEMINI_API_KEY=your_full_api_key
   TRAINER_NAME=Your Name
   TRAINER_CODE=your_code_123
   JWT_SECRET=your_random_secret_key
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start the server:
   ```bash
   npm start
   ```

6. Backend should now run on http://localhost:4000
