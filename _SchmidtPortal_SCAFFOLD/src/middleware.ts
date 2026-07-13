import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Public routes — no auth needed
  if (path === "/login" || path === "/callback") {
    // If already logged in and on login page, redirect to appropriate area
    if (user && path === "/login") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role || "customer";
      const dest = role === "customer" ? "/portal" : "/dashboard";
      const url = request.nextUrl.clone();
      url.pathname = dest;
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Not logged in → redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Get user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "customer";

  // Employee/admin areas
  const isStaffArea = path.startsWith("/dashboard") || path.startsWith("/timeclock")
    || path.startsWith("/estimates") || path.startsWith("/customers")
    || path.startsWith("/admin");

  // Customer area
  const isCustomerArea = path.startsWith("/portal");

  // Customers can't access staff areas
  if (isStaffArea && role === "customer") {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  // Staff can't accidentally land in customer portal (redirect to dashboard)
  // But allow it if they explicitly navigate there (for testing)

  // Admin-only area
  if (path.startsWith("/admin") && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Root path → redirect based on role
  if (path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = role === "customer" ? "/portal" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/", "/login", "/dashboard/:path*", "/timeclock/:path*",
    "/estimates/:path*", "/customers/:path*", "/admin/:path*",
    "/portal/:path*",
  ],
};
