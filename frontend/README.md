# AI-Powered Job Tracker 🚀

## 📋 Project Overview
A Full-Stack Intelligent Job Search Application that aggregates real-time job listings and uses AI to personalize the candidate experience through resume matching and a conversational assistant.

**Live URL:** https://ai-job-tracker-woad.vercel.app/

## 🏗 Architecture & Design Decisions
[Frontend: React/Vite] <--> [Backend: Fastify/Node.js] <--> [AI Logic: LangChain]

### 1. Adzuna Integration
The application fetches live tech job listings from the Adzuna API, replacing static mock data with real-world opportunities from the Indian market.

### 2. Resume Parsing Engine
Integrated `pdf-parse` to extract unstructured text from user-uploaded PDF resumes, enabling the system to understand candidate profiles without manual data entry.

### 3. AI Job Matching with LangChain
Implemented a Hybrid Matching Strategy:
- **Primary Logic:** Uses LangChain's `RunnableSequence` to compare resume text against job descriptions.
- **Scoring:** Generates a 0-100 Match Score based on skill overlap and semantic relevance.
- **Design:** The system handles large text blocks by truncating inputs to ensure API performance and cost efficiency.

### 4. AI Assistant with LangGraph Architecture
The AI Assistant uses a state-driven approach to detect user intent. 
- **Intent Detection:** Recognizes when a user wants to filter jobs (e.g., "remote", "java", "python").
- **Action Routing:** The backend returns structured JSON instructions to the frontend to update UI filters in real-time.

## 🔧 Setup & Installation
1. **Backend:** `cd backend && npm install && node index.js`
2. **Frontend:** `cd frontend && npm install && npm run dev`