import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mnt, PAYMENT_LABEL } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

export const metadata: Metadata = { title: "Өдрийн тайлан" };

type Summary = {
  orders: number;
  revenue: number;
  by_payment: Partial<Record<PaymentMethod, number>>;
  top_items: { name: string; qty: number; amount: number }[];
  unpaid_tab: number;
};

function ubToday() {
  return new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
}

export default async function SummaryPage(props: PageProps<"/admin/summary">) {
  await requireStaff("/admin/summary");
  const sp = await props.searchParams;
  const day = typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : ubToday();
  const sb = await createClient();
  const { data, error } = await sb.rpc("daily_summary", { p_day: day });
  const s = data as Summary | null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Өдрийн тайлан</h1>
        <form className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Өдөр
            <input type="date" name="d" defaultValue={day} className="h-11 rounded-xl border bg-white px-3" />
          </label>
          <button type="submit" className="h-11 rounded-xl bg-brand-strong px-4 font-semibold text-white">Харах</button>
        </form>
      </div>

      {error || !s ? (
        <p className="rounded-2xl bg-white p-6 text-muted-foreground">Тайлан ачаалж чадсангүй.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Захиалга", String(s.orders)],
              ["Орлого", mnt(s.revenue)],
              ["Дундаж", mnt(s.orders ? s.revenue / s.orders : 0)],
              ["Дэвтэр (нийт төлөгдөөгүй)", mnt(s.unpaid_tab)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white p-4">
                <dt className="text-sm text-muted-foreground">{k}</dt>
                <dd className="tabular text-2xl font-bold">{v}</dd>
              </div>
            ))}
          </dl>

          <section className="rounded-2xl bg-white p-4">
            <h2 className="mb-2 font-bold">Төлбөрийн хэлбэрээр</h2>
            {Object.keys(s.by_payment).length === 0 ? (
              <p className="text-sm text-muted-foreground">Энэ өдөр захиалга алга.</p>
            ) : (
              <ul className="divide-y text-sm">
                {(Object.entries(s.by_payment) as [PaymentMethod, number][]).map(([k, v]) => (
                  <li key={k} className="flex justify-between py-2">
                    <span>{PAYMENT_LABEL[k]}</span>
                    <span className="tabular font-semibold">{mnt(v)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-white p-4">
            <h2 className="mb-2 font-bold">Их зарагдсан бараа</h2>
            {s.top_items.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">Бараа</th>
                    <th className="py-2 text-right font-medium">Тоо</th>
                    <th className="py-2 text-right font-medium">Дүн</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {s.top_items.map((t) => (
                    <tr key={t.name}>
                      <td className="py-2">{t.name}</td>
                      <td className="tabular py-2 text-right">{t.qty}</td>
                      <td className="tabular py-2 text-right font-semibold">{mnt(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
