import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import axios from "axios";
import dotenv from "dotenv";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createApplicationStore } from "./application-store.js";
import { duplicateExists, validateStatus } from "./workflow-helpers.js";
import { prepareAnswer } from "./application-answers.js";

dotenv.config();
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
const app = Fastify({ logger: true });
const store = createApplicationStore();
const statuses = ["saved", "ready_for_review", "applied", "assessment", "interview", "rejected", "offer", "withdrawn", "follow_up"];
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const resumePath = path.join(dataDir, "resume.txt");
let resumeText = "";
try { resumeText = await readFile(resumePath, "utf8"); } catch { /* no resume uploaded yet */ }

await app.register(cors, {
  origin: process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(",").map(s => s.trim()) : true,
});
await app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024 } });

function jobShape(job, queryLabel) {
  const title = job.title || "Untitled role";
  const company = job.company?.display_name || "Company not listed";
  const location = job.location?.display_name || "Not specified";
  const description = job.description || "";
  const text = (title + " " + description).toLowerCase();
  const skills = ["python", "fastapi", "flask", "mongodb", "postgresql", "react", "n8n", "vapi", "gemini", "webhook", "api integration"];
  const matchedSkills = skills.filter(skill => text.includes(skill));
  const resumeTerms = resumeText.toLowerCase().split(/[^a-z0-9+#.]+/).filter(term => term.length >= 4);
  const resumeMatches = [...new Set(resumeTerms)].filter(term => text.includes(term)).slice(0, 12);
  const titleTerms = ["python", "backend", "software engineer", "software developer", "ai engineer", "automation", "integration"];
  const roleHits = titleTerms.filter(term => title.toLowerCase().includes(term));
  let score = Math.min(30, matchedSkills.length * 5) + Math.min(35, roleHits.length * 12) + Math.min(20, resumeMatches.length * 2);
  if (/junior|entry.level|graduate|fresher|associate|trainee|early career|0.?1 year/.test(text)) score += 15;
  if (/remote|work from home|wfh/.test((location + " " + description).toLowerCase())) score += 10;
  if (/senior|staff engineer|principal|lead engineer|manager|director|5\+ years|7\+ years/.test((title + " " + description.slice(0, 1000)).toLowerCase())) score -= 25;
  return {
    id: String(job.id || job.redirect_url || title + company), title, company, location, description,
    url: job.redirect_url || job.url || "", posted: job.created || null, source: "Adzuna", sourceQuery: queryLabel,
    matchScore: Math.max(0, Math.min(100, score)), matchedSkills, resumeMatches,
    salaryMin: job.salary_min || null, salaryMax: job.salary_max || null,
    salaryNote: job.salary_min || job.salary_max ? "Verify salary amount and pay period on employer page." : "Salary not disclosed; confirm the role fits your ₹5–8 LPA target.",
  };
}

app.get("/health", async () => ({ ok: true, service: "ai-job-tracker-api", storage: "json-file" }));
app.get("/profile", async () => ({
  targetSalaryLpa: { min: 5, max: 8 },
  targetLocations: ["Electronic City, Bengaluru", "Remote, India"],
  dailyTarget: 15,
  priorityRoles: ["Python backend", "Software engineering", "AI integration", "Automation"],
  submissionMode: "review_only",
}));

app.get("/jobs", async (request, reply) => {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return reply.code(503).send({ error: "Job search is not configured. Add ADZUNA_APP_ID and ADZUNA_APP_KEY to backend environment variables. No sample jobs are returned." });
  const queries = [
    ["Python backend developer junior", "Bangalore", "Bengaluru Python/backend"],
    ["software engineer graduate entry level", "Bangalore", "Bengaluru early-career software"],
    ["AI integration automation engineer", "Bangalore", "Bengaluru AI/automation"],
    ["remote Python backend developer", "India", "Remote Python/backend"],
    ["remote AI automation integration engineer", "India", "Remote AI/automation"],
  ];
  const results = await Promise.allSettled(queries.map(async ([what, where, label]) => {
    const response = await axios.get("https://api.adzuna.com/v1/api/jobs/in/search/1", {
      timeout: 12000,
      params: { app_id: appId, app_key: appKey, results_per_page: 20, what, where, "content-type": "application/json", sort_by: "date" },
    });
    return (response.data.results || []).map(job => jobShape(job, label));
  }));
  const found = results.filter(r => r.status === "fulfilled").flatMap(r => r.value);
  if (!found.length) return reply.code(502).send({ error: "Job provider did not return results. Check credentials or retry later." });
  const unique = [];
  const seen = new Set();
  for (const job of found) {
    const key = String(job.url || (job.title + "|" + job.company)).split("#")[0].split("?")[0].replace(/\/$/, "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key); unique.push(job);
  }
  unique.sort((a, b) => b.matchScore - a.matchScore || String(b.posted || "").localeCompare(String(a.posted || "")));
  return { jobs: unique, total: unique.length, dailyTarget: 15, note: "Match scores are keyword heuristics, not guarantees. Verify seniority, location and compensation on the employer page." };
});

app.post("/upload-resume", async (request, reply) => {
  const file = await request.file();
  if (!file) return reply.code(400).send({ success: false, message: "Choose a PDF resume." });
  if (!/\.pdf$/i.test(file.filename || "")) return reply.code(400).send({ success: false, message: "Only PDF resumes are supported." });
  try {
    const result = await pdf(await file.toBuffer());
    const text = String(result.text || "").trim();
    if (!text) return reply.code(422).send({ success: false, message: "No readable text was found in the PDF." });
    await mkdir(dataDir, { recursive: true });
    await writeFile(resumePath, text, "utf8");
    resumeText = text;
    return { success: true, message: "Resume saved locally and will influence future job match scores.", characters: text.length };
  } catch (error) {
    request.log.error(error);
    return reply.code(422).send({ success: false, message: "Could not parse this PDF. Export a text-based PDF and try again." });
  }
});

app.get("/applications", async () => {
  const applications = await store.all();
  return { applications, total: applications.length };
});

app.post("/applications", async (request, reply) => {
  const body = request.body || {};
  if (!body.title || !body.company || !body.url) return reply.code(400).send({ error: "Job title, company and URL are required." });
  const applications = await store.all();
  if (duplicateExists(applications, body)) return reply.code(409).send({ error: "Duplicate role already in your tracker." });
  const application = {
    id: randomUUID(), jobId: String(body.id || body.jobId || ""),
    title: String(body.title).slice(0, 300), company: String(body.company).slice(0, 300),
    location: String(body.location || "Not specified").slice(0, 300), url: String(body.url).slice(0, 2000),
    source: String(body.source || "Manual").slice(0, 100),
    matchScore: Number.isFinite(Number(body.matchScore)) ? Number(body.matchScore) : null,
    salaryNote: String(body.salaryNote || "Verify compensation on employer site."),
    status: "ready_for_review", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    appliedAt: null, notes: "",
  };
  applications.unshift(application);
  await store.save(applications);
  return reply.code(201).send({ application });
});

app.patch("/applications/:id", async (request, reply) => {
  const body = request.body || {};
  const check = validateStatus(body.status, body.confirmed === true);
  if (!check.ok) return reply.code(400).send({ error: check.reason });
  const applications = await store.all();
  const index = applications.findIndex(item => item.id === request.params.id);
  if (index < 0) return reply.code(404).send({ error: "Application not found." });
  applications[index] = {
    ...applications[index], status: body.status,
    notes: body.notes === undefined ? applications[index].notes : String(body.notes).slice(0, 4000),
    updatedAt: new Date().toISOString(),
    appliedAt: body.status === "applied" ? (applications[index].appliedAt || new Date().toISOString()) : applications[index].appliedAt,
  };
  await store.save(applications);
  return { application: applications[index] };
});

app.delete("/applications/:id", async (request, reply) => {
  const applications = await store.all();
  const next = applications.filter(item => item.id !== request.params.id);
  if (next.length === applications.length) return reply.code(404).send({ error: "Application not found." });
  await store.save(next);
  return { success: true, total: next.length };
});

app.post("/application-answers", async request => {
  return prepareAnswer(request.body?.question || "");
});

app.get("/application-statuses", async () => ({ statuses }));
await app.listen({ port: Number(process.env.PORT || 3001), host: "0.0.0.0" });
