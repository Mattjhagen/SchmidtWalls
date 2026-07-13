import Shell from "@/components/shared/Shell";
import { createClient } from "@/lib/supabase/server";

function money(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0 });
}

export default async function Dashboard() {
  const supabase = await createClient();

  // Check if current user is admin (to show admin link)
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const isAdmin = profile?.role === "admin";

  const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/timeclock", label: "Time Clock" },
    { href: "/estimates", label: "Estimates" },
    { href: "/customers", label: "Customers" },
    ...(isAdmin ? [{ href: "/admin", label: "👤 Manage Users" }] : []),
  ];

  const { data: ests } = await supabase.from("estimates").select("status,total");
  const list: { status: string; total: number }[] = (ests ?? []) as { status: string; total: number }[];
  const pipeline = list.filter((e) => ["sent","viewed","changes_requested"].includes(e.status))
                       .reduce((s: number, e) => s + Number(e.total), 0);
  const secured = list.filter((e) => e.status === "accepted").reduce((s: number, e) => s + Number(e.total), 0);
  const drafts = list.filter((e) => e.status === "draft").length;
  const outForReview = list.filter((e) => ["sent","viewed","changes_requested"].includes(e.status)).length;

  const cards = [
    { label: "Total Pipeline", value: money(pipeline) },
    { label: "Secured Contracts", value: money(secured) },
    { label: "Out for Review", value: String(outForReview) },
    { label: "Drafts", value: String(drafts) },
  ];

  return (
    <Shell nav={nav} title="Dashboard">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
        {cards.map(c => (
          <div key={c.label} className="card">
            <div style={{ fontSize: 13, color: "#64748b" }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{c.value}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "#64748b", marginTop: 24, fontSize: 14 }}>
        Welcome back. Use <b>Time Clock</b> to punch in against a job, or <b>Estimates → New</b> to build a proposal and email it to a customer.
        {isAdmin && (
          <> Head to <b><a href="/admin" style={{ color: "#206BD4" }}>Manage Users</a></b> to invite employees or customers.</>
        )}
      </p>
    </Shell>
  );
}
