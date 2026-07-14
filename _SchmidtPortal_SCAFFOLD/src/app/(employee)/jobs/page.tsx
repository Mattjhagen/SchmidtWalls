"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/shared/Shell";
import Link from "next/link";

interface Job {
  id: string;
  name: string;
  status: string;
  address: string | null;
  created_at: string;
  customer: { full_name?: string; company?: string; name?: string } | null;
}

const COLUMNS = [
  { key: "estimating", label: "Estimating", color: "#dbeafe", textColor: "#1e40af" },
  { key: "scheduled", label: "Scheduled", color: "#e0e7ff", textColor: "#3730a3" },
  { key: "in_progress", label: "In Progress", color: "#fef3c7", textColor: "#92400e" },
  { key: "complete", label: "Complete", color: "#dcfce7", textColor: "#166534" },
];

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/timeclock", label: "Time Clock" },
  { href: "/jobs", label: "Jobs" },
  { href: "/estimates", label: "Estimates" },
  { href: "/customers", label: "Customers" },
];

export default function JobsBoard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(jobId: string, newStatus: string) {
    const res = await fetch("/api/jobs/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, status: newStatus }),
    });

    if (res.ok) {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j))
      );
    }
  }

  function getJobsByStatus(status: string) {
    return jobs.filter((j) => j.status === status);
  }

  return (
    <Shell nav={nav} title="Jobs Board">
      {loading ? (
        <div style={{ color: "#64748b", padding: 20 }}>Loading jobs...</div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          minHeight: 400,
        }}>
          {COLUMNS.map((col) => (
            <div key={col.key} style={{
              background: "#f8fafc",
              borderRadius: 12,
              padding: 14,
              border: "1px solid #e2e8f0",
            }}>
              {/* Column header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                paddingBottom: 10,
                borderBottom: "2px solid #e2e8f0",
              }}>
                <span style={{
                  background: col.color,
                  color: col.textColor,
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {col.label}
                </span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  ({getJobsByStatus(col.key).length})
                </span>
              </div>

              {/* Job cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {getJobsByStatus(col.key).map((job) => (
                  <div key={job.id} className="card" style={{ padding: "14px 16px" }}>
                    <Link
                      href={`/jobs/${job.id}`}
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#1e293b",
                        textDecoration: "none",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      {job.name}
                    </Link>
                    {job.customer && (
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>
                        {job.customer.company || job.customer.full_name || job.customer.name}
                      </div>
                    )}
                    {job.address && (
                      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
                        📍 {job.address}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
                      Created {job.created_at ? new Date(job.created_at).toLocaleDateString() : "—"}
                    </div>

                    {/* Status dropdown */}
                    <select
                      value={job.status}
                      onChange={(e) => updateStatus(job.id, e.target.value)}
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {getJobsByStatus(col.key).length === 0 && (
                  <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>
                    No jobs
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
