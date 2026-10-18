import "server-only";
import webpush from "web-push";
import { createServiceClient } from "./supabase/server";

type Payload = { title: string; body: string; url?: string; tag?: string };

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:info@undralmarket.mn", pub, priv);
  configured = true;
  return true;
}

/**
 * Sends a web push to residents. `to` is either a list of resident ids or "staff".
 * Silently does nothing when VAPID keys or the service-role key are missing.
 */
export async function sendPush(to: string[] | "staff", payload: Payload) {
  const sb = createServiceClient();
  if (!sb || !configure()) return;

  let residents = sb.from("residents").select("id").eq("notify_push", true).eq("status", "approved");
  residents = to === "staff" ? residents.in("role", ["staff", "owner"]) : residents.in("id", to.length ? to : ["00000000-0000-0000-0000-000000000000"]);
  const { data: people } = await residents;
  const ids = (people ?? []).map((r) => r.id);
  if (!ids.length) return;

  const { data: subs } = await sb.from("push_subscriptions").select("*").in("resident_id", ids);
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 30, urgency: "high" },
        );
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }),
  );
}

/** Everyone in the apartment who has push enabled (family members see the same orders). */
export async function apartmentResidentIds(apartmentId: string) {
  const sb = createServiceClient();
  if (!sb) return [];
  const { data } = await sb.from("residents").select("id").eq("apartment_id", apartmentId);
  return (data ?? []).map((r) => r.id as string);
}
