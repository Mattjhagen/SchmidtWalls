import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CustomerShell({
  children, title,
}: { children: React.ReactNode; title: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const nav = [
    { href: "/portal", label: "My Estimates" },
    { href: "/portal/invoices", label: "Invoices" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Top bar */}
      <header style={{
        background: "#1e293b", color: "#fff", padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>
            SCHMIDT<span style={{ color: "#206BD4" }}>.</span>
          </span>
          <nav style={{ display: "flex", gap: 4 }}>
            {nav.map((n) => (
              <Link key={n.href} href={n.href}
                style={{
                  color: "#cbd5e1", textDecoration: "none",
                  padding: "6px 14px", borderRadius: 6, fontSize: 14, fontWeight: 500,
                }}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>{user?.email}</span>
          <form action="/logout" method="post">
            <button style={{
              background: "transparent", border: "1px solid #475569",
              color: "#94a3b8", padding: "5px 12px", borderRadius: 6,
              fontSize: 12, cursor: "pointer",
            }}>
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>{title}</h1>
        {children}
      </main>
    </div>
  );
}
