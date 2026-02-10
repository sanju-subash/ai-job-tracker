import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";

import { ChatOpenAI } from "@langchain/openai";

dotenv.config();

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: "*" });

/* ---------- AI MODEL ---------- */
const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
});

/* ---------- MOCK JOB DATA ---------- */
const jobs = [
    {
        id: 1,
        title: "React Developer",
        company: "TechCorp",
        location: "Remote",
        description: "React, JavaScript, frontend development",
    },
    {
        id: 2,
        title: "Node Developer",
        company: "Backend Ltd",
        location: "Bangalore",
        description: "Node.js, APIs, backend systems",
    },
];

/* ---------- ROUTES ---------- */
fastify.get("/", async () => {
    return { status: "Backend running" };
});

fastify.get("/jobs", async () => {
    const resumeText = `
Skills:
- React
- JavaScript
- Node.js
- HTML
- CSS

Looking for frontend or full-stack internship roles.
`;

    const results = [];

    for (const job of jobs) {
        const prompt = `
Resume:
${resumeText}

Job Description:
${job.description}

Give a match score from 0 to 100.
Reply with ONLY a number.
`;

        try {
            const response = await model.invoke(prompt);

            const score = parseInt(response.content) || 50;

            results.push({
                ...job,
                matchScore: score,
            });
        } catch (err) {
            results.push({
                ...job,
                matchScore: 50,
            });
        }
    }

    return results;
});

/* ---------- START SERVER ---------- */
try {
    await fastify.listen({ port: 3001, host: "0.0.0.0" });
    console.log("Server running on http://localhost:3001");
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}
