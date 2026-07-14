"use client";
import { useState } from "react";
import { formatDate, formatTime, formatHours, moneyDecimal } from "@/lib/utils";

interface Props {
  entry: any;
  jobs: { id: string; name: string }[];
}

export default function EditEntryRow({ entry, jobs }: Props) {
  const [editing, setEditing] = useState(false);
  const [clockIn, setClockIn] = useState(entry.clock_in?.slice(0, 16) || "");
  const [clockOut, setClockOut] = useState(entry.clock_out?.slice(0, 16) || "");
  const [jobId, setJobId] = useState(entry.job_id || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/edit-timeentry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryId: entry.id,
        clockIn: new Date(clockIn).toISOString(),
        clockOut: clockOut ? new Date(clockOut).toISOString() : null,
        jobId: jobId || null,
        clearFlag: true,
      }),
    });
    setSaving(false);
    if (res.ok) {
      window.location.reload();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to save");
    }
  }

  const hours = entry.hours_worked ? Number(entry.hours_worked) : null;
  const pay = entry.pay_earned ? Number(entry.pay_earned) : null;

  if (editing) {
    return (
      <tr style={{ borderTop: "1px solid #f1f5f9", background: "#fffbeb" }}>
        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{entry.employee_name || entry.employee_email}</td>
        <td>{formatDate(entry.clock_in)}</td>
        <td>
          <input
            type="datetime-local"
            value={clockIn}
            onChange={(e) => setClockIn(e.target.value)}
            className="input"
            style={{ fontSize: 12, padding: "4px 6px", width: 165 }}
          />
        </td>
        <td>
          <input
            type="datetime-local"
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
            className="input"
            style={{ fontSize: 12, padding: "4px 6px", width: 165 }}
          />
        </td>
        <td>
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="input"
            style={{ fontSize: 12, padding: "4px 6px", width: 120 }}
          >
            <option value="">—</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </select>
        </td>
        <td colSpan={2} style={{ textAlign: "center" }}>
          <button
            onClick={save}
            disabled={saving}
            style={{
              background: "#166534", color: "#fff", border: "none",
              padding: "5px 14px", borderRadius: 6, fontSize: 12,
              fontWeight: 700, cursor: "pointer", marginRight: 6,
            }}
          >
            {saving ? "…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            style={{
              background: "#e2e8f0", color: "#475569", border: "none",
              padding: "5px 14px", borderRadius: 6, fontSize: 12,
              fontWeight: 700, cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </td>
        <td></td>
        <td></td>
      </tr>
    );
  }

  return (
    <tr style={{ borderTop: "1px solid #f1f5f9" }}>
      <td style={{ padding: "10px 12px", fontWeight: 600 }}>
        {entry.employee_name || entry.employee_email?.split("@")[0]}
      </td>
      <td>{formatDate(entry.clock_in)}</td>
      <td>{formatTime(entry.clock_in)}</td>
      <td>
        {entry.clock_out
          ? formatTime(entry.clock_out)
          : <span style={{ color: "#d97706", fontWeight: 700 }}>Active</span>
        }
      </td>
      <td style={{ color: "#475569" }}>{entry.job_name || "—"}</td>
      <td style={{ textAlign: "right", fontWeight: 600 }}>
        {hours ? formatHours(hours) : "—"}
      </td>
      <td style={{ textAlign: "right" }}>
        {pay ? moneyDecimal(pay) : "—"}
      </td>
      <td style={{ textAlign: "center" }}>
        {entry.flagged && (
          <span style={{
            background: "#fef3c7", color: "#92400e",
            padding: "2px 8px", borderRadius: 4,
            fontSize: 11, fontWeight: 700,
          }}>
            ⚠️ REVIEW
          </span>
        )}
        {entry.edited_by && !entry.flagged && (
          <span style={{
            background: "#dbeafe", color: "#1e40af",
            padding: "2px 8px", borderRadius: 4,
            fontSize: 11, fontWeight: 700,
          }}>
            ✏️ Edited
          </span>
        )}
      </td>
      <td style={{ textAlign: "center", paddingRight: 12 }}>
        <button
          onClick={() => setEditing(true)}
          style={{
            background: "transparent", border: "1px solid #e2e8f0",
            padding: "4px 10px", borderRadius: 6, fontSize: 12,
            cursor: "pointer", color: "#475569",
          }}
        >
          Edit
        </button>
      </td>
    </tr>
  );
}
