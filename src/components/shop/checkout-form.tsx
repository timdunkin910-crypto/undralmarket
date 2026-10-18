"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Bike, Clock, MapPin, Store } from "lucide-react";
import { placeOrder } from "@/app/actions/orders";
import { useCart } from "@/lib/cart";
import { mnt, PAYMENT_LABEL } from "@/lib/format";
import { closedMessage, shopStatus, todaySlots } from "@/lib/hours";
import type { PaymentMethod, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BankDetails } from "./bank-details";
import { QtyStepper } from "./qty-stepper";
import { EmptyState } from "./empty-state";

type When = "now" | "later" | "pickup";

const PAYMENTS: { id: PaymentMethod; title: string; hint: string; badge: string }[] = [
  { id: "qpay", title: "QPay", hint: "Дэлгэц дээрх QR-ийг банкны аппаараа уншуулна", badge: "QR" },
  { id: "socialpay", title: "SocialPay", hint: "Голомт SocialPay-ээр дансанд шилжүүлнэ", badge: "SP" },
  { id: "transfer", title: "Дансаар шилжүүлэх", hint: "Дансны дугаарыг хуулж аваад шилжүүлнэ", badge: "₮" },
  { id: "cash_card", title: "Бэлнээр / карт хүлээж авахдаа", hint: "Ажилтан картын терминал авчирна", badge: "💳" },
];

export function CheckoutForm({
  address,
  residentName,
  settings,
  tab,
}: {
  address: string;
  residentName: string;
  settings: Settings;
  tab: { balance: number; limit: number } | null;
}) {
  const cart = useCart();
  const router = useRouter();
  const [when, setWhen] = useState<When>(settings.delivery_enabled ? "now" : "pickup");
  const [slot, setSlot] = useState<string>("");
  const [payment, setPayment] = useState<PaymentMethod>("qpay");
  const [bottles, setBottles] = useState(0);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const status = shopStatus(settings.open_time, settings.close_time);
  const slots = useMemo(() => todaySlots(settings.close_time), [settings.close_time]);
  const hasWater = cart.lines.some((l) => /19\s*л/i.test(l.name) || /19\s*л/i.test(l.unit));
  const tabRoom = tab ? tab.limit - tab.balance : 0;

  if (!cart.ready) return <div className="h-40 animate-pulse rounded-2xl bg-mint-soft" />;
  if (cart.lines.length === 0) {
    return <EmptyState title="Сагс хоосон байна" action={{ href: "/categories", label: "Бараа үзэх" }} />;
  }

  const short = settings.min_order - cart.total;
  // Why the submit button is disabled — shown right above it instead of leaving it silently inactive
  const blockReason = !status.open
    ? `Дэлгүүр хаалттай · ${closedMessage(status)}`
    : !settings.delivery_enabled && when !== "pickup"
      ? "Хүргэлт түр зогссон · лангуунаас авах сонголтоор захиална уу"
      : short > 0
        ? `Хамгийн бага захиалга ${mnt(settings.min_order)} · ${mnt(short)} дутуу`
        : "";

  function submit() {
    setError("");
    if (when === "later" && !slot) {
      setError("Хүргэх цагаа сонгоно уу.");
      return;
    }
    startTransition(async () => {
      let res: Awaited<ReturnType<typeof placeOrder>>;
      try {
        res = await placeOrder({
          items: cart.lines.map((l) => ({ product_id: l.id, qty: l.qty })),
          fulfilment: when === "pickup" ? "pickup" : "delivery",
          scheduledFor: when === "later" ? slot : null,
          payment,
          note: cart.note,
          bottleReturn: hasWater ? bottles : 0,
        });
      } catch {
        setError("Холболт тасарлаа. Интернэтээ шалгаад дахин оролдоно уу.");
        return;
      }
      if ("error" in res) {
        setError(res.error);
        return;
      }
      cart.clear();
      router.replace(`/orders/${res.id}?new=1`);
    });
  }

  const option = (on: boolean) =>
    cn(
      "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left",
      on ? "border-brand-strong bg-mint-soft ring-1 ring-brand-strong" : "bg-white hover:border-brand",
    );
  const radio = (on: boolean) =>
    cn("ml-auto size-5 shrink-0 rounded-full border-2", on ? "border-[6px] border-brand-strong" : "border-input");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="text-2xl font-bold">Захиалах</h1>

      {!status.open && (
        <p role="alert" className="rounded-xl bg-forest p-4 font-medium text-white">
          Дэлгүүр хаалттай байна · {closedMessage(status)}. Сагс тань хадгалагдсан.
        </p>
      )}

      <section className="flex items-start gap-3 rounded-2xl border p-4" aria-label="Хүргэх хаяг">
        <MapPin className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden />
        <div>
          <p className="font-semibold">{address}</p>
          <p className="text-sm text-muted-foreground">{residentName} · {settings.building_name}</p>
        </div>
      </section>

      <fieldset role="radiogroup" className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-bold">Хүргэлт</legend>
        {settings.delivery_enabled ? (
          <>
            <button type="button" role="radio" aria-checked={when === "now"} className={option(when === "now")} onClick={() => setWhen("now")}>
              <Bike className="size-6 shrink-0 text-brand-strong" aria-hidden />
              <span>
                <b className="block">Яг одоо</b>
                <span className="text-sm text-muted-foreground">15–30 минутад хаалган дээр</span>
              </span>
              <span className={radio(when === "now")} aria-hidden />
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={when === "later"}
              className={option(when === "later")}
              onClick={() => setWhen("later")}
              disabled={slots.length === 0}
            >
              <Clock className="size-6 shrink-0 text-brand-strong" aria-hidden />
              <span>
                <b className="block">Өнөөдөр, цаг сонгох</b>
                <span className="text-sm text-muted-foreground">{slots.length ? "Тохирох цагтаа авна" : "Өнөөдөр сул цаг үлдээгүй"}</span>
              </span>
              <span className={radio(when === "later")} aria-hidden />
            </button>
            {when === "later" && (
              <div className="flex flex-wrap gap-2 py-1" role="radiogroup" aria-label="Хүргэх цаг">
                {slots.map((s) => (
                  <button
                    key={s.iso}
                    type="button"
                    role="radio"
                    aria-checked={slot === s.iso}
                    onClick={() => setSlot(s.iso)}
                    className={cn(
                      "tabular h-11 rounded-full border px-4 font-medium",
                      slot === s.iso ? "border-brand-strong bg-mint text-forest" : "bg-white",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="rounded-xl bg-mint p-3 text-sm text-forest">Ажилтнууд завгүй байгаа тул яг одоо зөвхөн лангуунаас авах боломжтой.</p>
        )}
        <button type="button" role="radio" aria-checked={when === "pickup"} className={option(when === "pickup")} onClick={() => setWhen("pickup")}>
          <Store className="size-6 shrink-0 text-brand-strong" aria-hidden />
          <span>
            <b className="block">Лангуунаас авна</b>
            <span className="text-sm text-muted-foreground">Доод давхрын дэлгүүрээс өөрөө авна</span>
          </span>
          <span className={radio(when === "pickup")} aria-hidden />
        </button>
      </fieldset>

      {hasWater && (
        <section className="flex items-center justify-between gap-3 rounded-2xl border p-4" aria-label="Хоосон сав буцаах">
          <div>
            <p className="font-semibold">Хоосон 19 л сав буцаах</p>
            <p className="text-sm text-muted-foreground">Ажилтан хоосон савыг тань авч явна</p>
          </div>
          <QtyStepper value={bottles} onChange={(n) => setBottles(Math.max(0, Math.min(10, n)))} name="Хоосон сав" />
        </section>
      )}

      <fieldset role="radiogroup" className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-bold">Төлбөр</legend>
        {PAYMENTS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={payment === p.id} className={option(payment === p.id)} onClick={() => setPayment(p.id)}>
            <span className="grid h-9 w-12 shrink-0 place-items-center rounded-lg border bg-white text-xs font-bold text-forest" aria-hidden>
              {p.badge}
            </span>
            <span className="min-w-0">
              <b className="block">{p.title}</b>
              <span className="text-sm text-muted-foreground">{p.hint}</span>
            </span>
            <span className={radio(payment === p.id)} aria-hidden />
          </button>
        ))}
        {tab && (
          <button
            type="button"
            role="radio"
            aria-checked={payment === "tab"}
            className={cn(option(payment === "tab"), tabRoom < cart.total && "opacity-50")}
            onClick={() => tabRoom >= cart.total && setPayment("tab")}
            aria-disabled={tabRoom < cart.total}
          >
            <span className="grid h-9 w-12 shrink-0 place-items-center rounded-lg border bg-white text-xs font-bold text-forest" aria-hidden>📒</span>
            <span className="min-w-0">
              <b className="block">Дэвтэр (сарын эцэст төлөх)</b>
              <span className="tabular text-sm text-muted-foreground">
                Одоогийн үлдэгдэл {mnt(tab.balance)} · хязгаар {mnt(tab.limit)}
              </span>
            </span>
            <span className={radio(payment === "tab")} aria-hidden />
          </button>
        )}
        {(payment === "transfer" || payment === "socialpay") && (
          <BankDetails
            bank={settings.bank_name}
            account={settings.bank_account}
            holder={settings.bank_holder}
            amount={cart.total}
            reference={`${address.match(/(\d+) тоот/)?.[1] ?? ""} тоот`}
          />
        )}
        {payment === "qpay" && (
          <p className="text-sm text-muted-foreground">Захиалга баталгаажмагц «Төлөх» товч гарч, QR код болон банкны аппын холбоос нээгдэнэ.</p>
        )}
      </fieldset>

      <section className="rounded-2xl bg-mint-soft p-4" aria-label="Захиалгын дүн">
        <ul className="mb-2 flex flex-col gap-1 text-sm">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{l.name} × {l.qty}</span>
              <span className="tabular shrink-0">{mnt(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        {cart.note && <p className="mb-2 text-sm text-muted-foreground">📝 {cart.note}</p>}
        <div className="flex justify-between border-t pt-2 text-sm">
          <span>Хүргэлт</span>
          <span>Үнэгүй</span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Нийт</span>
          <span className="tabular">{mnt(cart.total)}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Үнийг захиалах үед дэлгүүрийн системээс дахин шалгана.</p>
      </section>

      <div className="pb-safe fixed inset-x-0 bottom-16 z-30 flex flex-col gap-2 border-t bg-white p-3 md:static md:border-0 md:p-0">
        {error && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-red-50 p-3 text-sm font-medium text-destructive">
            {error} {error.includes("Сагс") && <Link href="/cart" className="underline">Сагс руу</Link>}
          </p>
        )}
        {blockReason && (
          <p id="submit-reason" className="text-center text-sm font-medium text-zinc-700">
            {blockReason}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !!blockReason}
          aria-describedby={blockReason ? "submit-reason" : undefined}
          className={cn(
            "h-14 w-full rounded-xl text-base font-semibold",
            blockReason ? "cursor-not-allowed bg-zinc-300 text-zinc-600" : "bg-brand-strong text-white enabled:hover:bg-forest disabled:opacity-70",
          )}
        >
          {pending ? "Илгээж байна…" : `Захиалга илгээх · ${PAYMENT_LABEL[payment]} · ${mnt(cart.total)}`}
        </button>
      </div>
      {/* Room for the fixed bar (and its message) on phones */}
      <div className={cn("md:hidden", error || blockReason ? "h-36" : "h-20")} aria-hidden />
    </div>
  );
}
