"use client";
import { useState } from "react";

export default function TimesheetActions() {
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [recipient, setRecipient] = useState("mikiel@schmidt-construction.com");

  function openPrintView() {
    // Opens the timesheet HTML in a new tab for printing/saving as PDF
    window.open("/api/timesheet-pdf", "_blank");
  }

  async function emailTimesheet() {
    setSending(true);
    setMsg(null);
    const res = await fetch("/api/email-timesheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientEmail: recipient }),
    });
    const data = await res.json();
    setSending(false);
    if (res.ok) {
      setMsg({ type: "ok", text: `✓ Timesheet emailed to ${recipient}` });
    } else {
      setMsg({ type: "err", text: data.error || "Failed to send" });
    }
  }

  return (
    <div style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Timesheet</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={openPrintView}
          style={{
            background: "#206BD4", color: "#fff", border: "none",
            padding: "10px 20px", borderRadius: 8, fontWeight: 700,
            fontSize: 14, cursor: "pointer",
          }}
        >
          🖨️ Print Timesheet
        </button>

        <button
          onClick={() => setShowOptions(!showOptions)}
          style={{
            background: "#1e293b", color: "#fff", border: "none",
            padding: "10px 20px", borderRadius: 8, fontWeight: 700,
            fontSize: 14, cursor: "pointer",
          }}
        >
          📧 Email to Boss
        </button>
      </div>

      {showOptions && (
        <div className="card" style={{ marginTop: 12, maxWidth: 450 }}>
          <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Send to:
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button
              onClick={emailTimesheet}
              disabled={sending}
              style={{
                background: "#166534", color: "#fff", border: "none",
                padding: "8px 16px", borderRadius: 6, fontWeight: 700,
                fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
          {msg && (
            <p style={{ fontSize: 13, marginTop: 8, color: msg.type === "ok" ? "#166534" : "#dc2626" }}>
              {msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
