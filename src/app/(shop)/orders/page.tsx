import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ReceiptText } from "lucide-react";
import { EmptyState } from "@/components/shop/empty-state";
import { getMe, getMyOrders } from "@/lib/data";
import { dateShort, mnt, PICKUP_STATUS_LABEL, STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Захиалга" };

export default async function OrdersPage() {
  const me = await getMe();
  if (!me) {
    return (
      <EmptyState
        icon={<ReceiptText className="size-7" aria-hidden />}
        title="Захиалгаа харахын тулд нэвтэрнэ үү"
        action={{ href: "/login?next=/orders", label: "Нэвтрэх" }}
      />
    );
  }
  const orders = await getMyOrders(50);
  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const past = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));

  const row = (o: (typeof orders)[number]) => {
    const labels = o.fulfilment === "pickup" ? PICKUP_STATUS_LABEL : STATUS_LABEL;
    return (
      <li key={o.id}>
        <Link href={`/orders/${o.id}`} className="flex items-center gap-3 rounded-2xl border bg-white p-4 hover:border-brand">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-semibold">
              #{o.id}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  o.status === "cancelled" ? "bg-zinc-100 text-zinc-700" : o.status === "delivered" ? "bg-mint-soft text-forest" : "bg-lime text-forest",
                )}
              >
                {labels[o.status]}
              </span>
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {dateShort(o.created_at)} · {(o.order_items ?? []).map((i) => i.name).join(", ")}
            </p>
          </div>
          <span className="tabular shrink-0 font-bold">{mnt(o.total)}</span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </li>
    );
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Захиалга</h1>
      {orders.length === 0 && (
        <EmptyState
          icon={<ReceiptText className="size-7" aria-hidden />}
          title="Одоогоор захиалга алга"
          text="Анхны захиалгаа өгөөд 15–30 минутад хаалган дээрээ аваарай."
          action={{ href: "/categories", label: "Бараа үзэх" }}
        />
      )}
      {active.length > 0 && (
        <section aria-labelledby="active">
          <h2 id="active" className="mb-2 text-lg font-bold">Идэвхтэй</h2>
          <ul className="flex flex-col gap-2">{active.map(row)}</ul>
        </section>
      )}
      {past.length > 0 && (
        <section aria-labelledby="past">
          <h2 id="past" className="mb-2 text-lg font-bold">Өмнөх</h2>
          <ul className="flex flex-col gap-2">{past.map(row)}</ul>
        </section>
      )}
    </div>
  );
}
