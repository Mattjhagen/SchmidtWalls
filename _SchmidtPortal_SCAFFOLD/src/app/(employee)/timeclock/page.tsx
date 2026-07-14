import Shell from "@/components/shared/Shell";
import { createClient } from "@/lib/supabase/server";
import { formatHours, moneyDecimal } from "@/lib/utils";
import ClockButtons from "./ClockButtons";
import EditableEntry from "./EditableEntry";
import ManageJobs from "./ManageJobs";
import TimesheetActions from "./TimesheetActions";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/timeclock", label: "Time Clock" },
  { href: "/estimates", label: "Estimates" },
  { href: "/customers", label: "Customers" },
  { href: "/admin", label: "👤 Manage Users" },
  { href: "/admin/timesheets", label: "📋 Timesheets" },
];

export default async function TimeClock() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get profile for pay rate
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, pay_rate")
    .eq("id", user?.id ?? "")
    .single();

  // Get available jobs for clock-in dropdown
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, name")
    .order("name");

  // Check if currently clocked in
  const { data: activeEntry } = await supabase
    .from("time_entries")
    .select("id, clock_in, project_id")
    .eq("employee_id", user?.id ?? "")
    .is("clock_out", null)
    .maybeSingle();

  // Recent time entries (last 14 days)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const { data: recentEntries } = await supabase
    .from("time_entries")
    .select("id, clock_in, clock_out, project_id, flagged, flag_reason")
    .eq("employee_id", user?.id ?? "")
    .gte("clock_in", twoWeeksAgo.toISOString())
    .order("clock_in", { ascending: false })
    .limit(50);

  // Calculate totals for this pay period
  const totalHours = (recentEntries ?? []).reduce((sum, e: any) => {
    if (e.clock_out) {
      const hours = (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 3600000;
      return sum + hours;
    }
    return sum;
  }, 0);

  const payRate = Number(profile?.pay_rate || 0);
  const totalPay = totalHours * payRate;

  return (
    <Shell nav={nav} title="Time Clock">
      {/* Clock In/Out Controls */}
      <ClockButtons
        activeEntry={activeEntry}
        jobs={jobs ?? []}
        userId={user?.id ?? ""}
      />

      {/* Pay Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, margin: "28px 0" }}>
        <div className="card">
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Hours (14 days)</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{formatHours(totalHours)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Pay Rate</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
            {payRate > 0 ? `${moneyDecimal(payRate)}/hr` : "Not set"}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Earned (14 days)</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: "#166534" }}>
            {payRate > 0 ? moneyDecimal(totalPay) : "—"}
          </div>
        </div>
      </div>

      {/* Recent Entries — Editable */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Recent Entries</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
        Click <strong>Edit</strong> on any row to change the time, job, or clear a flag.
      </p>
      <div className="card" style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
          <thead>
            <tr style={{ background: "#f8fafc", color: "#64748b", fontSize: 12 }}>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>Date</th>
              <th style={{ textAlign: "left" }}>In</th>
              <th style={{ textAlign: "left" }}>Out</th>
              <th style={{ textAlign: "left" }}>Job</th>
              <th style={{ textAlign: "right" }}>Hours</th>
              <th style={{ textAlign: "right" }}>Pay</th>
              <th style={{ textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(recentEntries ?? []).map((e: any) => (
              <EditableEntry key={e.id} entry={e} jobs={jobs ?? []} payRate={payRate} />
            ))}
            {(recentEntries ?? []).length === 0 && (
              <tr><td colSpan={7} style={{ padding: 20, color: "#94a3b8", textAlign: "center" }}>
                No time entries yet. Clock in to get started!
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Manage Jobs */}
      <ManageJobs jobs={jobs ?? []} />

      {/* Print & Email Timesheet */}
      <TimesheetActions />
    </Shell>
  );
}
