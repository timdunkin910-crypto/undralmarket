import type { Metadata } from "next";
import { Suspense } from "react";
import { CartView } from "@/components/shop/cart-view";
import { getMe, getSettings } from "@/lib/data";
import Loading from "../loading";

export const metadata: Metadata = { title: "Сагс" };

export default function CartPage(props: PageProps<"/cart">) {
  return (
    <Suspense fallback={<Loading />}>
      <Cart searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Cart({ searchParams }: { searchParams: PageProps<"/cart">["searchParams"] }) {
  const sp = await searchParams;
  const [settings, me] = await Promise.all([getSettings(), getMe()]);
  return <CartView minOrder={settings.min_order} status={me?.status ?? null} skipped={Number(sp.skipped) || 0} />;
}
