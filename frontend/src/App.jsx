import { useEffect, useState } from "react";
import "./App.css";

function App() {
  // --- STATE MANAGEMENT ---
  const [jobs, setJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  
  // Track applied jobs in localStorage
  const [appliedJobs, setAppliedJobs] = useState(() => {
    const saved = localStorage.getItem("appliedJobs");
    return saved ? JSON.parse(saved) : [];
  });

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { sender: "bot", text: "Hi! I can help you find jobs. Try saying 'Show me Remote jobs' or 'Find React roles'." }
  ]);

  // --- EFFECTS ---
  useEffect(() => {
    // Replace with your Render URL when deploying!
    fetch("http://localhost:3001/jobs")
      .then((res) => res.json())
      .then((data) => setJobs(data))
      .catch((err) => console.error("Error fetching jobs:", err));
  }, []);

  // --- HANDLERS ---

  // 1. Resume Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Replace with your Render URL when deploying!
      const response = await fetch("http://localhost:3001/upload-resume", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setJobs(data.jobs); // Update jobs with new AI scores
        alert("Resume analyzed! We've found your best matches.");
      } else {
        setUploadError("Failed to analyze resume.");
      }
    } catch (err) {
      console.error(err);
      setUploadError("Server error. Is the backend running?");
    } finally {
      setIsUploading(false);
    }
  };

  // 2. Apply Handler
  function handleApply(job) {
    if (appliedJobs.some((aj) => aj.id === job.id)) return;

    // Open external link logic (Mock)
    // window.open(job.applyLink, "_blank"); 

    const confirm = window.confirm(`Did you apply for ${job.title} at ${job.company}?`);
    if (!confirm) return;

    const updated = [
      { ...job, date: new Date().toLocaleDateString() },
      ...appliedJobs,
    ];
    setAppliedJobs(updated);
    localStorage.setItem("appliedJobs", JSON.stringify(updated));
  }

  // 3. Chat Handler
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatHistory((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");

    try {
      // Replace with your Render URL when deploying!
      const res = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();

      if (data.action) {
        if (data.action.role) setSearchTerm(data.action.role);
        if (data.action.location) setSearchTerm(data.action.location);
        setChatHistory((prev) => [...prev, { sender: "bot", text: data.message }]);
      } else {
        setChatHistory((prev) => [...prev, { sender: "bot", text: data.message }]);
      }
    } catch (err) {
      setChatHistory((prev) => [
        ...prev, 
        { sender: "bot", text: "Sorry, I can't connect to the server right now." }
      ]);
    }
  };

  // --- FILTERING LOGIC ---
  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Split into "Best Matches" (Score > 70) and Others
  const bestMatches = filteredJobs.filter(job => job.matchScore >= 70);
  const otherJobs = filteredJobs.filter(job => !job.matchScore || job.matchScore < 70);

  return (
    <div className="page">
      <div className="container">
        
        {/* --- HEADER --- */}
        <header className="header glass">
          <div className="header-info">
            <h2>AI Job Tracker</h2>
            <p>Upload your resume to unlock AI-powered matching</p>
          </div>
          
          <div className="header-actions">
            {/* RESUME UPLOAD BUTTON */}
            <div className="upload-wrapper">
              <label htmlFor="resume-upload" className="upload-btn">
                {isUploading ? "Analyzing..." : "📄 Upload Resume"}
              </label>
              <input 
                id="resume-upload" 
                type="file" 
                accept=".pdf" 
                onChange={handleFileUpload} 
                hidden 
              />
            </div>

            <div className="search-box">
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* --- BEST MATCHES SECTION --- */}
        {bestMatches.length > 0 && (
          <section className="section-block">
            <div className="section-title">
              <h3>✨ Best Matches for You</h3>
            </div>
            <div className="grid-container">
              {bestMatches.map((job) => (
                <JobCard 
                  key={job.id} 
                  job={job} 
                  appliedJobs={appliedJobs} 
                  onApply={handleApply} 
                  isBestMatch={true}
                />
              ))}
            </div>
          </section>
        )}

        {/* --- OTHER LISTINGS --- */}
        <section className="section-block">
          <div className="section-title">
            <h3>{bestMatches.length > 0 ? "Other Opportunities" : "Available Listings"}</h3>
            <span className="count-badge">{filteredJobs.length}</span>
          </div>
          <div className="grid-container">
            {otherJobs.length > 0 ? (
              otherJobs.map((job) => (
                <JobCard 
                  key={job.id} 
                  job={job} 
                  appliedJobs={appliedJobs} 
                  onApply={handleApply} 
                />
              ))
            ) : (
              <p style={{color: '#64748b'}}>No jobs found. Try adjusting filters or uploading a resume.</p>
            )}
          </div>
        </section>

        {/* --- RECENT APPLICATIONS --- */}
        {appliedJobs.length > 0 && (
          <section className="section-block">
            <div className="section-title">
              <h3>Recent Applications</h3>
            </div>
            <div className="grid-container">
              {appliedJobs.map((job, i) => (
                <div className="applied-card glass" key={i}>
                  <div className="applied-header">
                    <strong>{job.title}</strong>
                    <span className="status-label">APPLIED</span>
                  </div>
                  <div className="applied-meta">{job.company}</div>
                  <div className="applied-footer">Applied on: {job.date}</div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div> {/* End of Container */}

      {/* --- FIXED CHAT WIDGET --- */}
      <div className={`chat-widget ${chatOpen ? "open" : ""}`}>
        {!chatOpen && (
          <button className="chat-toggle" onClick={() => setChatOpen(true)}>
            💬 AI Assistant
          </button>
        )}

        {chatOpen && (
          <div className="chat-window glass">
            <div className="chat-header">
              <span>🤖 AI Assistant</span>
              <button onClick={() => setChatOpen(false)}>✕</button>
            </div>
            
            <div className="chat-messages">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`message ${msg.sender}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <form className="chat-input-area" onSubmit={handleChatSubmit}>
              <input 
                type="text" 
                placeholder="Ask me to filter jobs..." 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit">➤</button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}

// Sub-component for cleaner code
function JobCard({ job, appliedJobs, onApply, isBestMatch }) {
  const isApplied = appliedJobs.some((aj) => aj.id === job.id);
  
  return (
    <div className={`job-card glass ${isBestMatch ? "highlight-card" : ""}`}>
      <div className={`match-tag ${job.matchScore >= 70 ? "high" : "med"}`}>
        {job.matchScore || 50}% Match
      </div>
      <h4>{job.title}</h4>
      <div className="card-meta">
        <span>🏢 {job.company}</span>
        <span>📍 {job.location}</span>
      </div>
      <button
        className={`btn-apply ${isApplied ? "is-applied" : ""}`}
        disabled={isApplied}
        onClick={() => onApply(job)}
      >
        {isApplied ? "Applied ✓" : "Apply Now"}
      </button>
    </div>
  );
}

export default App;