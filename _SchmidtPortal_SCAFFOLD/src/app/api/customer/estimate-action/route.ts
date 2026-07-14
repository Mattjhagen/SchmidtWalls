import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Action = "accept" | "decline" | "request_changes";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { estimateId, action, message } = await request.json() as {
    estimateId: string;
    action: Action;
    message?: string;
  };

  if (!estimateId || !action) {
    return NextResponse.json({ error: "estimateId and action are required" }, { status: 400 });
  }

  const validActions: Action[] = ["accept", "decline", "request_changes"];
  if (!validActions.includes(action)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
      { status: 400 }
    );
  }

  // Get customer by user email
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("email", user.email ?? "")
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer record not found" }, { status: 403 });
  }

  // Verify the estimate belongs to this customer
  const { data: estimate } = await supabase
    .from("estimates")
    .select("id, customer_id, status")
    .eq("id", estimateId)
    .eq("customer_id", customer.id)
    .single();

  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found or access denied" }, { status: 404 });
  }

  // Don't allow action on already-finalized estimates
  if (["accepted", "declined"].includes(estimate.status)) {
    return NextResponse.json(
      { error: `This estimate has already been ${estimate.status}` },
      { status: 400 }
    );
  }

  // Map action to new status
  const statusMap: Record<Action, string> = {
    accept: "accepted",
    decline: "declined",
    request_changes: "changes_requested",
  };

  const newStatus = statusMap[action];

  // Update estimate status
  const { error: updateError } = await supabase
    .from("estimates")
    .update({ status: newStatus })
    .eq("id", estimateId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // If requesting changes, create a change_request record
  if (action === "request_changes") {
    const changeMessage = message || "Customer requested changes (no details provided)";

    const { error: crError } = await supabase
      .from("change_requests")
      .insert({
        estimate_id: estimateId,
        customer_id: customer.id,
        message: changeMessage,
        status: "pending",
      });

    if (crError) {
      // Log but don't fail the status update
      console.error("Failed to create change request:", crError.message);
    }
  }

  return NextResponse.json({
    message: `Estimate ${newStatus.replace("_", " ")} successfully`,
    status: newStatus,
  });
}
