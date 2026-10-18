"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, CircleX, Phone, QrCode } from "lucide-react";
import { cancelOrder } from "@/app/actions/orders";
import { checkQPay, getQPayCheckout, type QPayResult } from "@/app/actions/payments";
import { getBrowserClient } from "@/lib/supabase/client";
import { dateShort, mnt, PAYMENT_LABEL, PICKUP_STATUS_LABEL, STATUS_LABEL, timeHM } from "@/lib/format";
import type { Order, OrderStatus, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BankDetails } from "./bank-details";
import { ReorderButton } from "./reorder-button";

const STEPS: OrderStatus[] = ["received", "preparing", "delivering", "delivered"];

export function OrderLive({ initial, settings, justPlaced }: { initial: Order; settings: Settings; justPlaced: boolean }) {
  const [order, setOrder] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const markPaid = useCallback(() => setOrder((o) => ({ ...o, paid: true })), []);

  // Live status via Supabase Realtime (RLS limits events to this apartment)
  useEffect(() => {
    const sb = getBrowserClient();
    if (!sb) return;
    const ch = sb
      .channel(`order-${initial.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${initial.id}` }, (payload) =>
        setOrder((o) => ({ ...o, ...(payload.new as Partial<Order>) })),
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [initial.id]);

  const labels = order.fulfilment === "pickup" ? PICKUP_STATUS_LABEL : STATUS_LABEL;
  const step = STEPS.indexOf(order.status);
  const cancelled = order.status === "cancelled";
  const items = order.order_items ?? initial.order_items ?? [];
  const phone = settings.shop_phone.replace(/\D/g, "");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      {justPlaced && !cancelled && (
        <div role="status" className="flex items-center gap-3 rounded-2xl bg-mint p-4 text-forest">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-strong text-white">
            <Check className="size-6" aria-hidden />
          </span>
          <p className="font-semibold">Захиалга илгээгдлээ! Дэлгүүр одоо хүлээн авч байна.</p>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Захиалга #{order.id}</h1>
          <p className="text-sm text-muted-foreground">
            {dateShort(order.created_at)} ·{" "}
            {order.fulfilment === "pickup"
              ? "Лангуунаас авна"
              : order.scheduled_for
                ? `${timeHM(order.scheduled_for)}-д хүргэнэ`
                : "Яг одоо хүргэнэ"}
          </p>
        </div>
        <a href={`tel:${phone}`} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-mint-soft px-3 text-sm font-semibold text-forest">
          <Phone className="size-4" aria-hidden /> Залгах
        </a>
      </div>

      {cancelled ? (
        <p className="flex items-center gap-2 rounded-2xl bg-zinc-100 p-4 font-semibold text-zinc-700">
          <CircleX className="size-5" aria-hidden /> Энэ захиалга цуцлагдсан.
        </p>
      ) : (
        <ol className="flex flex-col rounded-2xl border p-4" aria-label="Захиалгын явц" aria-live="polite">
          {STEPS.map((s, i) => {
            const done = i <= step;
            const current = i === step;
            return (
              <li key={s} className="relative flex gap-3 pb-5 last:pb-0" aria-current={current ? "step" : undefined}>
                {i < STEPS.length - 1 && (
                  <span className={cn("absolute top-8 left-[15px] h-[calc(100%-24px)] w-0.5", i < step ? "bg-brand" : "bg-border")} aria-hidden />
                )}
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-bold",
                    done ? "border-brand-strong bg-brand-strong text-white" : "border-border bg-white text-muted-foreground",
                    current && "ring-4 ring-mint",
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden /> : i + 1}
                </span>
                <div className="pt-1">
                  <p className={cn("font-semibold", !done && "text-muted-foreground")}>{labels[s]}</p>
                  {current && s === "delivering" && order.staff_name && order.fulfilment === "delivery" && (
                    <p className="text-sm text-muted-foreground">{order.staff_name} таны захиалгыг авчирч байна</p>
                  )}
                  {current && s !== "delivering" && order.staff_name && s !== "received" && (
                    <p className="text-sm text-muted-foreground">Ажилтан: {order.staff_name}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!cancelled && !order.paid && <PaymentBox order={order} settings={settings} onPaid={markPaid} />}
      {order.paid && order.payment !== "tab" && (
        <p className="rounded-xl bg-mint-soft p-3 text-sm font-semibold text-forest">✓ Төлбөр төлөгдсөн</p>
      )}

      <section className="rounded-2xl border p-4" aria-labelledby="items">
        <h2 id="items" className="mb-2 font-bold">Бараа</h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3">
              <span className="min-w-0">
                {it.name} <span className="text-muted-foreground">· {it.unit} × {it.qty}</span>
              </span>
              <span className="tabular shrink-0">{mnt(it.price * it.qty)}</span>
            </li>
          ))}
        </ul>
        {order.bottle_return > 0 && <p className="mt-2 text-sm">♻️ Хоосон сав буцаах: {order.bottle_return}</p>}
        {order.note && <p className="mt-2 text-sm text-muted-foreground">📝 {order.note}</p>}
        <div className="mt-3 flex justify-between border-t pt-3 font-bold">
          <span>Нийт · {PAYMENT_LABEL[order.payment]}</span>
          <span className="tabular">{mnt(order.total)}</span>
        </div>
      </section>

      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {order.status === "received" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("Захиалгыг цуцлах уу?")) return;
              startTransition(async () => {
                const res = await cancelOrder(order.id);
                if ("error" in res) setError(res.error);
                else setOrder((o) => ({ ...o, status: "cancelled" }));
              });
            }}
            className="inline-flex h-11 items-center rounded-xl border px-4 font-semibold text-destructive disabled:opacity-50"
          >
            Захиалга цуцлах
          </button>
        )}
        {(order.status === "delivered" || cancelled) && items.length > 0 && <ReorderButton items={items} />}
        <Link href="/orders" className="inline-flex h-11 items-center rounded-xl px-4 font-semibold text-brand-strong">
          Бүх захиалга
        </Link>
      </div>
    </div>
  );
}

function PaymentBox({ order, settings, onPaid }: { order: Order; settings: Settings; onPaid: () => void }) {
  const [qpay, setQpay] = useState<QPayResult | null>(null);

  useEffect(() => {
    if (order.payment !== "qpay") return;
    let alive = true;
    getQPayCheckout(order.id).then((r) => alive && setQpay(r));
    return () => {
      alive = false;
    };
  }, [order.id, order.payment]);

  // Poll every 5s while the pay button is on screen (the Wire webhook also marks it paid)
  useEffect(() => {
    if (qpay?.status !== "checkout") return;
    const t = setInterval(async () => {
      if (await checkQPay(order.id)) {
        clearInterval(t);
        onPaid();
      }
    }, 5000);
    return () => clearInterval(t);
  }, [qpay?.status, order.id, onPaid]);

  if (order.payment === "cash_card") {
    return <p className="rounded-xl bg-mint-soft p-3 text-sm">💳 Хүлээж авахдаа бэлнээр эсвэл картаар төлнө. Ажилтан терминал авчирна.</p>;
  }
  if (order.payment === "tab") {
    return <p className="rounded-xl bg-mint-soft p-3 text-sm">📒 Дэвтэрт бичигдлээ. Сарын эцэст төлнө.</p>;
  }
  const bank = (
    <BankDetails
      bank={settings.bank_name}
      account={settings.bank_account}
      holder={settings.bank_holder}
      amount={order.total}
      reference={`#${order.id}`}
    />
  );
  if (order.payment === "qpay") {
    if (!qpay) return <div className="h-40 animate-pulse rounded-2xl bg-mint-soft" aria-label="Төлбөр ачаалж байна" />;
    if (qpay.status === "paid") return null;
    if (qpay.status === "checkout") {
      return (
        <section className="flex flex-col items-center gap-3 rounded-2xl border p-4 text-center" aria-label="QPay төлбөр">
          <p className="font-bold">QPay-ээр төлөх · {mnt(order.total)}</p>
          <a
            href={qpay.url}
            className="inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-brand-strong px-4 font-semibold text-white"
          >
            <QrCode className="size-5" aria-hidden /> Төлөх
          </a>
          <p className="text-sm text-muted-foreground">
            QR код болон банкны аппын холбоос нээгдэнэ. Төлөгдмөгц энэ хуудас автоматаар шинэчлэгдэнэ.
          </p>
        </section>
      );
    }
    return (
      <section className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">QPay түр ажиллахгүй байна. Доорх дансанд шилжүүлнэ үү:</p>
        {bank}
      </section>
    );
  }
  return bank;
}
