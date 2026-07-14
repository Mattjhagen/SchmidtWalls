"use client";
import { useState } from "react";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  pay_rate: number | null;
  created_at: string;
}

export default function UserTable({ users }: { users: User[] }) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingPay, setEditingPay] = useState<string | null>(null);
  const [payValue, setPayValue] = useState("");

  async function changeRole(userId: string, newRole: string) {
    setUpdating(userId);
    const res = await fetch("/api/admin/update-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: newRole }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      alert("Failed to update role");
    }
    setUpdating(null);
  }

  async function savePayRate(userId: string) {
    const res = await fetch("/api/admin/set-pay-rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, payRate: Number(payValue) }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      alert("Failed to update pay rate");
    }
    setEditingPay(null);
  }

  const roleBadge = (role: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      admin: { bg: "#fef3c7", text: "#92400e" },
      employee: { bg: "#dbeafe", text: "#1e40af" },
      customer: { bg: "#f1f5f9", text: "#475569" },
    };
    const c = colors[role] || colors.customer;
    return (
      <span style={{
        background: c.bg, color: c.text,
        padding: "3px 10px", borderRadius: 6,
        fontSize: 12, fontWeight: 700, textTransform: "uppercase",
      }}>
        {role}
      </span>
    );
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
            <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#64748b", fontWeight: 700 }}>Name</th>
            <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#64748b", fontWeight: 700 }}>Email</th>
            <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#64748b", fontWeight: 700 }}>Role</th>
            <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#64748b", fontWeight: 700 }}>Pay Rate</th>
            <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#64748b", fontWeight: 700 }}>Joined</th>
            <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#64748b", fontWeight: 700 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                {u.full_name || "—"}
              </td>
              <td style={{ padding: "10px 12px", color: "#475569" }}>
                {u.email}
              </td>
              <td style={{ padding: "10px 12px" }}>
                {roleBadge(u.role)}
              </td>
              <td style={{ padding: "10px 12px" }}>
                {editingPay === u.id ? (
                  <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input
                      type="number"
                      step="0.50"
                      value={payValue}
                      onChange={(e) => setPayValue(e.target.value)}
                      className="input"
                      style={{ width: 80, fontSize: 13, padding: "3px 6px" }}
                      placeholder="$/hr"
                      autoFocus
                    />
                    <button
                      onClick={() => savePayRate(u.id)}
                      style={{ background: "#166534", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingPay(null)}
                      style={{ background: "#e2e8f0", border: "none", padding: "4px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
                    >
                      ✗
                    </button>
                  </span>
                ) : (
                  <span
                    onClick={() => {
                      if (u.role !== "customer") {
                        setEditingPay(u.id);
                        setPayValue(String(u.pay_rate || ""));
                      }
                    }}
                    style={{
                      cursor: u.role !== "customer" ? "pointer" : "default",
                      color: u.pay_rate ? "#166534" : "#94a3b8",
                      fontWeight: u.pay_rate ? 700 : 400,
                    }}
                    title={u.role !== "customer" ? "Click to edit" : ""}
                  >
                    {u.role === "customer" ? "—" : (u.pay_rate ? `$${Number(u.pay_rate).toFixed(2)}/hr` : "Click to set")}
                  </span>
                )}
              </td>
              <td style={{ padding: "10px 12px", color: "#64748b", fontSize: 13 }}>
                {new Date(u.created_at).toLocaleDateString()}
              </td>
              <td style={{ padding: "10px 12px" }}>
                {updating === u.id ? (
                  <span style={{ fontSize: 12, color: "#64748b" }}>Updating…</span>
                ) : (
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="input"
                    style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}
                  >
                    <option value="customer">Customer</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <p style={{ color: "#94a3b8", textAlign: "center", padding: 24 }}>
          No users yet. Invite someone above!
        </p>
      )}
    </div>
  );
}
