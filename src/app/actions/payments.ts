"use server";

import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkoutUrl, createIntent, getIntent, wireEnabled } from "@/lib/wire";

export type QPayResult =
  | { status: "disabled" }
  | { status: "paid" }
  | { status: "checkout"; url: string }
  | { status: "error" };

/** Opens (or reuses) a Wire payment for the resident's own unpaid "qpay" order. */
export async function getQPayCheckout(orderId: number): Promise<QPayResult> {
  if (!wireEnabled) return { status: "disabled" };
  const sb = await createClient();
  // RLS guarantees this is the caller's apartment
  const { data: order } = await sb.from("orders").select("id, total, paid, payment, payment_ref").eq("id", orderId).maybeSingle();
  if (!order || order.payment !== "qpay") return { status: "error" };
  if (order.paid) return { status: "paid" };

  const service = createServiceClient();
  if (!service) return { status: "error" };
  try {
    // Reuse the open payment so a reload or the return from pay.wire.mn doesn't start a second one
    let intent = order.payment_ref ? await getIntent(order.payment_ref) : null;
    if (intent?.status === "succeeded" && intent.amount === order.total) {
      await service.from("orders").update({ paid: true }).eq("id", order.id);
      return { status: "paid" };
    }
    if (!intent || intent.status === "canceled") {
      intent = await createIntent(order.id, order.total);
      await service.from("orders").update({ payment_ref: intent.id }).eq("id", order.id);
    }
    const h = await headers();
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
    return { status: "checkout", url: await checkoutUrl(intent.id, `${origin}/orders/${order.id}`) };
  } catch (e) {
    console.error(`Order #${order.id} payment:`, e);
    return { status: "error" };
  }
}

export async function checkQPay(orderId: number): Promise<boolean> {
  if (!wireEnabled) return false;
  const sb = await createClient();
  const { data: order } = await sb.from("orders").select("id, total, paid, payment_ref").eq("id", orderId).maybeSingle();
  if (!order) return false;
  if (order.paid) return true;
  if (!order.payment_ref) return false;
  const intent = await getIntent(order.payment_ref).catch(() => null);
  if (intent?.status !== "succeeded" || intent.amount !== order.total) return false;
  await createServiceClient()?.from("orders").update({ paid: true }).eq("id", order.id);
  return true;
}
