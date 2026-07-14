"use client";
import { useState } from "react";
import { formatDate, formatTime, formatHours, moneyDecimal } from "@/lib/utils";

interface Entry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  project_id: string | null;
  flagged: boolean;
  flag_reason: string | null;
}

interface Props {
  entry: Entry;
  jobs: { id: string; name: string }[];
  payRate: number;
}

export default function EditableEntry({ entry, jobs, payRate }: Props) {
  const [editing, setEditing] = useState(false);
  const [clockIn, setClockIn] = useState(entry.clock_in?.slice(0, 16) || "");
  const [clockOut, setClockOut] = useState(entry.clock_out?.slice(0, 16) || "");
  const [projectId, setProjectId] = useState(entry.project_id || "");
  const [saving, setSaving] = useState(false);

  const hours = entry.clock_out
    ? (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000
    : null;

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/edit-timeentry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryId: entry.id,
        clockIn: new Date(clockIn).toISOString(),
        clockOut: clockOut ? new Date(clockOut).toISOString() : null,
        jobId: projectId || null,
        clearFlag: true,
      }),
    });
    setSaving(false);
    if (res.ok) window.location.reload();
    else alert("Failed to save");
  }

  if (editing) {
    return (
      <tr style={{ borderTop: "1px solid #f1f5f9", background: "#fffbeb" }}>
        <td style={{ padding: "8px 14px" }}>{formatDate(entry.clock_in)}</td>
        <td>
          <input type="datetime-local" value={clockIn} onChange={(e) => setClockIn(e.target.value)}
            className="input" style={{ fontSize: 12, padding: "4px 6px", width: 160 }} />
        </td>
        <td>
          <input type="datetime-local" value={clockOut} onChange={(e) => setClockOut(e.target.value)}
            className="input" style={{ fontSize: 12, padding: "4px 6px", width: 160 }} />
        </td>
        <td>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
            className="input" style={{ fontSize: 12, padding: "4px 6px", width: 120 }}>
            <option value="">—</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </td>
        <td colSpan={2} style={{ textAlign: "center" }}>
          <button onClick={save} disabled={saving}
            style={{ background: "#166534", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: "pointer", marginRight: 6 }}>
            {saving ? "…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)}
            style={{ background: "#e2e8f0", border: "none", padding: "5px 12px", borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Cancel
          </button>
        </td>
        <td></td>
      </tr>
    );
  }

  const jobName = jobs.find(j => j.id === entry.project_id)?.name || "—";

  return (
    <tr style={{ borderTop: "1px solid #f1f5f9" }}>
      <td style={{ padding: "10px 14px", fontWeight: 600 }}>{formatDate(entry.clock_in)}</td>
      <td>{formatTime(entry.clock_in)}</td>
      <td>{entry.clock_out ? formatTime(entry.clock_out) : <span style={{ color: "#d97706", fontWeight: 700 }}>Active</span>}</td>
      <td style={{ color: "#475569" }}>{jobName}</td>
      <td style={{ textAlign: "right", fontWeight: 600 }}>{hours ? formatHours(hours) : "—"}</td>
      <td style={{ textAlign: "right" }}>{hours && payRate > 0 ? moneyDecimal(hours * payRate) : "—"}</td>
      <td style={{ textAlign: "center" }}>
        {entry.flagged ? (
          <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>⚠️</span>
        ) : null}
        <button onClick={() => setEditing(true)}
          style={{ background: "transparent", border: "1px solid #e2e8f0", padding: "3px 8px", borderRadius: 5, fontSize: 11, cursor: "pointer", color: "#475569", marginLeft: 6 }}>
          Edit
        </button>
      </td>
    </tr>
  );
}
