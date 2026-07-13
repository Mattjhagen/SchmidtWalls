import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next"); // optional deep-link (e.g. /portal/estimates/xxx)

  // Prefer the configured site URL (robust behind Render/Vercel proxies);
  // fall back to the request origin for local dev.
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || url.origin;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (next && next.startsWith("/")) {
        return NextResponse.redirect(`${base}${next}`);
      }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      const dest = profile?.role === "customer" ? "/portal" : "/dashboard";
      return NextResponse.redirect(`${base}${dest}`);
    }
  }
  return NextResponse.redirect(`${base}/login`);
}
