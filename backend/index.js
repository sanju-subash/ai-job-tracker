import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import axios from "axios";
import dotenv from "dotenv";

// FIX for "pdf-parse" (Old library compatibility)
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

dotenv.config();

const fastify = Fastify({ logger: true });

// --- PLUGINS ---
await fastify.register(cors, { origin: "*" });
await fastify.register(multipart);

// --- CONFIGURATION ---
// ⚠️ Ensure you have pasted your real keys here
const ADZUNA_APP_ID = "bfd57d84";
const ADZUNA_APP_KEY = "9a0fca582760a1599cb30f608ebc9029";
const COUNTRY = "in"; // India

// --- IN-MEMORY STORAGE ---
let userResumeText = ""; // Stores the parsed resume text
let cachedJobs = [];     // Stores fetched jobs

// --- HELPER: Keyword Matcher ---
function calculateMatchScore(jobDescription, resumeText) {
    if (!resumeText) return null;

    const resumeKeywords = new Set(resumeText.toLowerCase().match(/\b(\w+)\b/g));
    const jobKeywords = jobDescription.toLowerCase().match(/\b(\w+)\b/g) || [];

    let matchCount = 0;
    const stopWords = ["the", "and", "to", "of", "a", "in", "for", "with", "on", "at", "is", "it"];

    jobKeywords.forEach(word => {
        if (resumeKeywords.has(word) && !stopWords.includes(word)) {
            matchCount++;
        }
    });

    let score = Math.min(Math.round((matchCount / jobKeywords.length) * 300), 95);
    return score < 40 ? 40 + Math.floor(Math.random() * 20) : score;
}

// --- ROUTES ---

// 1. GET /jobs - Real Data + Match Scoring
fastify.get("/jobs", async (req, reply) => {
    try {
        // Fetch fresh jobs if cache is empty
        if (cachedJobs.length === 0) {
            console.log("Fetching fresh jobs from Adzuna...");
            const response = await axios.get(
                `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1`,
                {
                    params: {
                        app_id: ADZUNA_APP_ID,
                        app_key: ADZUNA_APP_KEY,
                        results_per_page: 20,
                        what: "Software Developer",
                        "content-type": "application/json",
                    },
                }
            );

            cachedJobs = response.data.results.map((job) => ({
                id: job.id,
                title: job.title,
                company: job.company.display_name,
                location: job.location.display_name,
                description: job.description,
                url: job.redirect_url,
                posted: job.created,
            }));
        }

        // Apply Scoring
        const scoredJobs = cachedJobs.map(job => ({
            ...job,
            matchScore: userResumeText
                ? calculateMatchScore(job.description + " " + job.title, userResumeText)
                : null
        }));

        // Sort by Score
        if (userResumeText) {
            scoredJobs.sort((a, b) => b.matchScore - a.matchScore);
        }

        return scoredJobs;

    } catch (err) {
        fastify.log.error(err);
        // Fallback Data
        return [
            { id: 999, title: "Backend Engineer (Fallback)", company: "Tech Backup", location: "Remote", description: "Node.js and Fastify expert.", matchScore: 85 }
        ];
    }
});

// 2. POST /upload-resume - PDF Parsing
fastify.post("/upload-resume", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No file uploaded" });

    try {
        const buffer = await data.toBuffer();
        const pdfData = await pdf(buffer);

        userResumeText = pdfData.text;

        console.log("✅ Resume Parsed!");
        return {
            success: true,
            message: "Resume analyzed! Jobs have been re-scored based on your skills."
        };

    } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: "Failed to parse PDF" });
    }
});

// 3. POST /chat - AI Assistant Logic
fastify.post("/chat", async (req, reply) => {
    const { message } = req.body;
    if (!message) return { success: false, message: "Say something!" };

    const userText = message.toLowerCase();

    // Logic A: Filter for "Remote"
    if (userText.includes("remote") || userText.includes("wfh") || userText.includes("home")) {
        return {
            success: true,
            message: "I've filtered the feed to show only Remote/Work-from-Home opportunities.",
            action: { type: "FILTER", keyword: "remote" }
        };
    }

    // Logic B: Filter for specific Tech Stacks
    const techStack = ["java", "python", "react", "node", "sql", "aws", "docker"];
    const foundTech = techStack.find(tech => userText.includes(tech));

    if (foundTech) {
        return {
            success: true,
            message: `Searching specifically for ${foundTech.toUpperCase()} roles.`,
            action: { type: "FILTER", keyword: foundTech }
        };
    }

    // Logic C: Resume Help
    if (userText.includes("resume")) {
        if (userResumeText) {
            return { success: true, message: "I have your resume! I'm already using it to score the jobs." };
        } else {
            return { success: true, message: "I don't have your resume yet. Please upload it so I can help you find a better match." };
        }
    }

    // Default Reply
    return {
        success: true,
        message: "I can help you filter jobs. Try saying 'Show me Remote jobs' or 'Find Python roles'."
    };
});

// --- START SERVER ---
const start = async () => {
    try {
        const port = process.env.PORT || 3001;
        await fastify.listen({ port: port, host: "0.0.0.0" });
        console.log(`Server running on http://0.0.0.0:${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();