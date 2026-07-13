import CustomerShell from "@/components/shared/CustomerShell";
import { createClient } from "@/lib/supabase/server";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get customer record
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("email", user?.email ?? "")
    .single();

  // Get their invoices
  const { data: invoices } = customer
    ? await supabase
        .from("invoices")
        .select("id, invoice_number, status, amount_due, due_date, created_at")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <CustomerShell title="Invoices">
      {(!invoices || invoices.length === 0) ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#64748b" }}>No invoices yet.</p>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 8 }}>
            Invoices will appear here once work begins on your project.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {invoices.map((inv: any) => (
            <div key={inv.id} className="card" style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "18px 22px",
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{inv.invoice_number}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                  Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "TBD"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>
                  ${Number(inv.amount_due).toLocaleString()}
                </span>
                <span style={{
                  background: inv.status === "paid" ? "#dcfce7" : "#fef3c7",
                  color: inv.status === "paid" ? "#166534" : "#92400e",
                  padding: "4px 10px", borderRadius: 6,
                  fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                }}>
                  {inv.status || "pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </CustomerShell>
  );
}
