import { useEffect, useState } from "react";

function App() {
  const [jobs, setJobs] = useState([]);

  // Load applied jobs from localStorage
  const [appliedJobs, setAppliedJobs] = useState(() => {
    const saved = localStorage.getItem("appliedJobs");
    return saved ? JSON.parse(saved) : [];
  });

  // Fetch jobs from backend
  useEffect(() => {
    fetch("http://localhost:3001/jobs")
      .then((res) => res.json())
      .then((data) => setJobs(data))
      .catch((err) => console.error("Error fetching jobs:", err));
  }, []);

  // Handle apply flow
  function handleApply(job) {
    // Simulate external application
    window.open("https://example.com", "_blank");

    const didApply = window.confirm(
      `Did you apply for ${job.title} at ${job.company}?`
    );

    if (!didApply) return;

    const updated = [
      ...appliedJobs,
      {
        ...job,
        status: "Applied",
        date: new Date().toLocaleString(),
      },
    ];

    setAppliedJobs(updated);
    localStorage.setItem("appliedJobs", JSON.stringify(updated));
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>AI Job Tracker</h2>

      {/* Job Listings */}
      <h3>Job Listings</h3>

      {jobs.length === 0 && <p>Loading jobs...</p>}

      {jobs.map((job) => (
        <div
          key={job.id}
          style={{
            border: "1px solid #ccc",
            marginBottom: 10,
            padding: 10,
          }}
        >
          <h4>{job.title}</h4>
          <p>{job.company}</p>
          <p>{job.location}</p>
          <p>Match Score: {job.matchScore}%</p>

          <button onClick={() => handleApply(job)}>Apply</button>
        </div>
      ))}

      <hr />

      {/* Applied Jobs Dashboard */}
      <h3>Applied Jobs</h3>

      {appliedJobs.length === 0 && <p>No applications yet.</p>}

      {appliedJobs.map((job, index) => (
        <div
          key={index}
          style={{
            border: "1px solid green",
            marginBottom: 10,
            padding: 10,
          }}
        >
          <p>
            <strong>{job.title}</strong> — {job.company}
          </p>
          <p>Status: {job.status}</p>
          <p>Applied on: {job.date}</p>
        </div>
      ))}
    </div>
  );
}

export default App;
