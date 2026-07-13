import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Shell({
  children, nav, title,
}: { children: React.ReactNode; nav: { href: string; label: string }[]; title: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 220, background: "#1e293b", color: "#e2e8f0", padding: "20px 14px" }}>
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 24, paddingLeft: 8 }}>
          SCHMIDT<span style={{ color: "#206BD4" }}>.</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {nav.map((n) => (
            <Link key={n.href} href={n.href}
              style={{ color: "#cbd5e1", textDecoration: "none", padding: "9px 12px", borderRadius: 8, fontSize: 14 }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <form action="/logout" method="post" style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: "#64748b", paddingLeft: 8 }}>{user?.email}</div>
        </form>
      </aside>
      <main style={{ flex: 1, padding: "28px 34px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 0 }}>{title}</h1>
        {children}
      </main>
    </div>
  );
}
