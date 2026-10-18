import { OrderQueue } from "@/components/admin/order-queue";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { ORDER_SELECT } from "@/lib/queries";
import type { Order } from "@/lib/types";

/** Orders from the last 18 hours: today's shift plus anything left open overnight. */
function queueSince() {
  return new Date(Date.now() - 18 * 3600_000).toISOString();
}

export default async function AdminQueuePage() {
  const me = await requireStaff();
  const sb = await createClient();
  const since = queueSince();
  const [{ data }, settings] = await Promise.all([
    sb.from("orders").select(ORDER_SELECT).gte("created_at", since).order("created_at", { ascending: true }),
    getSettings(),
  ]);
  return <OrderQueue initial={(data as Order[]) ?? []} deliveryEnabled={settings.delivery_enabled} staffName={me.name} />;
}
