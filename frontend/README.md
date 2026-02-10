# AI-Powered Job Tracker

A smart job tracking dashboard featuring an **AI Assistant** that can filter jobs via natural language, automatic **Resume Parsing**, and intelligent **Match Scoring**.

![AI Job Tracker Dashboard](https://via.placeholder.com/800x400.png?text=AI+Job+Tracker+Dashboard)

## 🚀 Key Features
1.  **AI-Powered Job Matching**: Upload a PDF resume, and the system automatically scores jobs (0-100%) based on skill relevance.
2.  **Conversational AI Assistant**:
    * *User:* "Show me Remote jobs"
    * *AI:* Automatically updates the UI filters to show only Remote roles.
3.  **Smart Application Tracking**: Tracks application history locally and prevents duplicate applications.
4.  **Modern UI**: Glassmorphism design with responsive grid layouts.

## 🛠 Tech Stack
- **Frontend:** React + Vite
- **Backend:** Node.js + Fastify
- **AI Integration:** OpenAI (GPT-3.5) / Simulation Mode
- **Styling:** CSS3 (Glassmorphism)

## 🏗 Architecture

[User] -> [React Frontend]
             |
             v
      [Fastify Backend]
       /           \
[Resume Parser]   [AI Logic Module]
(pdf-parse)       (Intent Detection)
       |               |
[Text Extraction] [Filter Action JSON]

## 🔧 Setup Instructions

### 1. Clone & Install
```bash
git clone [https://github.com/YOUR_USERNAME/ai-job-tracker.git](https://github.com/YOUR_USERNAME/ai-job-tracker.git)
cd ai-job-tracker