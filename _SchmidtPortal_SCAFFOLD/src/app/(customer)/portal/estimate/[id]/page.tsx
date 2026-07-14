"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Estimate {
  id: string;
  estimate_number: string;
  title: string;
  status: string;
  total: number;
  tax_rate: number;
  terms: string | null;
  notes: string | null;
  created_at: string;
  job: { name: string } | null;
  items: EstimateItem[];
}

export default function CustomerEstimateDetail() {
  const params = useParams();
  const router = useRouter();
  const estimateId = params.id as string;

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [changesMessage, setChangesMessage] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchEstimate();
  }, [estimateId]);

  async function fetchEstimate() {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data } = await supabase
        .from("estimates")
        .select(`
          id, estimate_number, title, status, total, tax_rate, terms, notes, created_at,
          job:jobs(name),
          items:estimate_items(id, description, quantity, unit_price, total)
        `)
        .eq("id", estimateId)
        .single();

      setEstimate(data as unknown as Estimate);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: "accept" | "decline" | "request_changes") {
    if (action === "accept" && !confirm("Accept this estimate? This confirms you approve the work and pricing.")) return;
    if (action === "decline" && !confirm("Decline this estimate? You can always request a new one later.")) return;

    setActionLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/customer/estimate-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimateId,
          action,
          message: action === "request_changes" ? changesMessage : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({ type: "success", text: data.message });
        setEstimate((prev) => prev ? { ...prev, status: data.status } : prev);
        setShowChangesForm(false);
        setChangesMessage("");
      } else {
        setFeedback({ type: "error", text: data.error });
      }
    } catch {
      setFeedback({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        <header style={{
          background: "#1e293b", color: "#fff", padding: "0 24px",
          display: "flex", alignItems: "center", height: 56,
        }}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>
            SCHMIDT<span style={{ color: "#206BD4" }}>.</span>
          </span>
        </header>
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
          <div style={{ color: "#64748b" }}>Loading estimate...</div>
        </main>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        <header style={{
          background: "#1e293b", color: "#fff", padding: "0 24px",
          display: "flex", alignItems: "center", height: 56,
        }}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>
            SCHMIDT<span style={{ color: "#206BD4" }}>.</span>
          </span>
        </header>
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
          <div className="card" style={{ textAlign: "center", padding: 32 }}>
            <p style={{ color: "#64748b" }}>Estimate not found.</p>
            <Link href="/portal" className="btn btn-primary" style={{ marginTop: 12 }}>
              ← Back to Portal
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const subtotal = Number(estimate.total) || 0;
  const taxRate = Number(estimate.tax_rate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  const canAct = !["accepted", "declined"].includes(estimate.status);

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    sent: { bg: "#dbeafe", text: "#1e40af", label: "Awaiting Your Review" },
    viewed: { bg: "#e0e7ff", text: "#3730a3", label: "Viewed" },
    accepted: { bg: "#dcfce7", text: "#166534", label: "Accepted ✓" },
    declined: { bg: "#fee2e2", text: "#991b1b", label: "Declined" },
    changes_requested: { bg: "#fef3c7", text: "#92400e", label: "Changes Requested" },
    draft: { bg: "#f1f5f9", text: "#475569", label: "Draft" },
  };

  const s = statusColors[estimate.status] || statusColors.draft;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <header style={{
        background: "#1e293b", color: "#fff", padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>
            SCHMIDT<span style={{ color: "#206BD4" }}>.</span>
          </span>
          <Link href="/portal" style={{ color: "#cbd5e1", textDecoration: "none", fontSize: 14 }}>
            ← My Estimates
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
        {/* Estimate header */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, marginTop: 0 }}>
                {estimate.title || estimate.estimate_number}
              </h1>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {estimate.estimate_number} • {estimate.job?.name || "Project"}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Sent {new Date(estimate.created_at).toLocaleDateString()}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{
                background: s.bg, color: s.text,
                padding: "5px 12px", borderRadius: 6,
                fontSize: 12, fontWeight: 700,
              }}>
                {s.label}
              </span>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>
                ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Line items table */}
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#f8fafc", color: "#64748b" }}>
                <th style={{ padding: "12px 14px" }}>Description</th>
                <th style={{ textAlign: "center" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Unit Price</th>
                <th style={{ textAlign: "right", paddingRight: 14 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(estimate.items || []).map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "12px 14px" }}>{item.description}</td>
                  <td style={{ textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right" }}>
                    ${Number(item.unit_price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 14, fontWeight: 600 }}>
                    ${Number(item.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {(!estimate.items || estimate.items.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ padding: 16, color: "#94a3b8", textAlign: "center" }}>
                    No line items listed
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot style={{ borderTop: "2px solid #e2e8f0" }}>
              <tr>
                <td colSpan={3} style={{ textAlign: "right", padding: "10px 14px", color: "#64748b" }}>Subtotal</td>
                <td style={{ textAlign: "right", paddingRight: 14, fontWeight: 600 }}>
                  ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
              </tr>
              {taxRate > 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: "right", padding: "6px 14px", color: "#64748b" }}>
                    Tax ({taxRate}%)
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 14 }}>
                    ${taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={3} style={{ textAlign: "right", padding: "10px 14px", fontWeight: 800, fontSize: 16 }}>
                  Total Due
                </td>
                <td style={{ textAlign: "right", paddingRight: 14, fontWeight: 800, fontSize: 16 }}>
                  ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Terms & Notes */}
        {(estimate.terms || estimate.notes) && (
          <div className="card" style={{ marginBottom: 20 }}>
            {estimate.terms && (
              <div style={{ marginBottom: estimate.notes ? 12 : 0 }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, fontWeight: 600 }}>Terms & Conditions</div>
                <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{estimate.terms}</div>
              </div>
            )}
            {estimate.notes && (
              <div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, fontWeight: 600 }}>Notes</div>
                <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{estimate.notes}</div>
              </div>
            )}
          </div>
        )}

        {/* Feedback message */}
        {feedback && (
          <div style={{
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            background: feedback.type === "success" ? "#dcfce7" : "#fee2e2",
            color: feedback.type === "success" ? "#166534" : "#991b1b",
            fontSize: 14,
            fontWeight: 600,
          }}>
            {feedback.text}
          </div>
        )}

        {/* Action buttons */}
        {canAct && (
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
              Your Response
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                onClick={() => handleAction("accept")}
                disabled={actionLoading}
                style={{ background: "#16a34a", opacity: actionLoading ? 0.6 : 1 }}
              >
                ✓ Accept Estimate
              </button>

              <button
                className="btn btn-ghost"
                onClick={() => setShowChangesForm(!showChangesForm)}
                disabled={actionLoading}
                style={{ borderColor: "#f59e0b", color: "#92400e" }}
              >
                ✏️ Request Changes
              </button>

              <button
                className="btn btn-ghost"
                onClick={() => handleAction("decline")}
                disabled={actionLoading}
                style={{ borderColor: "#ef4444", color: "#991b1b" }}
              >
                ✗ Decline
              </button>
            </div>

            {/* Changes form */}
            {showChangesForm && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                  Describe what changes you'd like:
                </div>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="e.g., Can we reduce the scope on item #3? Also, is there a discount for paying upfront?"
                  value={changesMessage}
                  onChange={(e) => setChangesMessage(e.target.value)}
                  style={{ resize: "vertical", marginBottom: 12 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => handleAction("request_changes")}
                  disabled={actionLoading || !changesMessage.trim()}
                  style={{ opacity: actionLoading || !changesMessage.trim() ? 0.5 : 1 }}
                >
                  Submit Change Request
                </button>
              </div>
            )}
          </div>
        )}

        {/* Already acted */}
        {!canAct && (
          <div className="card" style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 14, color: "#64748b" }}>
              You've already {estimate.status === "accepted" ? "accepted" : "declined"} this estimate.
              {estimate.status === "declined" && " Contact Schmidt Construction if you'd like a revised quote."}
            </div>
          </div>
        )}

        {/* Contact info */}
        <div style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
          Questions? Call <a href="tel:+14023202600" style={{ color: "#206BD4" }}>(402) 320-2600</a> or email{" "}
          <a href="mailto:mikiel@schmidt-construction.com" style={{ color: "#206BD4" }}>mikiel@schmidt-construction.com</a>
        </div>
      </main>
    </div>
  );
}
