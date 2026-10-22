import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const STATUSES = ["ready_for_review", "applied", "assessment", "interview", "rejected", "offer", "withdrawn", "follow_up"];
const STATUS_LABELS = {
  ready_for_review: "Ready for review", applied: "Applied", assessment: "Assessment",
  interview: "Interview", rejected: "Rejected", offer: "Offer", withdrawn: "Withdrawn", follow_up: "Follow-up",
};

async function request(path, options = {}) {
  const response = await fetch(API + path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || "Request failed");
  return data;
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resumeMessage, setResumeMessage] = useState("");
  const [answerQuestion, setAnswerQuestion] = useState("");
  const [answerResult, setAnswerResult] = useState(null);
  const [answerBusy, setAnswerBusy] = useState(false);
  const [tab, setTab] = useState("jobs");

  async function loadApplications() {
    const data = await request("/applications");
    setApplications(data.applications || []);
  }
  async function loadJobs() {
    setLoadingJobs(true); setError(""); setNotice("");
    try {
      const data = await request("/jobs");
      setJobs(data.jobs || []);
      setNotice(`Loaded ${(data.jobs || []).length} job listings. Check each employer page before applying.`);
    } catch (e) { setError(e.message); }
    finally { setLoadingJobs(false); }
  }
  useEffect(() => { loadApplications().catch(e => setError(e.message)); }, []);

  const trackedKeys = useMemo(() => new Set(applications.map(a => `${String(a.title).toLowerCase().trim()}|${String(a.company).toLowerCase().trim()}`)), [applications]);
  const filteredJobs = jobs.filter(job => {
    const term = search.toLowerCase();
    return [job.title, job.company, job.location, job.description].some(x => String(x || "").toLowerCase().includes(term));
  });
  const filteredApplications = applications.filter(a => statusFilter === "all" || a.status === statusFilter);

  async function saveForReview(job) {
    setBusy(job.id); setError(""); setNotice("");
    try {
      await request("/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(job) });
      await loadApplications();
      setNotice("Added to your review queue. No application was submitted.");
    } catch (e) {
      if (e.message.includes("Duplicate")) setNotice("This job appears to be tracked already.");
      else setError(e.message);
    } finally { setBusy(""); }
  }

  async function updateStatus(app, status) {
    setBusy(app.id); setError(""); setNotice("");
    try {
      let confirmed = false;
      if (status === "applied") {
        confirmed = window.confirm(`Did you personally submit the application for "${app.title}" at ${app.company} on the employer's website?`);
        if (!confirmed) return;
      }
      await request(`/applications/${encodeURIComponent(app.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, confirmed }),
      });
      await loadApplications();
      setNotice(status === "applied" ? "Marked as applied after your confirmation." : "Application status updated.");
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  }

  async function draftAnswer(event) {
    event.preventDefault();
    if (!answerQuestion.trim()) return;
    setAnswerBusy(true); setAnswerResult(null); setError("");
    try {
      const data = await request("/application-answers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: answerQuestion }) });
      setAnswerResult(data);
    } catch (e) { setError(e.message); }
    finally { setAnswerBusy(false); }
  }

  async function uploadResume(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData(); form.append("file", file);
    setResumeMessage("Reading resume…"); setError("");
    try {
      const data = await request("/upload-resume", { method: "POST", body: form });
      setResumeMessage(data.message || "Resume processed.");
    } catch (e) { setError(e.message); setResumeMessage(""); }
    event.target.value = "";
  }

  const countByStatus = (status) => applications.filter(a => a.status === status).length;

  return (
    <main className="page">
      <div className="container">
        <header className="header glass">
          <div className="header-info">
            <p className="eyebrow">PERSONAL CAREER WORKSPACE</p>
            <h1>AI Job Tracker</h1>
            <p>Find relevant jobs. Review every application. Keep your history in one place.</p>
          </div>
          <div className="header-actions">
            <label className="upload-btn">Upload resume<input type="file" accept=".pdf" onChange={uploadResume} hidden /></label>
            <button className="primary-btn" onClick={loadJobs} disabled={loadingJobs}>{loadingJobs ? "Searching…" : "Find jobs"}</button>
          </div>
        </header>

        <section className="settings-strip glass">
          <div><span>Salary target</span><strong>₹5–8 LPA</strong></div>
          <div><span>Locations</span><strong>Electronic City · Remote India</strong></div>
          <div><span>Daily shortlist goal</span><strong>15 opportunities</strong></div>
          <div><span>Submission mode</span><strong>Review first</strong></div>
        </section>

        {error && <div className="notice error" role="alert">{error}</div>}
        {notice && <div className="notice" role="status">{notice}</div>}
        {resumeMessage && <div className="notice" role="status">{resumeMessage}</div>}

        <section className="stats">
          <div className="stat glass"><span>In review queue</span><strong>{countByStatus("ready_for_review")}</strong></div>
          <div className="stat glass"><span>Applied</span><strong>{countByStatus("applied")}</strong></div>
          <div className="stat glass"><span>Interviews</span><strong>{countByStatus("interview")}</strong></div>
          <div className="stat glass"><span>Offers</span><strong>{countByStatus("offer")}</strong></div>
        </section>

        <nav className="tabs" aria-label="Workspace views">
          <button className={tab === "jobs" ? "active" : ""} onClick={() => setTab("jobs")}>Discover jobs</button>
          <button className={tab === "applications" ? "active" : ""} onClick={() => setTab("applications")}>My applications ({applications.length})</button>
        </nav>

        {tab === "jobs" && <>
          <div className="section-heading">
            <div><h2>Relevant opportunities</h2><p>Python backend · Software engineering · AI integration · Automation</p></div>
            <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, company, skills…" aria-label="Search jobs" />
          </div>
          {!jobs.length && <div className="empty glass"><h3>Ready to find your next role?</h3><p>Connect the job provider credentials to the backend, then search for fresh listings. This app does not create fake fallback jobs.</p><button className="primary-btn" onClick={loadJobs} disabled={loadingJobs}>{loadingJobs ? "Searching…" : "Search jobs"}</button></div>}
          <div className="grid-container">
            {filteredJobs.map(job => {
              const key = `${String(job.title).toLowerCase().trim()}|${String(job.company).toLowerCase().trim()}`;
              const tracked = trackedKeys.has(key);
              return <article className="job-card glass" key={job.id}>
                <div className="card-top"><span className="match-tag">{job.matchScore ?? "—"}% keyword fit</span><span className="source-tag">{job.source || "Job board"}</span></div>
                <h3>{job.title}</h3><p className="company">{job.company}</p>
                <p className="location">⌖ {job.location}</p>
                <p className="description">{String(job.description || "").slice(0, 240)}{String(job.description || "").length > 240 ? "…" : ""}</p>
                <p className="salary-note">{job.salaryNote || "Confirm salary and pay period on employer page."}</p>
                <div className="card-actions">
                  {job.url && <a className="secondary-btn" href={job.url} target="_blank" rel="noreferrer">View employer listing ↗</a>}
                  <button className="primary-btn" disabled={tracked || busy === job.id} onClick={() => saveForReview(job)}>{tracked ? "Already tracked" : busy === job.id ? "Saving…" : "Add to review queue"}</button>
                </div>
              </article>;
            })}
          </div>
          {jobs.length > 0 && filteredJobs.length === 0 && <p className="empty-text">No matching jobs. Try a broader search.</p>}
        </>}

        {tab === "applications" && <>
          <div className="section-heading">
            <div><h2>Application tracker</h2><p>Only mark a role as applied after you submit it yourself.</p></div>
            <select className="search-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="all">All statuses</option>{STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <section className="answer-helper glass">\n            <h3>Application answer helper</h3>\n            <p>Draft from verified profile facts. Review and edit every answer before using it.</p>\n            <form className="answer-form" onSubmit={draftAnswer}>\n              <input value={answerQuestion} onChange={e => setAnswerQuestion(e.target.value)} placeholder="Paste an application question…" aria-label="Application question" />\n              <button className="primary-btn" disabled={answerBusy || !answerQuestion.trim()}>{answerBusy ? "Preparing…" : "Prepare answer"}</button>\n            </form>\n            {answerResult && <div className="answer-result"><strong>{answerResult.status === "draft" ? "Draft — review before using" : "Manual answer required"}</strong><p>{answerResult.answer || answerResult.reason}</p>{answerResult.reason && answerResult.answer && <small>{answerResult.reason}</small>}</div>}\n          </section>\n          <div className="application-list">
            {filteredApplications.map(app => <article className="application-row glass" key={app.id}>
              <div className="application-info"><h3>{app.title}</h3><p>{app.company} · {app.location}</p><small>Added {new Date(app.createdAt).toLocaleDateString()}</small>{app.url && <p><a href={app.url} target="_blank" rel="noreferrer">Open application page ↗</a></p>}</div>
              <div className="application-controls"><span className="status-pill">{STATUS_LABELS[app.status] || app.status}</span><label className="status-label">Update status<select value={app.status} disabled={busy === app.id} onChange={e => updateStatus(app, e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></label></div>
            </article>)}
            {!filteredApplications.length && <div className="empty glass"><h3>No applications here yet</h3><p>Find jobs and add relevant ones to your review queue. You remain in control of every submission.</p><button className="primary-btn" onClick={() => setTab("jobs")}>Discover jobs</button></div>}
          </div>
        </>}
        <footer><span>Review-first workflow</span><span>Match scores are estimates, not guarantees. Always verify details on the employer site.</span></footer>
      </div>
    </main>
  );
}
