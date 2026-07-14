import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();

  // Verify caller is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Only admins can set pay rates" }, { status: 403 });
  }

  const { userId, payRate } = await request.json();

  if (!userId || payRate === undefined) {
    return NextResponse.json({ error: "userId and payRate are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ pay_rate: Number(payRate) })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `Pay rate set to $${payRate}/hr` });
}
