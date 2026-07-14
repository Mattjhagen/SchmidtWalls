import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST: Clock in
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { projectId } = await request.json();

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      employee_id: user.id,
      clock_in: new Date().toISOString(),
      project_id: projectId || null,
    })
    .select("id, clock_in, project_id")
    .single();

  if (error) {
    console.error("Clock in error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

// PATCH: Clock out
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { entryId } = await request.json();

  const { error } = await supabase
    .from("time_entries")
    .update({ clock_out: new Date().toISOString() })
    .eq("id", entryId)
    .eq("employee_id", user.id);

  if (error) {
    console.error("Clock out error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "Clocked out" });
}
