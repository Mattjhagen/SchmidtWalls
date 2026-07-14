import Link from "next/link";
import Shell from "@/components/shared/Shell";
import { createClient } from "@/lib/supabase/server";
import InviteForm from "./InviteForm";
import UserTable from "./UserTable";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/timeclock", label: "Time Clock" },
  { href: "/estimates", label: "Estimates" },
  { href: "/customers", label: "Customers" },
  { href: "/admin", label: "👤 Manage Users" },
  { href: "/admin/timesheets", label: "📋 Timesheets" },
];

export default async function AdminPage() {
  const supabase = await createClient();

  // Get all profiles (admin can see all via RLS policy)
  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, pay_rate, created_at")
    .order("created_at", { ascending: false });

  return (
    <Shell nav={nav} title="Manage Users">
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
        Invite employees or customers. Employees get full portal access (time clock, estimates, customers).
        Customers only see their own estimates and invoices.
        {" "}<Link href="/admin/timesheets" style={{ color: "#206BD4", fontWeight: 600 }}>View Timesheets →</Link>
      </p>

      <InviteForm />

      <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>
        All Users ({users?.length ?? 0})
      </h2>

      <UserTable users={users ?? []} />
    </Shell>
  );
}
