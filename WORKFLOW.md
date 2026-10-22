# Review-first job application workflow

## Preferences
- Salary target: INR 5–8 LPA
- Location: Electronic City, Bengaluru and remote roles in India
- Daily shortlist target: 15 relevant opportunities
- Priority: entry-level Python backend, software engineering, AI integration and automation

## Local setup
1. Copy `backend/.env.example` to `backend/.env` and add your own valid Adzuna API credentials.
2. In `backend`, run `npm install`, then `npm start`.
3. In `frontend`, copy `.env.example` to `.env`, run `npm install`, then `npm run dev`.
4. Open the Vite URL shown in the terminal.

Application history and uploaded resume text are stored in the backend `data` directory. Use persistent storage for deployments; ephemeral hosting may reset these files. Do not commit `.env`, resume files, or application data.

## Review-first rules
- The app discovers jobs and ranks them with transparent keyword heuristics. Scores are estimates, not guarantees.
- Add jobs to the review queue before applying.
- The app opens employer listings; you review and submit the application yourself.
- It requires confirmation before marking a role as Applied.
- Duplicate checks use normalized job URL and company/title.
- Unknown personal, legal, work authorization, sponsorship, notice-period, and demographic questions require manual answers.
- Never commit API keys or other secrets. If credentials were previously committed, rotate them.

## Current limitations
- Job search currently uses Adzuna's India endpoint and requires credentials.
- Salary filters are guidance: undisclosed or differently formatted salaries must be checked on the employer site.
- The daily target is a shortlist goal, not a guarantee of 15 suitable live vacancies every day.
- This project does not auto-submit applications, bypass captchas, or automate restricted job-board activity.
