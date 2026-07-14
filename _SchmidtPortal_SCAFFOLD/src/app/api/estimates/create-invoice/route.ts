import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify employee/admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "employee"].includes(profile.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { estimateId } = await request.json();

  if (!estimateId) {
    return NextResponse.json({ error: "Estimate ID is required" }, { status: 400 });
  }

  // Fetch the estimate
  const { data: estimate, error: estError } = await supabase
    .from("estimates")
    .select("id, customer_id, job_id, total, status, tax_rate")
    .eq("id", estimateId)
    .single();

  if (estError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  // Only allow invoicing accepted estimates
  if (estimate.status !== "accepted") {
    return NextResponse.json(
      { error: "Only accepted estimates can be invoiced" },
      { status: 400 }
    );
  }

  // Check if invoice already exists for this estimate
  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .eq("estimate_id", estimateId)
    .single();

  if (existingInvoice) {
    return NextResponse.json(
      { error: `Invoice already exists: ${existingInvoice.invoice_number}` },
      { status: 409 }
    );
  }

  // Generate invoice number: INV-2026-XXX
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true });

  const seqNum = ((count ?? 0) + 1).toString().padStart(3, "0");
  const invoiceNumber = `INV-${year}-${seqNum}`;

  // Calculate due date (30 days from now)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  // Calculate total amount including tax
  const subtotal = Number(estimate.total) || 0;
  const taxRate = Number(estimate.tax_rate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const amountDue = subtotal + taxAmount;

  // Create the invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      customer_id: estimate.customer_id,
      job_id: estimate.job_id,
      estimate_id: estimate.id,
      invoice_number: invoiceNumber,
      status: "pending",
      amount_due: amountDue,
      due_date: dueDate.toISOString().split("T")[0],
    })
    .select("id, invoice_number, amount_due, due_date, status")
    .single();

  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Invoice created successfully",
    invoice,
  });
}
