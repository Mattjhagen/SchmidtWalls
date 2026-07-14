import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Generates an HTML timesheet with Schmidt Construction letterhead
// Can be printed as PDF from the browser, or emailed as HTML
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start") || getDefaultStart();
  const endDate = searchParams.get("end") || new Date().toISOString().split("T")[0];

  // Get employee profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, pay_rate")
    .eq("id", user.id)
    .single();

  // Get time entries for the period
  const { data: entries } = await supabase
    .from("time_entries")
    .select("id, clock_in, clock_out, project_id, flagged")
    .eq("employee_id", user.id)
    .gte("clock_in", `${startDate}T00:00:00`)
    .lte("clock_in", `${endDate}T23:59:59`)
    .order("clock_in", { ascending: true });

  // Get job names
  const { data: jobs } = await supabase.from("jobs").select("id, name");
  const jobMap: Record<string, string> = {};
  (jobs || []).forEach((j: any) => { jobMap[j.id] = j.name; });

  // Calculate totals
  let totalHours = 0;
  const rows = (entries || []).map((e: any) => {
    const hours = e.clock_out
      ? (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 3600000
      : 0;
    totalHours += hours;
    return {
      date: new Date(e.clock_in).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      clockIn: new Date(e.clock_in).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      clockOut: e.clock_out ? new Date(e.clock_out).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—",
      job: jobMap[e.project_id] || "—",
      hours: hours.toFixed(2),
      flagged: e.flagged,
    };
  });

  const payRate = Number(profile?.pay_rate || 0);
  const totalPay = totalHours * payRate;

  const html = generateTimesheetHTML({
    employeeName: profile?.full_name || profile?.email || "Employee",
    startDate,
    endDate,
    rows,
    totalHours,
    payRate,
    totalPay,
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

function getDefaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 13);
  return d.toISOString().split("T")[0];
}

interface TimesheetData {
  employeeName: string;
  startDate: string;
  endDate: string;
  rows: { date: string; clockIn: string; clockOut: string; job: string; hours: string; flagged: boolean }[];
  totalHours: number;
  payRate: number;
  totalPay: number;
}

function generateTimesheetHTML(data: TimesheetData): string {
  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Timesheet — ${data.employeeName}</title>
<style>
  @page { margin: 0.75in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', -apple-system, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; max-width: 850px; margin: 0 auto; }
  
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #206BD4; padding-bottom: 20px; margin-bottom: 30px; }
  .logo-area h1 { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
  .logo-area h1 span { color: #206BD4; }
  .logo-area p { font-size: 12px; color: #64748b; margin-top: 4px; }
  .doc-title { text-align: right; }
  .doc-title h2 { font-size: 20px; color: #206BD4; font-weight: 700; }
  .doc-title p { font-size: 13px; color: #64748b; }

  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; padding: 16px 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
  .meta-item label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta-item p { font-size: 14px; font-weight: 600; margin-top: 2px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #1e293b; color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 10px 12px; text-align: left; }
  thead th:last-child { text-align: right; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .flagged { background: #fef3c7 !important; }

  .totals { display: flex; justify-content: flex-end; gap: 30px; padding: 16px 20px; background: #f1f5f9; border-radius: 8px; margin-bottom: 40px; }
  .total-item { text-align: right; }
  .total-item label { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; }
  .total-item p { font-size: 20px; font-weight: 800; color: #0f172a; }
  .total-item p.pay { color: #166534; }

  .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; }
  .sig-line { width: 220px; border-bottom: 1px solid #94a3b8; margin-top: 30px; }
  .sig-label { font-size: 11px; color: #64748b; margin-top: 4px; }

  .print-hide { margin-bottom: 20px; }
  @media print { .print-hide { display: none; } }
</style>
</head>
<body>

<div class="print-hide">
  <button onclick="window.print()" style="background:#206BD4;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;margin-right:10px;">
    🖨️ Print / Save as PDF
  </button>
  <button onclick="window.close()" style="background:#e2e8f0;color:#475569;border:none;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">
    Close
  </button>
</div>

<div class="header">
  <div class="logo-area">
    <h1>SCHMIDT <span>CONSTRUCTION</span> INC.</h1>
    <p>Omaha, NE • (402) 320-2600 • schmidt-construction.com</p>
  </div>
  <div class="doc-title">
    <h2>TIMESHEET</h2>
    <p>Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
  </div>
</div>

<div class="meta">
  <div class="meta-item">
    <label>Employee</label>
    <p>${data.employeeName}</p>
  </div>
  <div class="meta-item">
    <label>Pay Period</label>
    <p>${formatDate(data.startDate)} — ${formatDate(data.endDate)}</p>
  </div>
  <div class="meta-item">
    <label>Pay Rate</label>
    <p>${data.payRate > 0 ? "$" + data.payRate.toFixed(2) + "/hr" : "—"}</p>
  </div>
  <div class="meta-item">
    <label>Total Entries</label>
    <p>${data.rows.length}</p>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Clock In</th>
      <th>Clock Out</th>
      <th>Job / Project</th>
      <th>Hours</th>
    </tr>
  </thead>
  <tbody>
    ${data.rows.map(r => `
    <tr class="${r.flagged ? "flagged" : ""}">
      <td>${r.date}</td>
      <td>${r.clockIn}</td>
      <td>${r.clockOut}</td>
      <td>${r.job}</td>
      <td>${r.hours}</td>
    </tr>`).join("")}
    ${data.rows.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px;">No entries for this period.</td></tr>' : ""}
  </tbody>
</table>

<div class="totals">
  <div class="total-item">
    <label>Total Hours</label>
    <p>${data.totalHours.toFixed(2)}</p>
  </div>
  ${data.payRate > 0 ? `
  <div class="total-item">
    <label>Total Pay</label>
    <p class="pay">$${data.totalPay.toFixed(2)}</p>
  </div>` : ""}
</div>

<div class="footer">
  <div>
    <div class="sig-line"></div>
    <div class="sig-label">Employee Signature</div>
  </div>
  <div>
    <div class="sig-line"></div>
    <div class="sig-label">Supervisor Signature</div>
  </div>
  <div>
    <div class="sig-line"></div>
    <div class="sig-label">Date</div>
  </div>
</div>

</body>
</html>`;
}
