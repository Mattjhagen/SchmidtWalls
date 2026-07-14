import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: list all jobs (with customer info for the Kanban board)
export async function GET(request: Request) {
  const supabase = await createClient();

  // Check if specific job requested
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");

  if (jobId) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, name, status, address, notes, created_at, customer:customers(name, full_name, company)")
      .eq("id", jobId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("jobs")
    .select("id, name, status, address, created_at, customer_id, customer:customers(name, full_name, company)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: create a new job
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "employee"].includes(profile.role)) {
    return NextResponse.json({ error: "Only staff can manage jobs" }, { status: 403 });
  }

  const { name, customerId, address } = await request.json();
  if (!name) return NextResponse.json({ error: "Job name is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      name,
      customer_id: customerId || null,
      address: address || null,
      status: "estimating",
    })
    .select("id, name, status, address, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE: remove a job
export async function DELETE(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");
  if (!jobId) return NextResponse.json({ error: "Job ID required" }, { status: 400 });

  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "Deleted" });
}
