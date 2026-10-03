import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/src/lib/supabase/server";

// Paystack sends a charge.success event after a successful payment.
// This handler verifies the HMAC-SHA512 signature, looks up the order by
// paystack_ref, and calls submit_online_order_v1 to deduct stock and record
// the sale. The RPC uses SELECT ... FOR UPDATE to prevent duplicate processing
// if Paystack retries the webhook.

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();

  // 1. Verify Paystack signature
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("PAYSTACK_SECRET_KEY is not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const sigBuf  = Buffer.from(signature, "hex");
  const expBuf  = Buffer.from(expected,  "hex");

  const validLength    = sigBuf.length > 0 && sigBuf.length === expBuf.length;
  const signatureValid = validLength && timingSafeEqual(sigBuf, expBuf);

  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Parse event
  let event: { event: string; data: { reference: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only act on charge.success; acknowledge all other events with 200
  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const ref = event.data.reference;
  if (!ref) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 3. Look up the order
  const { data: order, error: lookupErr } = await supabase
    .from("online_orders")
    .select("id, status")
    .eq("paystack_ref", ref)
    .single();

  if (lookupErr || !order) {
    // Not our order (test transaction, unknown ref, etc.) — ack and move on
    console.warn(`Paystack webhook: no order found for ref ${ref}`);
    return NextResponse.json({ received: true });
  }

  if (order.status !== "pending_payment") {
    // Already processed (webhook retry or duplicate event)
    return NextResponse.json({ received: true });
  }

  // 4. Process the order — deduct stock and create the POS sale
  const { error: rpcErr } = await supabase.rpc("submit_online_order_v1", {
    p_order_id: order.id,
  });

  if (rpcErr) {
    // Log but still return 200 so Paystack doesn't keep retrying immediately.
    // Insufficient stock is an ops problem, not a signature problem.
    // A future monitoring alert should watch for status='paid' mismatches.
    console.error(`submit_online_order_v1 failed for order ${order.id}:`, rpcErr.message);
    return NextResponse.json({ received: true, warning: rpcErr.message });
  }

  return NextResponse.json({ received: true });
}

// Reject all other methods
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
