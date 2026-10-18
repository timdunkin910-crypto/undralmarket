"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Bell, BellOff, Bike, CheckCheck, Phone, Store } from "lucide-react";
import { setDeliveryEnabled, setOrderPaid, setOrderStatus } from "@/app/actions/admin";
import { getBrowserClient } from "@/lib/supabase/client";
import { ORDER_SELECT } from "@/lib/queries";
import { aptShort, mnt, PAYMENT_LABEL, phoneFmt, timeHM } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { PushToggle } from "@/components/shop/push-toggle";
import { cn } from "@/lib/utils";

const COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: "received", title: "Шинэ" },
  { status: "preparing", title: "Бэлтгэж байна" },
  { status: "delivering", title: "Хүргэлтэнд / бэлэн" },
];

/** Three rising beeps — no audio file needed, works offline. */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.22, 0.44].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 660 + i * 220;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.22);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {}
  navigator.vibrate?.([200, 100, 200]);
}

export function OrderQueue({ initial, deliveryEnabled, staffName }: { initial: Order[]; deliveryEnabled: boolean; staffName: string }) {
  const [orders, setOrders] = useState(initial);
  const [sound, setSound] = useState(false);
  const [delivery, setDelivery] = useState(deliveryEnabled);
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore preference from this tablet
      setSound(localStorage.getItem("um-admin-sound") === "1");
    } catch {}
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const sb = getBrowserClient();
    if (!sb) return;
    const ch = sb
      .channel("admin-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, async (payload) => {
        const { data } = await sb.from("orders").select(ORDER_SELECT).eq("id", (payload.new as Order).id).single();
        if (!data) return;
        setOrders((os) => (os.some((o) => o.id === data.id) ? os : [...os, data as Order]));
        if (soundRef.current) chime();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        const n = payload.new as Order;
        setOrders((os) => os.map((o) => (o.id === n.id ? { ...o, ...n, order_items: o.order_items, apartment: o.apartment, resident: o.resident } : o)));
        if (n.status === "cancelled" && soundRef.current) chime();
      })
      .subscribe((s) => setLive(s === "SUBSCRIBED"));
    return () => {
      sb.removeChannel(ch);
    };
  }, []);

  const patch = useCallback((id: number, p: Partial<Order>) => setOrders((os) => os.map((o) => (o.id === id ? { ...o, ...p } : o))), []);

  const done = orders.filter((o) => o.status === "delivered" || o.status === "cancelled").reverse();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3">
        <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold", live ? "bg-mint text-forest" : "bg-zinc-100 text-zinc-700")}>
          <span className={cn("size-2 rounded-full", live ? "animate-pulse bg-brand" : "bg-zinc-400")} aria-hidden />
          {live ? "Шууд холбогдсон" : "Холбогдож байна…"}
        </span>
        <button
          type="button"
          onClick={() => {
            const next = !sound;
            setSound(next);
            try {
              localStorage.setItem("um-admin-sound", next ? "1" : "0");
            } catch {}
            if (next) chime(); // the tap also unlocks audio on iPad
          }}
          className={cn("inline-flex h-11 items-center gap-2 rounded-xl px-4 font-semibold", sound ? "bg-forest text-white" : "bg-lime text-forest")}
          aria-pressed={sound}
        >
          {sound ? <Bell className="size-5" aria-hidden /> : <BellOff className="size-5" aria-hidden />}
          {sound ? "Дуу асаалттай" : "Шинэ захиалгын дуу асаах"}
        </button>
        <label className="ml-auto flex min-h-11 items-center gap-3 font-semibold">
          <Bike className="size-5 text-brand-strong" aria-hidden />
          Хүргэлт {delivery ? "нээлттэй" : "түр зогссон"}
          <Switch
            checked={delivery}
            onCheckedChange={async (v) => {
              setDelivery(v);
              const r = await setDeliveryEnabled(v);
              if ("error" in r) setDelivery(!v);
            }}
            aria-label="Хүргэлт асаах/унтраах"
            className="scale-125"
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.status === col.status);
          return (
            <section key={col.status} aria-labelledby={`col-${col.status}`} className="flex flex-col gap-3">
              <h2 id={`col-${col.status}`} className="flex items-center gap-2 text-lg font-bold">
                {col.title}
                <span className="tabular rounded-full bg-forest px-2 text-sm text-white">{list.length}</span>
              </h2>
              {list.length === 0 && <p className="rounded-2xl border border-dashed bg-white/60 p-6 text-center text-sm text-muted-foreground">Хоосон</p>}
              {list.map((o) => (
                <OrderCard key={o.id} order={o} now={now} staffName={staffName} onPatch={patch} />
              ))}
            </section>
          );
        })}
      </div>

      {done.length > 0 && (
        <details className="rounded-2xl bg-white p-4">
          <summary className="min-h-11 cursor-pointer content-center font-semibold">Дууссан ({done.length})</summary>
          <ul className="mt-2 divide-y text-sm">
            {done.map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  #{o.id} · {aptShort(o.apartment)} · {o.status === "cancelled" ? "Цуцлагдсан" : "Хүргэгдсэн"}
                </span>
                <span className="tabular">
                  {mnt(o.total)} · {PAYMENT_LABEL[o.payment]} {o.paid || o.payment === "tab" ? "✓" : "· төлөгдөөгүй"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="rounded-2xl bg-white p-4">
        <h2 className="mb-2 font-bold">Энэ төхөөрөмж дээр push мэдэгдэл</h2>
        <PushToggle initialEnabled label="Шинэ захиалгын мэдэгдэл авах" />
      </section>
    </div>
  );
}

function OrderCard({
  order: o,
  now,
  staffName,
  onPatch,
}: {
  order: Order;
  now: number;
  staffName: string;
  onPatch: (id: number, p: Partial<Order>) => void;
}) {
  const [pending, start] = useTransition();
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const items = o.order_items ?? [];
  const mins = Math.max(0, Math.round((now - new Date(o.created_at).getTime()) / 60_000));
  const pickup = o.fulfilment === "pickup";
  const late = o.status !== "delivering" && mins >= 20 && !o.scheduled_for;

  function move(status: OrderStatus) {
    setError("");
    const prev = o.status;
    onPatch(o.id, { status, staff_name: staffName });
    start(async () => {
      const r = await setOrderStatus(o.id, status);
      if ("error" in r) {
        onPatch(o.id, { status: prev });
        setError(r.error);
      }
    });
  }

  const checklistTotal = items.length + (o.bottle_return > 0 ? 1 : 0);
  const allChecked = checked.size >= checklistTotal;

  return (
    <article className={cn("flex flex-col gap-3 rounded-2xl border-2 bg-white p-4", o.status === "received" ? "border-brand" : "border-transparent", late && "border-lime")}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-2xl leading-tight font-bold">{aptShort(o.apartment)}</p>
          <p className="text-sm text-muted-foreground">
            #{o.id} · {timeHM(o.created_at)} · {mins} мин өмнө
          </p>
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold", pickup ? "bg-forest text-white" : "bg-mint text-forest")}>
          {pickup ? <Store className="size-4" aria-hidden /> : <Bike className="size-4" aria-hidden />}
          {pickup ? "Лангуу" : o.scheduled_for ? `${timeHM(o.scheduled_for)}-д` : "Яг одоо"}
        </span>
      </header>

      {o.resident && (
        <a href={`tel:${o.resident.phone}`} className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl bg-mint-soft px-3 font-medium">
          <Phone className="size-4" aria-hidden /> {o.resident.name} · {phoneFmt(o.resident.phone)}
        </a>
      )}

      {o.note && <p className="rounded-xl bg-lime p-3 font-semibold text-forest">📝 {o.note}</p>}

      {checking ? (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 font-semibold">Авч гарах бараа — шалгаарай</legend>
          {items.map((it) => (
            <label key={it.id} className="flex min-h-11 items-center gap-3 rounded-lg px-1 text-base hover:bg-mint-soft">
              <input
                type="checkbox"
                className="size-6 accent-[#15803d]"
                checked={checked.has(it.id)}
                onChange={(e) =>
                  setChecked((s) => {
                    const n = new Set(s);
                    if (e.target.checked) n.add(it.id);
                    else n.delete(it.id);
                    return n;
                  })
                }
              />
              <span className="flex-1">{it.name}</span>
              <b className="tabular text-lg">×{it.qty}</b>
            </label>
          ))}
          {o.bottle_return > 0 && (
            <label className="flex min-h-11 items-center gap-3 rounded-lg px-1 text-base hover:bg-mint-soft">
              <input
                type="checkbox"
                className="size-6 accent-[#15803d]"
                checked={checked.has(-1)}
                onChange={(e) =>
                  setChecked((s) => {
                    const n = new Set(s);
                    if (e.target.checked) n.add(-1);
                    else n.delete(-1);
                    return n;
                  })
                }
              />
              <span className="flex-1">♻️ Хоосон 19 л сав авч ирэх</span>
              <b className="tabular text-lg">×{o.bottle_return}</b>
            </label>
          )}
          {!pickup && o.payment === "cash_card" && !o.paid && <p className="mt-1 font-semibold">💳 Картын терминал авч гараарай</p>}
        </fieldset>
      ) : (
        <ul className="flex flex-col gap-1 text-[15px]">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between gap-2">
              <span className="min-w-0">{it.name} <span className="text-muted-foreground">· {it.unit}</span></span>
              <b className="tabular shrink-0">×{it.qty}</b>
            </li>
          ))}
          {o.bottle_return > 0 && <li className="font-semibold">♻️ Хоосон сав буцаах: {o.bottle_return}</li>}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <span className="tabular text-lg font-bold">{mnt(o.total)}</span>
        <button
          type="button"
          onClick={async () => {
            onPatch(o.id, { paid: !o.paid });
            const r = await setOrderPaid(o.id, !o.paid);
            if ("error" in r) onPatch(o.id, { paid: o.paid });
          }}
          disabled={o.payment === "tab"}
          className={cn(
            "inline-flex h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold",
            o.paid || o.payment === "tab" ? "bg-mint text-forest" : "border border-forest text-forest",
          )}
          aria-pressed={o.paid}
        >
          {PAYMENT_LABEL[o.payment]} · {o.payment === "tab" ? "дэвтэрт" : o.paid ? "төлсөн ✓" : "төлөгдөөгүй"}
        </button>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

      <div className="flex gap-2">
        {o.status === "received" && (
          <button type="button" disabled={pending} onClick={() => move("preparing")} className="h-14 flex-1 rounded-xl bg-brand-strong text-lg font-bold text-white hover:bg-forest disabled:opacity-60">
            Хүлээж авах
          </button>
        )}
        {o.status === "preparing" &&
          (checking ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => move("delivering")}
              className={cn("h-14 flex-1 rounded-xl text-lg font-bold disabled:opacity-60", allChecked ? "bg-brand-strong text-white" : "bg-mint text-forest")}
            >
              {allChecked ? (pickup ? "Бэлэн боллоо" : "Хүргэлтэнд гарсан") : `Шалгасан ${checked.size}/${checklistTotal} · гаргах`}
            </button>
          ) : (
            <button type="button" onClick={() => setChecking(true)} className="h-14 flex-1 rounded-xl bg-brand-strong text-lg font-bold text-white hover:bg-forest">
              {pickup ? "Бэлэн болгох" : "Хүргэлтэнд гаргах"}
            </button>
          ))}
        {o.status === "delivering" && (
          <button type="button" disabled={pending} onClick={() => move("delivered")} className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-forest text-lg font-bold text-white disabled:opacity-60">
            <CheckCheck className="size-6" aria-hidden /> {pickup ? "Авсан" : "Хүргэгдсэн"}
          </button>
        )}
        {(o.status === "received" || o.status === "preparing") && (
          <button
            type="button"
            disabled={pending}
            onClick={() => confirm(`#${o.id} захиалгыг цуцлах уу?`) && move("cancelled")}
            className="h-14 rounded-xl border px-4 font-semibold text-destructive"
          >
            Цуцлах
          </button>
        )}
      </div>
    </article>
  );
}
