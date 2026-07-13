"use client";
import { useState } from "react";

export default function InviteForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"employee" | "customer">("customer");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, role }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMsg({ type: "ok", text: `Invited ${email} as ${role}. Magic link sent!` });
      setEmail("");
      setName("");
    } else {
      setMsg({ type: "err", text: data.error || "Failed to invite user" });
    }
  }

  return (
    <div className="card" style={{ maxWidth: 500 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Invite a User</h3>
      <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Email address *
          </label>
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@example.com"
          />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Full name (optional)
          </label>
          <input
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
          />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Role
          </label>
          <div style={{ display: "flex", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
              <input
                type="radio"
                name="role"
                value="customer"
                checked={role === "customer"}
                onChange={() => setRole("customer")}
              />
              Customer
              <span style={{ fontSize: 12, color: "#64748b" }}>(sees their estimates/invoices)</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
              <input
                type="radio"
                name="role"
                value="employee"
                checked={role === "employee"}
                onChange={() => setRole("employee")}
              />
              Employee
              <span style={{ fontSize: 12, color: "#64748b" }}>(full portal access)</span>
            </label>
          </div>
        </div>

        <button className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? "Sending invite…" : "Send Invite"}
        </button>

        {msg && (
          <p style={{
            fontSize: 13,
            color: msg.type === "ok" ? "#16a34a" : "#dc2626",
            marginTop: 4,
          }}>
            {msg.text}
          </p>
        )}
      </form>
    </div>
  );
}
