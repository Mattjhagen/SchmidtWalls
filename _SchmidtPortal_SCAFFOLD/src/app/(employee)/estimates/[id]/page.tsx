"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Shell from "@/components/shared/Shell";
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
  number: string;
  title: string;
  status: string;
  total: number;
  tax_rate: number;
  terms: string | null;
  notes: string | null;
  created_at: string;
  customer: { full_name?: string; company?: string; email?: string } | null;
  job: { name: string } | null;
  items: EstimateItem[];
}

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/timeclock", label: "Time Clock" },
  { href: "/jobs", label: "Jobs" },
  { href: "/estimates", label: "Estimates" },
  { href: "/customers", label: "Customers" },
];

export default function EstimateDetailPage() {
  const params = useParams();
  const estimateId = params.id as string;

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<string | null>(null);

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
          id, number, title, status, total, tax_rate, terms, notes, created_at,
          customer:customers(full_name, company, email),
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

  async function handleGenerateInvoice() {
    if (!confirm("Generate an invoice from this estimate? This will create a pending invoice with NET 30 terms.")) return;

    setInvoiceLoading(true);
    setInvoiceResult(null);

    try {
      const res = await fetch("/api/estimates/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimateId }),
      });

      const data = await res.json();

      if (res.ok) {
        setInvoiceResult(`✓ Invoice ${data.invoice.invoice_number} created — $${Number(data.invoice.amount_due).toLocaleString()} due ${new Date(data.invoice.due_date).toLocaleDateString()}`);
      } else {
        setInvoiceResult(`✗ ${data.error}`);
      }
    } catch {
      setInvoiceResult("✗ Failed to generate invoice");
    } finally {
      setInvoiceLoading(false);
    }
  }

  if (loading) {
    return (
      <Shell nav={nav} title="Estimate Details">
        <div style={{ color: "#64748b" }}>Loading...</div>
      </Shell>
    );
  }

  if (!estimate) {
    return (
      <Shell nav={nav} title="Estimate Not Found">
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <p style={{ color: "#64748b" }}>This estimate could not be found.</p>
          <Link href="/estimates" className="btn btn-primary" style={{ marginTop: 12 }}>
            ← Back to Estimates
          </Link>
        </div>
      </Shell>
    );
  }

  const subtotal = Number(estimate.total) || 0;
  const taxRate = Number(estimate.tax_rate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;

  const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    draft: { bg: "#e2e8f0", color: "#475569" },
    sent: { bg: "#dbeafe", color: "#206BD4" },
    viewed: { bg: "#dbeafe", color: "#1a56ad" },
    changes_requested: { bg: "#fef3c7", color: "#92400e" },
    accepted: { bg: "#dcfce7", color: "#166534" },
    declined: { bg: "#fee2e2", color: "#991b1b" },
  };

  const statusStyle = STATUS_COLORS[estimate.status] || STATUS_COLORS.draft;

  return (
    <Shell nav={nav} title={`Estimate ${estimate.number || ""}`}>
      <div style={{ marginBottom: 6 }}>
        <Link href="/estimates" style={{ fontSize: 13, color: "#206BD4", textDecoration: "none" }}>
          ← Back to Estimates
        </Link>
      </div>

      {/* Header card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>
              {estimate.title || "Untitled Estimate"}
            </h2>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              {estimate.customer?.company || estimate.customer?.full_name || "—"} • {estimate.job?.name || "No job"}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
              Created {new Date(estimate.created_at).toLocaleDateString()}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="badge" style={{ background: statusStyle.bg, color: statusStyle.color, fontSize: 13, padding: "5px 12px" }}>
              {estimate.status.replace("_", " ")}
            </span>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>
              ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Line items */}
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
                  No line items
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
                <td colSpan={3} style={{ textAlign: "right", padding: "6px 14px", color: "#64748b" }}>Tax ({taxRate}%)</td>
                <td style={{ textAlign: "right", paddingRight: 14 }}>
                  ${taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={3} style={{ textAlign: "right", padding: "10px 14px", fontWeight: 800, fontSize: 15 }}>Total</td>
              <td style={{ textAlign: "right", paddingRight: 14, fontWeight: 800, fontSize: 15 }}>
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
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, fontWeight: 600 }}>Terms</div>
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

      {/* Generate Invoice button — only for accepted estimates */}
      {estimate.status === "accepted" && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerateInvoice}
            disabled={invoiceLoading}
            style={{ opacity: invoiceLoading ? 0.6 : 1 }}
          >
            {invoiceLoading ? "Generating..." : "💰 Generate Invoice"}
          </button>
          <span style={{ fontSize: 13, color: "#64748b" }}>
            Creates a pending invoice (NET 30) from this accepted estimate.
          </span>
          {invoiceResult && (
            <div style={{
              width: "100%",
              marginTop: 8,
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: invoiceResult.startsWith("✓") ? "#dcfce7" : "#fee2e2",
              color: invoiceResult.startsWith("✓") ? "#166534" : "#991b1b",
            }}>
              {invoiceResult}
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
