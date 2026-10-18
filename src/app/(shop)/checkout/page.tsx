import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { getMe, getSettings, getTabBalance } from "@/lib/data";
import { aptLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Захиалах" };

export default async function CheckoutPage() {
  const [settings, me] = await Promise.all([getSettings(), getMe()]);
  if (!me) redirect("/login?next=/checkout");
  if (me.status !== "approved" || !me.apartment) redirect("/cart");
  const tab = me.apartment.tab_enabled
    ? { balance: await getTabBalance(me.apartment.id), limit: me.apartment.tab_limit }
    : null;

  return (
    <CheckoutForm
      address={aptLabel(me.apartment)}
      residentName={me.name}
      settings={settings}
      tab={tab}
    />
  );
}
