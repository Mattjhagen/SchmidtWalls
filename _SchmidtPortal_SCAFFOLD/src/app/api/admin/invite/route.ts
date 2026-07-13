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
    return NextResponse.json({ error: "Only admins can invite users" }, { status: 403 });
  }

  const { email, name, role } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!["employee", "customer", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check if user already exists
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find(u => u.email === email);

  if (existingUser) {
    // User exists — just update their role
    await admin.from("profiles").upsert({
      id: existingUser.id,
      email,
      full_name: name || existingUser.user_metadata?.full_name || "",
      role,
    });

    return NextResponse.json({
      message: `Updated ${email} to ${role}`,
      status: "updated",
    });
  }

  // Create new user via invite (sends magic link email)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://login.schmidtwalls.com";
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { full_name: name || "", role },
      redirectTo: `${siteUrl}/callback`,
    }
  );

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  // Create profile with the assigned role
  if (inviteData?.user) {
    await admin.from("profiles").upsert({
      id: inviteData.user.id,
      email,
      full_name: name || "",
      role,
    });
  }

  return NextResponse.json({
    message: `Invited ${email} as ${role}`,
    status: "invited",
  });
}
