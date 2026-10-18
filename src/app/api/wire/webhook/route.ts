import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getIntent, verifyWebhook, wireEnabled } from "@/lib/wire";

// Wire POSTs signed events here. Register https://<site>/api/wire/webhook for payment_intent.succeeded
// and put the whsec_ secret it returns in WIRE_WEBHOOK_SECRET. Polling on the order page covers local dev.
export async function POST(request: NextRequest) {
  const secret = process.env.WIRE_WEBHOOK_SECRET;
  const body = await request.text();
  if (!wireEnabled || !secret || !verifyWebhook(body, request.headers.get("wirepayment-signature") ?? "", secret)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = JSON.parse(body) as { type: string; data?: { id?: string } };
  const intentId = event.data?.id;
  // Anything else (incl. the endpoint.verification ping) only needs a 2xx
  if (event.type !== "payment_intent.succeeded" || !intentId) return NextResponse.json({ ok: true });

  const sb = createServiceClient();
  if (!sb) return NextResponse.json({ ok: false }, { status: 500 });
  const { data: order } = await sb.from("orders").select("id, total, paid").eq("payment_ref", intentId).maybeSingle();
  if (order && !order.paid) {
    // Same rule as the old QPay callback: re-check with the gateway before marking paid
    const intent = await getIntent(intentId);
    if (intent.status === "succeeded" && intent.amount === order.total) {
      await sb.from("orders").update({ paid: true }).eq("id", order.id);
    }
  }
  return NextResponse.json({ ok: true });
}
