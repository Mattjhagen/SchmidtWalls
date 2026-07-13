"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/callback` },
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#1e293b" }}>
      <div className="card" style={{ width: 380, maxWidth: "92vw" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            SCHMIDT<span style={{ color: "#206BD4" }}>.</span>
          </div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Construction Portal</div>
        </div>

        {sent ? (
          <p style={{ fontSize: 14 }}>
            Check your inbox — we sent a secure sign-in link to <b>{email}</b>.
          </p>
        ) : (
          <form onSubmit={sendLink}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Email address</label>
            <input className="input" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              style={{ margin: "6px 0 12px" }} />
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Sending…" : "Send sign-in link"}
            </button>
            {err && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 10 }}>{err}</p>}
          </form>
        )}
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16, textAlign: "center" }}>
          Employees &amp; customers use the same link — you&apos;ll land in the right place automatically.
        </p>
      </div>
    </div>
  );
}
