"use client";
import { useState } from "react";

interface Job {
  id: string;
  name: string;
}

export default function ManageJobs({ jobs: initialJobs }: { jobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showManage, setShowManage] = useState(false);

  async function addJob(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const job = await res.json();
      setJobs([...jobs, job]);
      setNewName("");
    }
    setLoading(false);
  }

  async function deleteJob(id: string) {
    if (!confirm("Remove this job from the list?")) return;
    const res = await fetch(`/api/jobs?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setJobs(jobs.filter(j => j.id !== id));
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <button
        onClick={() => setShowManage(!showManage)}
        style={{
          background: "transparent", border: "1px solid #e2e8f0",
          padding: "6px 14px", borderRadius: 6, fontSize: 13,
          cursor: "pointer", color: "#475569", fontWeight: 600,
        }}
      >
        {showManage ? "Hide" : "⚙️ Manage Jobs"}
      </button>

      {showManage && (
        <div className="card" style={{ marginTop: 12, maxWidth: 400 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Job / Project List</h3>

          {/* Add new */}
          <form onSubmit={addJob} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New job name..."
              style={{ flex: 1, fontSize: 13 }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                background: "#166534", color: "#fff", border: "none",
                padding: "6px 14px", borderRadius: 6, fontSize: 13,
                fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              + Add
            </button>
          </form>

          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {jobs.map(j => (
              <div key={j.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "6px 10px", background: "#f8fafc", borderRadius: 6,
              }}>
                <span style={{ fontSize: 13 }}>{j.name}</span>
                <button
                  onClick={() => deleteJob(j.id)}
                  style={{
                    background: "transparent", border: "none", color: "#dc2626",
                    cursor: "pointer", fontSize: 16, padding: "0 4px",
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
            {jobs.length === 0 && (
              <p style={{ fontSize: 12, color: "#94a3b8" }}>No jobs yet. Add one above.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
