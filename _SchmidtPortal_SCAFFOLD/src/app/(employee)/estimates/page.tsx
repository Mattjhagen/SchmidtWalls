import Link from "next/link";
import Shell from "@/components/shared/Shell";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/timeclock", label: "Time Clock" },
  { href: "/estimates", label: "Estimates" },
  { href: "/customers", label: "Customers" },
];

const STATUS_COLORS: Record<string,string> = {
  draft:"#e2e8f0;#475569", sent:"#dbeafe;#206BD4", viewed:"#dbeafe;#1a56ad",
  changes_requested:"#fef3c7;#92400e", accepted:"#dcfce7;#166534",
  declined:"#fee2e2;#991b1b", expired:"#f1f5f9;#64748b",
};

export default async function Estimates() {
  const supabase = await createClient();
  const { data: ests } = await supabase.from("estimates")
    .select("*, customer:customers(full_name,company)")
    .order("created_at", { ascending: false });

  return (
    <Shell nav={nav} title="Estimates">
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
        <Link href="/estimates/new" className="btn btn-primary">+ New Estimate</Link>
      </div>
      <div className="card" style={{ padding:0, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
          <thead><tr style={{ textAlign:"left", background:"#f8fafc", color:"#64748b" }}>
            <th style={{ padding:"12px 14px" }}>Number</th><th>Customer</th><th>Title</th>
            <th>Status</th><th style={{ textAlign:"right", paddingRight:14 }}>Total</th></tr></thead>
          <tbody>
            {(ests ?? []).map((e:any) => {
              const [bg,fg] = (STATUS_COLORS[e.status] ?? "#e2e8f0;#475569").split(";");
              return (
                <tr key={e.id} style={{ borderTop:"1px solid #e2e8f0" }}>
                  <td style={{ padding:"12px 14px" }}>
                    <Link href={`/estimates/${e.id}`} style={{ color:"#1e293b", fontWeight:600 }}>{e.number}</Link>
                  </td>
                  <td>{e.customer?.company || e.customer?.full_name}</td>
                  <td>{e.title}</td>
                  <td><span className="badge" style={{ background:bg, color:fg }}>{e.status.replace("_"," ")}</span></td>
                  <td style={{ textAlign:"right", paddingRight:14, fontWeight:600 }}>{money(Number(e.total))}</td>
                </tr>
              );
            })}
            {(ests ?? []).length === 0 && <tr><td colSpan={5} style={{ padding:16, color:"#94a3b8" }}>No estimates yet — create your first one.</td></tr>}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
