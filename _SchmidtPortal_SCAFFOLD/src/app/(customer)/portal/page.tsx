import CustomerShell from "@/components/shared/CustomerShell";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerPortal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get customer record matching this user's email
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name")
    .eq("email", user?.email ?? "")
    .single();

  // Get their estimates
  const { data: estimates } = customer
    ? await supabase
        .from("estimates")
        .select("id, estimate_number, status, total, created_at, job:jobs(name)")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    sent: { bg: "#dbeafe", text: "#1e40af", label: "Awaiting Review" },
    viewed: { bg: "#e0e7ff", text: "#3730a3", label: "Viewed" },
    accepted: { bg: "#dcfce7", text: "#166534", label: "Accepted" },
    declined: { bg: "#fee2e2", text: "#991b1b", label: "Declined" },
    changes_requested: { bg: "#fef3c7", text: "#92400e", label: "Changes Requested" },
    draft: { bg: "#f1f5f9", text: "#475569", label: "Draft" },
  };

  return (
    <CustomerShell title={`Welcome${customer?.name ? `, ${customer.name}` : ""}`}>
      {!customer ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "#64748b" }}>
            Your account is being set up. You&apos;ll see your estimates here once Schmidt Construction sends one.
          </p>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 12 }}>
            Questions? Call <a href="tel:+14023202600">(402) 320-2600</a>
          </p>
        </div>
      ) : (
        <>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
            Here are your estimates from Schmidt Construction. Click one to review details.
          </p>

          {(!estimates || estimates.length === 0) ? (
            <div className="card" style={{ textAlign: "center", padding: 32 }}>
              <p style={{ color: "#94a3b8" }}>No estimates yet. We&apos;ll notify you when one is ready.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {estimates.map((est: any) => {
                const s = statusColors[est.status] || statusColors.draft;
                return (
                  <div key={est.id} className="card" style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "18px 22px", cursor: "pointer",
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {est.estimate_number}
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                        {est.job?.name || "Project"} • {new Date(est.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontWeight: 800, fontSize: 16 }}>
                        ${Number(est.total).toLocaleString()}
                      </span>
                      <span style={{
                        background: s.bg, color: s.text,
                        padding: "4px 10px", borderRadius: 6,
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </CustomerShell>
  );
}
