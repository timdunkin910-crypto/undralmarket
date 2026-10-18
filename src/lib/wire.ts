import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

// Wire payment gateway (https://docs.wire.mn) behind the "QPay" payment option.
// Enabled only when WIRE_API_KEY (a live sk_live_ key — real money) is set.
const BASE = "https://api.wire.mn/v1";

export const wireEnabled = Boolean(process.env.WIRE_API_KEY);

export type PaymentIntent = {
  id: string;
  amount: number;
  status: "requires_payment_method" | "requires_action" | "processing" | "succeeded" | "canceled";
};

async function wire<T>(method: "GET" | "POST", path: string, body?: object, idempotencyKey?: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.WIRE_API_KEY}`,
      ...(body && { "Content-Type": "application/json" }),
      // Wire requires an Idempotency-Key on every POST; a replay returns the original response
      ...(method === "POST" && { "Idempotency-Key": idempotencyKey ?? randomUUID() }),
    },
    body: body && JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`Wire ${method} ${path} ${res.status} ${JSON.stringify(err?.error ?? err)}`);
  }
  return res.json() as Promise<T>;
}

export function createIntent(orderId: number, amount: number) {
  return wire<PaymentIntent>("POST", "/payment_intents", {
    amount,
    currency: "MNT",
    description: `undralmarket.mn захиалга #${orderId}`,
    metadata: { order_id: String(orderId) },
  });
}

export function getIntent(id: string) {
  return wire<PaymentIntent>("GET", `/payment_intents/${encodeURIComponent(id)}`);
}

/** Hosted pay.wire.mn page (QR + bank-app links). Keyed on the intent, so repeat calls return the same session. */
export async function checkoutUrl(intentId: string, returnUrl: string) {
  const session = await wire<{ url: string }>(
    "POST",
    "/checkout/sessions",
    { payment_intent: intentId, success_url: returnUrl, cancel_url: returnUrl },
    `checkout-${intentId}`,
  );
  return session.url;
}

/** Checks the WirePayment-Signature header (t=…,v1=…): HMAC-SHA256 of `${t}.${rawBody}`, hex. */
export function verifyWebhook(rawBody: string, header: string, secret: string, toleranceSeconds = 300) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]));
  const t = Number(parts.t);
  if (!parts.v1 || !Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > toleranceSeconds) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex"));
  const received = Buffer.from(parts.v1);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
