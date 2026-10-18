import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OrderLive } from "@/components/shop/order-live";
import { createClient } from "@/lib/supabase/server";
import { getMe, getSettings } from "@/lib/data";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Захиалгын явц" };

export default async function OrderPage(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const me = await getMe();
  if (!me) redirect(`/login?next=/orders/${id}`);
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const sb = await createClient();
  // RLS: only this apartment's orders are visible
  const [{ data }, settings] = await Promise.all([
    sb.from("orders").select("*, order_items(*)").eq("id", orderId).maybeSingle(),
    getSettings(),
  ]);
  if (!data) notFound();

  return <OrderLive initial={data as Order} settings={settings} justPlaced={sp.new === "1"} />;
}
