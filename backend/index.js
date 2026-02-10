import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import * as pdfParse from "pdf-parse"; // The fix we applied earlier
import dotenv from "dotenv";
import { chatWithAI } from "./aiAssistant.js";

dotenv.config();

const fastify = Fastify({ logger: true });

// Register Plugins
await fastify.register(cors, { origin: "*" });
await fastify.register(multipart);

// --- MOCK DATABASE (Expanded for Demo) ---
const jobs = [
    { id: 1, title: "Frontend Developer", company: "TechCorp", location: "Remote", description: "React, Redux, Tailwind CSS expert needed.", matchScore: 92 },
    { id: 2, title: "Node.js Backend Engineer", company: "Serverless Inc", location: "Bangalore", description: "Node, Fastify, PostgreSQL, Microservices.", matchScore: 88 },
    { id: 3, title: "AI/ML Engineer", company: "Future AI", location: "Hyderabad", description: "Python, TensorFlow, PyTorch, LangChain.", matchScore: 75 },
    { id: 4, title: "Product Designer", company: "Creative Studio", location: "Mumbai", description: "Figma, UI/UX, User Research.", matchScore: 45 },
    { id: 5, title: "Full Stack Developer", company: "Startup Hub", location: "Remote", description: "MERN Stack, AWS, Docker.", matchScore: 85 },
    { id: 6, title: "DevOps Engineer", company: "Cloud Systems", location: "Delhi", description: "Kubernetes, Jenkins, CI/CD pipelines.", matchScore: 60 },
    { id: 7, title: "React Native Developer", company: "AppWorks", location: "Bangalore", description: "Mobile app development for iOS and Android.", matchScore: 90 },
    { id: 8, title: "Data Scientist", company: "DataFlow", location: "Pune", description: "Pandas, SQL, Machine Learning models.", matchScore: 78 },
];

// --- ROUTES ---

// 1. Get All Jobs
fastify.get("/jobs", async () => jobs);

// 2. Resume Upload (Mock Logic for Speed)
fastify.post("/upload-resume", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No file uploaded" });

    // In a real app, we parse the PDF here. 
    // For the demo, we return the jobs sorted by match score to simulate AI analysis.
    const sortedJobs = [...jobs].sort((a, b) => b.matchScore - a.matchScore);

    return {
        success: true,
        message: "Resume analyzed successfully",
        jobs: sortedJobs
    };
});

// 3. AI Chat Endpoint
fastify.post("/chat", async (req, reply) => {
    const { message } = req.body;
    if (!message) return reply.status(400).send({ error: "Message required" });

    try {
        const aiResponse = await chatWithAI(message);

        // Check if it's a JSON action (Filter Command)
        try {
            const parsedAction = JSON.parse(aiResponse);
            if (parsedAction.type === "FILTER_ACTION") {
                return {
                    success: true,
                    message: parsedAction.reply,
                    action: parsedAction.criteria
                };
            }
        } catch (e) {
            // Not JSON, just normal text
        }

        return { success: true, message: aiResponse };

    } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: "Chat failed" });
    }
});

// --- START SERVER ---
try {
    await fastify.listen({ port: 3001 });
    console.log("Server running on http://localhost:3001");
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}