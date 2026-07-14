"use client";
import { useState, useEffect } from "react";

interface Props {
  activeEntry: any;
  jobs: { id: string; name: string }[];
  userId: string;
}

export default function ClockButtons({ activeEntry, jobs, userId }: Props) {
  const [active, setActive] = useState(activeEntry);
  const [jobId, setJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState("");
  const [error, setError] = useState("");

  // Live timer
  useEffect(() => {
    if (!active) { setElapsed(""); return; }
    const tick = () => {
      const ms = Date.now() - new Date(active.clock_in).getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setElapsed(`${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [active]);

  async function clockIn() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: jobId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setActive(data);
      } else {
        setError(data.error || "Failed to clock in");
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    }
    setLoading(false);
  }

  async function clockOut() {
    if (!active) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: active.id }),
      });
      if (res.ok) {
        setActive(null);
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to clock out");
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    }
    setLoading(false);
  }

  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      {active ? (
        <>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Clocked in since</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
              {new Date(active.clock_in).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </div>
          </div>
          <div style={{
            fontSize: 28, fontWeight: 800, fontFamily: "monospace",
            color: "#166534", letterSpacing: "-0.02em",
          }}>
            {elapsed}
          </div>
          <button
            onClick={clockOut}
            disabled={loading}
            style={{
              background: "#dc2626", color: "#fff", marginLeft: "auto",
              padding: "12px 28px", borderRadius: 8, fontWeight: 700,
              border: "none", cursor: "pointer", fontSize: 15,
            }}
          >
            {loading ? "Clocking out…" : "Clock Out"}
          </button>
        </>
      ) : (
        <>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
              Select Job (optional)
            </label>
            <select
              className="input"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              style={{ maxWidth: 300 }}
            >
              <option value="">— No job —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={clockIn}
            disabled={loading}
            style={{
              background: "#166534", color: "#fff",
              padding: "12px 28px", borderRadius: 8, fontWeight: 700,
              border: "none", cursor: "pointer", fontSize: 15,
            }}
          >
            {loading ? "Clocking in…" : "Clock In"}
          </button>
        </>
      )}
      {error && (
        <div style={{ width: "100%", marginTop: 8, color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
