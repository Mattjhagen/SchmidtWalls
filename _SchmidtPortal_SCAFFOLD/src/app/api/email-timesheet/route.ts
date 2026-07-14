import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Emails the timesheet HTML to the boss
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { startDate, endDate, recipientEmail } = await request.json();
  const boss = recipientEmail || "mikiel@schmidt-construction.com";

  // Get employee profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, pay_rate")
    .eq("id", user.id)
    .single();

  // Get time entries
  const start = startDate || getDefaultStart();
  const end = endDate || new Date().toISOString().split("T")[0];

  const { data: entries } = await supabase
    .from("time_entries")
    .select("id, clock_in, clock_out, project_id, flagged")
    .eq("employee_id", user.id)
    .gte("clock_in", `${start}T00:00:00`)
    .lte("clock_in", `${end}T23:59:59`)
    .order("clock_in", { ascending: true });

  const { data: jobs } = await supabase.from("jobs").select("id, name");
  const jobMap: Record<string, string> = {};
  (jobs || []).forEach((j: any) => { jobMap[j.id] = j.name; });

  // Calculate
  let totalHours = 0;
  const rows = (entries || []).map((e: any) => {
    const hours = e.clock_out
      ? (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 3600000
      : 0;
    totalHours += hours;
    return { date: e.clock_in, clockIn: e.clock_in, clockOut: e.clock_out, job: jobMap[e.project_id] || "—", hours };
  });

  const payRate = Number(profile?.pay_rate || 0);
  const totalPay = totalHours * payRate;
  const employeeName = profile?.full_name || profile?.email || "Employee";

  // Build email HTML
  const emailHtml = buildEmailHTML(employeeName, start, end, rows, totalHours, payRate, totalPay);

  // Send via Resend (already configured for schmidtwalls.com)
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "Schmidt Portal <noreply@schmidtwalls.com>",
      to: [boss],
      cc: [user.email],
      subject: `Timesheet: ${employeeName} (${formatShort(start)} – ${formatShort(end)})`,
      html: emailHtml,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `Email failed: ${err}` }, { status: 500 });
  }

  return NextResponse.json({ message: `Timesheet emailed to ${boss}`, cc: user.email });
}

function getDefaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 13);
  return d.toISOString().split("T")[0];
}

function formatShort(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildEmailHTML(
  name: string, start: string, end: string,
  rows: any[], totalHours: number, payRate: number, totalPay: number
): string {
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const periodStart = new Date(start + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const periodEnd = new Date(end + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return `
<div style="font-family:'Segoe UI',sans-serif;max-width:700px;margin:0 auto;color:#1e293b;">
  <div style="border-bottom:3px solid #206BD4;padding-bottom:16px;margin-bottom:24px;">
    <h1 style="font-size:20px;margin:0;font-weight:800;">SCHMIDT <span style="color:#206BD4;">CONSTRUCTION</span> INC.</h1>
    <p style="font-size:12px;color:#64748b;margin:4px 0 0;">Omaha, NE • (402) 320-2600</p>
  </div>

  <h2 style="color:#206BD4;font-size:18px;margin-bottom:16px;">Timesheet Submission</h2>

  <table style="width:100%;margin-bottom:16px;font-size:14px;" cellpadding="0" cellspacing="0">
    <tr><td style="padding:4px 0;color:#64748b;width:120px;">Employee:</td><td style="font-weight:700;">${name}</td></tr>
    <tr><td style="padding:4px 0;color:#64748b;">Period:</td><td>${periodStart} — ${periodEnd}</td></tr>
    <tr><td style="padding:4px 0;color:#64748b;">Total Hours:</td><td style="font-weight:700;">${totalHours.toFixed(2)}</td></tr>
    ${payRate > 0 ? `<tr><td style="padding:4px 0;color:#64748b;">Total Pay:</td><td style="font-weight:700;color:#166534;">$${totalPay.toFixed(2)}</td></tr>` : ""}
  </table>

  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
    <thead>
      <tr style="background:#1e293b;color:#fff;">
        <th style="padding:8px 10px;text-align:left;">Date</th>
        <th style="padding:8px 10px;text-align:left;">In</th>
        <th style="padding:8px 10px;text-align:left;">Out</th>
        <th style="padding:8px 10px;text-align:left;">Job</th>
        <th style="padding:8px 10px;text-align:right;">Hours</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"};">
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${fmtDate(r.clockIn)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${fmtTime(r.clockIn)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${r.clockOut ? fmtTime(r.clockOut) : "—"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">${r.job}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${r.hours.toFixed(2)}</td>
      </tr>`).join("")}
    </tbody>
  </table>

  <p style="font-size:12px;color:#94a3b8;">Sent from Schmidt Construction Portal • login.schmidtwalls.com</p>
</div>`;
}
