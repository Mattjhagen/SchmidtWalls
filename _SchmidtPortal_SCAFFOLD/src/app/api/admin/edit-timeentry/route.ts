import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify caller is admin/employee
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "customer") {
    return NextResponse.json({ error: "Only staff can edit time entries" }, { status: 403 });
  }

  const { entryId, clockIn, clockOut, jobId, clearFlag } = await request.json();

  if (!entryId || !clockIn) {
    return NextResponse.json({ error: "entryId and clockIn are required" }, { status: 400 });
  }

  // Build update object
  const update: Record<string, any> = {
    clock_in: clockIn,
    edited_by: user.id,
    edited_at: new Date().toISOString(),
  };

  if (clockOut) {
    update.clock_out = clockOut;
  }

  if (jobId !== undefined) {
    update.project_id = jobId || null;
  }

  if (clearFlag) {
    update.flagged = false;
    update.flag_reason = null;
  }

  const { error } = await supabase
    .from("time_entries")
    .update(update)
    .eq("id", entryId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Time entry updated" });
}
