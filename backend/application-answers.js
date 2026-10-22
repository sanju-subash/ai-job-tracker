const facts = {
  salaryRange: "₹5–8 LPA, depending on role and overall compensation.",
  graduation: "Expected graduation: May 2027 (Integrated MCA).",
  skills: "Python, FastAPI, Flask, REST APIs, React, MongoDB, PostgreSQL, n8n, Vapi, Gemini AI, WhatsApp Cloud API, webhooks, and AWS fundamentals.",
  currentRole: "I currently work as a Junior Software Engineer – AI/ML at Nimir Corporation, building and integrating AI-powered software and automation workflows. My work involves Python backend APIs, FastAPI, MongoDB, n8n, Vapi, Gemini AI, webhooks, and related integrations.",
};

export function prepareAnswer(question) {
  const q = String(question || "").toLowerCase();
  if (q.includes("salary") || q.includes("compensation")) return { status: "draft", answer: facts.salaryRange, needsReview: true };
  if (q.includes("graduation") || q.includes("graduate")) return { status: "draft", answer: facts.graduation, needsReview: true };
  if (q.includes("skills") || q.includes("technologies")) return { status: "draft", answer: facts.skills, needsReview: true };
  if (q.includes("current role") || q.includes("current experience") || q.includes("what do you do") || q.includes("tell us about yourself") || q.includes("why are you a fit")) {
    return { status: "draft", answer: facts.currentRole, needsReview: true };
  }
  return {
    status: "manual_required",
    answer: "",
    reason: "This fact is not verified in the profile. Answer personally; do not guess work authorization, sponsorship, notice period, salary history, legal declarations, or demographic information.",
  };
}
