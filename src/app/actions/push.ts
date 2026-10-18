"use server";

import { createClient } from "@/lib/supabase/server";

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function savePushSubscription(sub: Sub) {
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid || !sub?.endpoint?.startsWith("https://")) return { ok: false };
  await sb.from("push_subscriptions").upsert({
    endpoint: sub.endpoint,
    resident_id: uid,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  });
  await sb.rpc("set_notify_push", { p_on: true });
  return { ok: true };
}

export async function disablePush(endpoint: string | null) {
  const sb = await createClient();
  if (endpoint) await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  await sb.rpc("set_notify_push", { p_on: false });
  return { ok: true };
}
