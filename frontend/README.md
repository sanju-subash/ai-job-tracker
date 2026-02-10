# AI-Powered Job Tracker with Smart Matching

This project is a full-stack web application that helps users track job applications and view AI-based job–resume match scores. It was built as part of an internship evaluation assignment.

---

## 🚀 Features

- Job listings dashboard
- AI-generated match score for each job
- Resume–job matching using LangChain + OpenAI
- Apply button with confirmation flow
- Applied jobs tracking
- Persistent state using localStorage
- Clean frontend–backend separation

---

## 🧱 Tech Stack

### Frontend
- React (Vite)
- JavaScript
- Browser localStorage

### Backend
- Node.js
- Fastify
- LangChain
- OpenAI API

---

## 🧠 AI Matching Logic

- Resume text is provided (hardcoded for demo purposes)
- Job descriptions are compared against resume content
- LangChain with OpenAI generates a match score (0–100)
- The score is returned via backend API and displayed in UI

This approach demonstrates AI orchestration and integration rather than perfect accuracy.

---

## 📁 Project Structure

ai-job-tracker/
├── frontend/     # React frontend
└── backend/      # Fastify backend with AI logic
