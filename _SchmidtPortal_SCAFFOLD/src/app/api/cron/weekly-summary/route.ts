import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Weekly Timesheet Summary Cron
 * 
 * Aggregates time entries from the past 7 days, groups by employee,
 * calculates hours + pay, and emails a formatted summary.
 * 
 * Protected by CRON_SECRET to prevent unauthorized access.
 * 
 * SETUP OPTIONS:
 * 
 * 1. Render Cron Job:
 *    - Deploy your Next.js app to Render
 *    - Go to Dashboard → Cron Jobs → New Cron Job
 *    - Command: curl -X POST https://your-app.onrender.com/api/cron/weekly-summary -H "Authorization: Bearer YOUR_CRON_SECRET"
 *    - Schedule: 0 8 * * 1 (Every Monday at 8am UTC)
 * 
 * 2. Supabase Edge Function Cron:
 *    - Create edge function: supabase functions new weekly-summary
 *    - In supabase/functions/weekly-summary/index.ts, call this endpoint
 *    - Set schedule in supabase/config.toml:
 *      [functions.weekly-summary]
 *      schedule = "0 8 * * 1"
 * 
 * 3. Vercel Cron (if deployed to Vercel):
 *    - Add to vercel.json:
 *      { "crons": [{ "path": "/api/cron/weekly-summary", "schedule": "0 8 * * 1" }] }
 * 
 * Environment Variables Required:
 * - RESEND_API_KEY: Resend API key for sending emails
 * - CRON_SECRET: Secret token to authenticate cron requests
 * - SUPABASE_SERVICE_ROLE_KEY: For admin access to all time entries
 */

export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  try {
    const supabase = createAdminClient();

    // Get time entries from the past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: entries, error: entriesError } = await supabase
      .from("time_entries")
      .select(`
        id, clock_in, clock_out, break_minutes, notes, flagged, flag_reason,
        employee:profiles!employee_id(id, full_name, email, pay_rate),
        project:jobs!project_id(name)
      `)
      .gte("clock_in", sevenDaysAgo.toISOString())
      .not("clock_out", "is", null)
      .order("clock_in", { ascending: true });

    if (entriesError) {
      return NextResponse.json({ error: entriesError.message }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ message: "No time entries this week — no email sent." });
    }

    // Group by employee
    interface EmployeeSummary {
      name: string;
      email: string;
      payRate: number;
      totalHours: number;
      totalPay: number;
      entries: {
        date: string;
        project: string;
        hours: number;
        flagged: boolean;
        flagReason: string | null;
      }[];
    }

    const employeeMap: Record<string, EmployeeSummary> = {};

    for (const entry of entries as any[]) {
      const emp = entry.employee;
      if (!emp) continue;

      const empId = emp.id;
      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          name: emp.full_name || emp.email || "Unknown",
          email: emp.email || "",
          payRate: Number(emp.pay_rate) || 0,
          totalHours: 0,
          totalPay: 0,
          entries: [],
        };
      }

      const clockIn = new Date(entry.clock_in);
      const clockOut = new Date(entry.clock_out);
      const breakMin = Number(entry.break_minutes) || 0;
      const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60) - breakMin / 60;

      employeeMap[empId].totalHours += hoursWorked;
      employeeMap[empId].entries.push({
        date: clockIn.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        project: entry.project?.name || "Unassigned",
        hours: Math.round(hoursWorked * 100) / 100,
        flagged: entry.flagged || false,
        flagReason: entry.flag_reason,
      });
    }

    // Calculate totals and pay
    let grandTotalHours = 0;
    let grandTotalPay = 0;

    for (const emp of Object.values(employeeMap)) {
      emp.totalPay = emp.totalHours * emp.payRate;
      grandTotalHours += emp.totalHours;
      grandTotalPay += emp.totalPay;
    }

    // Build HTML email
    const weekStart = sevenDaysAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const weekEnd = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const employeeRows = Object.values(employeeMap)
      .sort((a, b) => b.totalHours - a.totalHours)
      .map((emp) => {
        const flaggedCount = emp.entries.filter((e) => e.flagged).length;
        return `
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;">${emp.name}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:center;">${formatHours(emp.totalHours)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:center;">$${emp.payRate.toFixed(2)}/hr</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">$${emp.totalPay.toFixed(2)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:center;">${flaggedCount > 0 ? `<span style="color:#dc2626;">⚠ ${flaggedCount}</span>` : "✓"}</td>
          </tr>
        `;
      })
      .join("");

    const detailSections = Object.values(employeeMap)
      .sort((a, b) => b.totalHours - a.totalHours)
      .map((emp) => {
        const rows = emp.entries
          .map((e) => `
            <tr>
              <td style="padding:6px 10px;font-size:13px;">${e.date}</td>
              <td style="padding:6px 10px;font-size:13px;">${e.project}</td>
              <td style="padding:6px 10px;font-size:13px;text-align:right;">${e.hours.toFixed(2)}h</td>
              <td style="padding:6px 10px;font-size:13px;">${e.flagged ? `<span style="color:#dc2626;">⚠ ${e.flagReason || "Flagged"}</span>` : ""}</td>
            </tr>
          `)
          .join("");

        return `
          <div style="margin-top:20px;">
            <h3 style="font-size:15px;margin-bottom:8px;color:#1e293b;">${emp.name}</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead><tr style="background:#f8fafc;">
                <th style="text-align:left;padding:6px 10px;">Date</th>
                <th style="text-align:left;padding:6px 10px;">Project</th>
                <th style="text-align:right;padding:6px 10px;">Hours</th>
                <th style="padding:6px 10px;">Flags</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
      })
      .join("");

    const htmlBody = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;max-width:700px;margin:0 auto;">
        <div style="background:#1e293b;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;font-size:20px;">SCHMIDT<span style="color:#206BD4">.</span> Weekly Timesheet Summary</h1>
          <p style="margin:6px 0 0;font-size:14px;color:#94a3b8;">${weekStart} – ${weekEnd}</p>
        </div>
        
        <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;">
          <!-- Summary stats -->
          <div style="display:flex;gap:20px;margin-bottom:24px;flex-wrap:wrap;">
            <div style="background:#f0f9ff;padding:14px 20px;border-radius:8px;flex:1;min-width:140px;">
              <div style="font-size:12px;color:#64748b;">Total Hours</div>
              <div style="font-size:22px;font-weight:800;">${formatHours(grandTotalHours)}</div>
            </div>
            <div style="background:#f0fdf4;padding:14px 20px;border-radius:8px;flex:1;min-width:140px;">
              <div style="font-size:12px;color:#64748b;">Total Labor Cost</div>
              <div style="font-size:22px;font-weight:800;">$${grandTotalPay.toFixed(2)}</div>
            </div>
            <div style="background:#f8fafc;padding:14px 20px;border-radius:8px;flex:1;min-width:140px;">
              <div style="font-size:12px;color:#64748b;">Employees</div>
              <div style="font-size:22px;font-weight:800;">${Object.keys(employeeMap).length}</div>
            </div>
          </div>

          <!-- Employee summary table -->
          <h2 style="font-size:16px;margin-bottom:12px;">Employee Summary</h2>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f8fafc;color:#64748b;font-size:13px;">
                <th style="text-align:left;padding:10px 14px;">Employee</th>
                <th style="text-align:center;padding:10px 14px;">Hours</th>
                <th style="text-align:center;padding:10px 14px;">Rate</th>
                <th style="text-align:right;padding:10px 14px;">Pay</th>
                <th style="text-align:center;padding:10px 14px;">Flags</th>
              </tr>
            </thead>
            <tbody>${employeeRows}</tbody>
            <tfoot>
              <tr style="background:#f8fafc;font-weight:800;">
                <td style="padding:12px 14px;">TOTAL</td>
                <td style="padding:12px 14px;text-align:center;">${formatHours(grandTotalHours)}</td>
                <td style="padding:12px 14px;"></td>
                <td style="padding:12px 14px;text-align:right;">$${grandTotalPay.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <!-- Detailed breakdown -->
          <h2 style="font-size:16px;margin-top:32px;margin-bottom:4px;">Detailed Breakdown</h2>
          ${detailSections}

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0 16px;" />
          <p style="font-size:12px;color:#94a3b8;text-align:center;">
            This is an automated report from Schmidt Construction Portal.<br/>
            Generated ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CT
          </p>
        </div>
      </div>
    `;

    // Send via Resend
    const recipients = [
      "mikiel@schmidt-construction.com",
      "matty@purepulse.one",
    ];

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "noreply@schmidtwalls.com",
        to: recipients,
        subject: `Weekly Timesheet Summary — ${weekStart} to ${weekEnd}`,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const resendErr = await resendRes.text();
      return NextResponse.json(
        { error: `Failed to send email: ${resendErr}` },
        { status: 502 }
      );
    }

    const resendData = await resendRes.json();

    return NextResponse.json({
      message: "Weekly summary sent successfully",
      emailId: resendData.id,
      stats: {
        employees: Object.keys(employeeMap).length,
        totalHours: Math.round(grandTotalHours * 100) / 100,
        totalPay: Math.round(grandTotalPay * 100) / 100,
        entries: entries.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing / manual trigger
export async function GET(request: Request) {
  return POST(request);
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}
