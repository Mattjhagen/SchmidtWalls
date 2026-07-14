import Shell from "@/components/shared/Shell";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime, formatHours, moneyDecimal } from "@/lib/utils";
import EditEntryRow from "./EditEntryRow";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/timeclock", label: "Time Clock" },
  { href: "/estimates", label: "Estimates" },
  { href: "/customers", label: "Customers" },
  { href: "/admin", label: "👤 Manage Users" },
  { href: "/admin/timesheets", label: "📋 Timesheets" },
];

export default async function TimesheetsAdmin() {
  const supabase = await createClient();

  // Get all time entries with employee info (via the view)
  const { data: entries } = await supabase
    .from("timesheet_summary")
    .select("*")
    .order("clock_in", { ascending: false })
    .limit(100);

  // Get employee pay summaries (last 14 days)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const { data: allEntries } = await supabase
    .from("timesheet_summary")
    .select("*")
    .gte("clock_in", twoWeeksAgo.toISOString());

  // Aggregate by employee
  const employeeSummary: Record<string, { name: string; email: string; hours: number; pay: number; rate: number }> = {};
  (allEntries ?? []).forEach((e: any) => {
    if (!employeeSummary[e.user_id]) {
      employeeSummary[e.user_id] = {
        name: e.employee_name || e.employee_email,
        email: e.employee_email,
        hours: 0,
        pay: 0,
        rate: Number(e.pay_rate || 0),
      };
    }
    if (e.hours_worked) {
      employeeSummary[e.user_id].hours += Number(e.hours_worked);
      employeeSummary[e.user_id].pay += Number(e.pay_earned || 0);
    }
  });

  const flaggedCount = (entries ?? []).filter((e: any) => e.flagged).length;

  // Get jobs for the edit dropdown
  const { data: jobs } = await supabase.from("jobs").select("id, name").order("name");

  return (
    <Shell nav={nav} title="Timesheets">
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
        View and edit all employee time entries. Entries flagged ⚠️ were auto-clocked out at midnight.
      </p>

      {/* Employee pay summary cards */}
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Employee Summary (14 days)</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14, marginBottom: 32 }}>
        {Object.values(employeeSummary).map((emp) => (
          <div key={emp.email} className="card">
            <div style={{ fontWeight: 700, fontSize: 14 }}>{emp.name}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>{emp.email}</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Hours</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{formatHours(emp.hours)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Rate</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{emp.rate > 0 ? `${moneyDecimal(emp.rate)}/hr` : "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748b" }}>Earned</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#166534" }}>
                  {emp.pay > 0 ? moneyDecimal(emp.pay) : "—"}
                </div>
              </div>
            </div>
          </div>
        ))}
        {Object.keys(employeeSummary).length === 0 && (
          <div className="card" style={{ color: "#94a3b8" }}>No time entries in the last 14 days.</div>
        )}
      </div>

      {/* Flagged entries alert */}
      {flaggedCount > 0 && (
        <div style={{
          background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10,
          padding: "12px 18px", marginBottom: 20, fontSize: 14, color: "#92400e",
        }}>
          ⚠️ <strong>{flaggedCount} {flaggedCount === 1 ? "entry" : "entries"}</strong> flagged for review
          (auto-clocked out at midnight — employee forgot to clock out)
        </div>
      )}

      {/* Full timesheet table */}
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>All Entries</h2>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 800 }}>
          <thead>
            <tr style={{ background: "#f8fafc", color: "#64748b", fontSize: 11, fontWeight: 700 }}>
              <th style={{ padding: "10px 12px", textAlign: "left" }}>Employee</th>
              <th style={{ textAlign: "left" }}>Date</th>
              <th style={{ textAlign: "left" }}>Clock In</th>
              <th style={{ textAlign: "left" }}>Clock Out</th>
              <th style={{ textAlign: "left" }}>Job</th>
              <th style={{ textAlign: "right" }}>Hours</th>
              <th style={{ textAlign: "right" }}>Pay</th>
              <th style={{ textAlign: "center" }}>Status</th>
              <th style={{ textAlign: "center", paddingRight: 12 }}>Edit</th>
            </tr>
          </thead>
          <tbody>
            {(entries ?? []).map((e: any) => (
              <EditEntryRow key={e.id} entry={e} jobs={jobs ?? []} />
            ))}
            {(entries ?? []).length === 0 && (
              <tr><td colSpan={9} style={{ padding: 20, color: "#94a3b8", textAlign: "center" }}>
                No time entries found.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
