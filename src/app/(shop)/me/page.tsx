import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BookOpen, Home, LogOut, Settings2, UsersRound } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { EmptyState } from "@/components/shop/empty-state";
import { PushToggle } from "@/components/shop/push-toggle";
import { ReorderButton } from "@/components/shop/reorder-button";
import { createClient } from "@/lib/supabase/server";
import { getMe, getMyOrders, getTabBalance } from "@/lib/data";
import { aptLabel, dateShort, mnt, phoneFmt, STATUS_LABEL } from "@/lib/format";

export const metadata: Metadata = { title: "Миний" };

const STATUS_TEXT = { pending: "Хүлээгдэж буй", approved: "Баталгаажсан", blocked: "Хаагдсан" } as const;

async function Welcome({ searchParams }: { searchParams: PageProps<"/me">["searchParams"] }) {
  const sp = await searchParams;
  if (sp.welcome !== "1") return null;
  return (
    <p role="status" className="rounded-2xl bg-mint p-4 font-medium text-forest">
      Бүртгэл амжилттай! Эзэн баталгаажуулмагц захиалах боломжтой болно. Түүнээс өмнө үнэ, бараагаа үзэж болно.
    </p>
  );
}

export default async function MePage(props: PageProps<"/me">) {
  const me = await getMe();
  if (!me) {
    return (
      <EmptyState
        title="Нэвтрээгүй байна"
        text="Байрныхаа дэлгүүрээс захиалахын тулд бүртгүүлнэ үү."
        action={{ href: "/login?next=/me", label: "Нэвтрэх" }}
      />
    );
  }

  const sb = await createClient();
  const approved = me.status === "approved" && me.apartment;
  const [family, orders, balance, tabEntries] = approved
    ? await Promise.all([
        sb.from("residents").select("id, name, phone").eq("apartment_id", me.apartment!.id).eq("status", "approved").order("created_at"),
        getMyOrders(5),
        me.apartment!.tab_enabled ? getTabBalance(me.apartment!.id) : Promise.resolve(0),
        me.apartment!.tab_enabled
          ? sb.from("tab_entries").select("*").eq("apartment_id", me.apartment!.id).order("created_at", { ascending: false }).limit(10)
          : Promise.resolve({ data: [] }),
      ])
    : [{ data: [] }, [], 0, { data: [] }];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Suspense fallback={null}>
        <Welcome searchParams={props.searchParams} />
      </Suspense>

      <section className="rounded-3xl bg-forest p-5 text-white">
        <h1 className="text-2xl font-bold">{me.name}</h1>
        <p className="text-mint">{phoneFmt(me.phone)}</p>
        <p className="mt-3 flex items-center gap-2 font-medium">
          <Home className="size-5" aria-hidden /> {me.apartment ? aptLabel(me.apartment) : "—"}
        </p>
        <span className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-medium">{STATUS_TEXT[me.status]}</span>
      </section>

      {(me.role === "staff" || me.role === "owner") && (
        <Link href="/admin" className="flex items-center gap-3 rounded-2xl border p-4 font-semibold hover:border-brand">
          <Settings2 className="size-5 text-brand-strong" aria-hidden /> Дэлгүүрийн удирдлага
        </Link>
      )}

      {approved && me.apartment!.tab_enabled && (
        <section className="rounded-2xl border p-4" aria-labelledby="tab">
          <h2 id="tab" className="flex items-center gap-2 font-bold">
            <BookOpen className="size-5 text-brand-strong" aria-hidden /> Дэвтэр
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Сарын эцэст төлөх үлдэгдэл</p>
          <p className="tabular mt-1 text-3xl font-bold">{mnt(balance)}</p>
          <p className="text-sm text-muted-foreground">Хязгаар {mnt(me.apartment!.tab_limit)}</p>
          {(tabEntries.data ?? []).length > 0 && (
            <ul className="mt-3 divide-y text-sm">
              {(tabEntries.data as { id: number; amount: number; note: string | null; created_at: string }[]).map((t) => (
                <li key={t.id} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0">
                    {t.note ?? (t.amount < 0 ? "Төлөлт" : "Худалдан авалт")}
                    <span className="block text-xs text-muted-foreground">{dateShort(t.created_at)}</span>
                  </span>
                  <span className={`tabular shrink-0 font-semibold ${t.amount < 0 ? "text-brand-strong" : ""}`}>
                    {t.amount < 0 ? "−" : "+"}
                    {mnt(Math.abs(t.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {approved && (
        <section className="rounded-2xl border p-4" aria-labelledby="family">
          <h2 id="family" className="flex items-center gap-2 font-bold">
            <UsersRound className="size-5 text-brand-strong" aria-hidden /> Манай тоотынхон
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Нэг тоотын гишүүд захиалгаа хамтдаа харна.</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {(family.data ?? []).map((f) => (
              <li key={f.id} className="flex justify-between gap-3 text-sm">
                <span className="font-medium">{f.name}{f.id === me.id && " (та)"}</span>
                <span className="tabular text-muted-foreground">{phoneFmt(f.phone)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Гэр бүлийн гишүүн нэмэх бол тэр өөрөө ижил тоотоор бүртгүүлнэ.</p>
        </section>
      )}

      {approved && (
        <section aria-labelledby="hist">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="hist" className="font-bold">Сүүлийн захиалгууд</h2>
            <Link href="/orders" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-strong">Бүгд</Link>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Захиалга алга.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3">
                  <Link href={`/orders/${o.id}`} className="min-w-0 flex-1">
                    <p className="font-semibold">#{o.id} · {STATUS_LABEL[o.status]}</p>
                    <p className="truncate text-sm text-muted-foreground">{dateShort(o.created_at)} · {mnt(o.total)}</p>
                  </Link>
                  {o.order_items && o.order_items.length > 0 && <ReorderButton items={o.order_items} className="h-11" />}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-2xl border p-4" aria-labelledby="notif">
        <h2 id="notif" className="font-bold">Мэдэгдэл</h2>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">Захиалга хүлээн авсан, хүргэлтэнд гарсан, хүргэгдсэн үед мэдэгдэл ирнэ.</p>
        <PushToggle initialEnabled={me.notify_push} />
      </section>

      <form action={signOut}>
        <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl px-2 font-semibold text-muted-foreground">
          <LogOut className="size-5" aria-hidden /> Гарах
        </button>
      </form>
    </div>
  );
}
