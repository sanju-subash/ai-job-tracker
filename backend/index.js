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
  const titleLower = title.toLowerCase();
  const text = (title + " " + description).toLowerCase();
  const skills = ["python", "fastapi", "flask", "mongodb", "postgresql", "react", "n8n", "vapi", "gemini", "webhook", "api integration", "sql", "rest api", "machine learning"];
  const matchedSkills = skills.filter(skill => text.includes(skill));
  const resumeTerms = resumeText.toLowerCase().split(/[^a-z0-9+#.]+/).filter(term => term.length >= 4);
  const resumeMatches = [...new Set(resumeTerms)].filter(term => text.includes(term)).slice(0, 12);
  const roleGroups = [
    { label: "Python/backend", re: /python|backend|back.end|fastapi|flask|api developer/ },
    { label: "Software engineering", re: /software engineer|software developer|application developer|full.stack|web developer/ },
    { label: "AI/ML integration", re: /ai engineer|machine learning|ml engineer|llm|generative ai|ai integration/ },
    { label: "Automation/integration", re: /automation engineer|integration engineer|workflow automation|rpa developer/ },
    { label: "Data", re: /data analyst|junior data scientist|data engineer/ },
  ];
  const roleHits = roleGroups.filter(group => group.re.test(titleLower));
  const earlyCareer = /junior|entry.level|graduate|fresher|associate|trainee|early career|intern|new grad|0.?1 year|1.?2 years/.test(text);
  const seniorRole = /\b(senior|sr\.?|staff|principal|lead|manager|director|architect|head of)\b/.test(titleLower)
    || /\b(5\+|6\+|7\+|8\+|10\+)\s*years?/.test(text);
  const targetRole = roleHits.length > 0;
  const remote = /remote|work from home|\bwfh\b/.test((location + " " + description).toLowerCase());
  let score = (targetRole ? 25 : 0)
    + Math.min(30, matchedSkills.length * 5)
    + Math.min(20, resumeMatches.length * 2)
    + (earlyCareer ? 20 : 0)
    + (remote ? 5 : 0);
  if (seniorRole) score -= 45;
  if (!targetRole) score -= 25;
  return {
    id: String(job.id || job.redirect_url || title + company), title, company, location, description,
    url: job.redirect_url || job.url || "", posted: job.created || null, source: "Adzuna", sourceQuery: queryLabel,
    targetRole, roleCategories: roleHits.map(group => group.label), earlyCareer, seniorRole, remote,
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
    ["junior python developer fresher", "Bengaluru", "Bengaluru junior Python"],
    ["entry level backend developer graduate", "Bengaluru", "Bengaluru entry-level backend"],
    ["graduate software engineer trainee", "Bengaluru", "Bengaluru graduate software"],
    ["junior AI automation integration engineer", "Bengaluru", "Bengaluru junior AI/automation"],
    ["remote junior python developer fresher", "India", "Remote junior Python"],
    ["remote entry level software engineer", "India", "Remote entry-level software"],
  ];
  const results = await Promise.allSettled(queries.map(async ([what, where, label]) => {
    const response = await axios.get("https://api.adzuna.com/v1/api/jobs/in/search/1", {
      timeout: 12000,
      params: { app_id: appId, app_key: appKey, results_per_page: 20, what, where, "content-type": "application/json", sort_by: "date" },
    });
    return (response.data.results || []).map(job => jobShape(job, label));
  }));
  const failed = results.filter(r => r.status === "rejected");
  for (const result of failed) {
    const error = result.reason;
    request.log.warn({
      provider: "Adzuna",
      status: error?.response?.status || null,
      code: error?.code || null,
      message: error?.response?.data?.exception || error?.response?.data?.error || error?.message || "Unknown provider error",
    }, "Adzuna search request failed");
  }
  const successful = results.filter(r => r.status === "fulfilled");
  const providerJobs = successful.flatMap(r => r.value);
  if (!successful.length) {
    return reply.code(502).send({
      error: "All job-provider requests failed. Check the Adzuna credentials and API quota in Render logs.",
      failedRequests: failed.length,
    });
  }
  let jobsToFilter = providerJobs;
  let fallbackUsed = false;
  if (!jobsToFilter.length) {
    // Adzuna can return an empty batch for highly specific queries even when broader searches have listings.
    const fallbackQueries = [
      ["software developer", "Bengaluru", "Fallback Bengaluru software developer"],
      ["python developer", "Bengaluru", "Fallback Bengaluru Python developer"],
      ["software engineer", "Bangalore", "Fallback Bangalore software engineer"],
      ["backend developer", "Bangalore", "Fallback Bangalore backend developer"],
      ["graduate software jobs", "India", "Fallback graduate software jobs"],
      ["remote software developer", "India", "Fallback remote software developer"],
    ];
    const fallbackResults = await Promise.allSettled(fallbackQueries.map(async ([what, where, label]) => {
      const response = await axios.get("https://api.adzuna.com/v1/api/jobs/in/search/1", {
        timeout: 12000,
        params: { app_id: appId, app_key: appKey, results_per_page: 30, what, where, "content-type": "application/json", sort_by: "date" },
      });
      const items = (response.data.results || []).map(job => jobShape(job, label));
      request.log.info({ query: what, location: where, count: items.length }, "Adzuna fallback search completed");
      return items;
    }));
    const fallbackSuccessful = fallbackResults.filter(r => r.status === "fulfilled");
    jobsToFilter = fallbackSuccessful.flatMap(r => r.value);
    fallbackUsed = true;
    for (const result of fallbackResults.filter(r => r.status === "rejected")) {
      const error = result.reason;
      request.log.warn({
        provider: "Adzuna fallback",
        status: error?.response?.status || null,
        code: error?.code || null,
        message: error?.response?.data?.exception || error?.response?.data?.error || error?.message || "Unknown provider error",
      }, "Adzuna fallback search request failed");
    }
    if (!fallbackSuccessful.length) {
      return reply.code(502).send({ error: "Adzuna searches failed. Check Render logs for provider details.", failedRequests: fallbackResults.length });
    }
    if (!jobsToFilter.length) {
      return { jobs: [], total: 0, dailyTarget: 15, note: "Adzuna returned no listings for the targeted or broader searches. Check the Adzuna account's country coverage and search quota, then retry." };
    }
  }
  const found = jobsToFilter.filter(job => job.targetRole && !job.seniorRole);
  if (!found.length) return { jobs: [], total: 0, dailyTarget: 15, note: "No clearly relevant early-career target roles were found in this provider batch. Try again later; senior/leadership and unrelated roles are intentionally excluded." };
  const unique = [];
  const seen = new Set();
  for (const job of found) {
    const key = String(job.url || (job.title + "|" + job.company)).split("#")[0].split("?")[0].replace(/\/$/, "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key); unique.push(job);
  }
  unique.sort((a, b) => b.matchScore - a.matchScore || String(b.posted || "").localeCompare(String(a.posted || "")));
  return { jobs: unique, total: unique.length, dailyTarget: 15, fallbackUsed, note: "Only target-role titles without clear senior/leadership signals are shown. Scores are keyword heuristics, not guarantees; verify seniority, location and compensation on the employer page." };
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
