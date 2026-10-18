"use client";

import { useMemo, useState, useTransition } from "react";
import { BookOpen, Phone } from "lucide-react";
import { recordTabPayment, setApartmentTab, setResidentRole, setResidentStatus } from "@/app/actions/admin";
import { aptShort, dateShort, mnt, phoneFmt } from "@/lib/format";
import type { Apartment, Resident, ResidentStatus, Role } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ResidentRow = Resident & { created_at: string };

const TABS: { id: ResidentStatus; label: string }[] = [
  { id: "pending", label: "Хүлээгдэж буй" },
  { id: "approved", label: "Баталгаажсан" },
  { id: "blocked", label: "Хаагдсан" },
];
const ROLE_LABEL: Record<Role, string> = { resident: "Оршин суугч", staff: "Ажилтан", owner: "Эзэн" };

export function ResidentAdmin({
  residents,
  balances,
  isOwner,
  myId,
}: {
  residents: ResidentRow[];
  balances: Record<string, number>;
  isOwner: boolean;
  myId: string;
}) {
  const [rows, setRows] = useState(residents);
  const [tab, setTab] = useState<ResidentStatus | "tabs">(residents.some((r) => r.status === "pending") ? "pending" : "approved");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [, start] = useTransition();

  const update = (id: string, p: Partial<ResidentRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  function changeStatus(r: ResidentRow, status: ResidentStatus) {
    const prev = r.status;
    update(r.id, { status });
    start(async () => {
      const res = await setResidentStatus(r.id, status);
      if ("error" in res) {
        update(r.id, { status: prev });
        setError(res.error);
      }
    });
  }

  const list = rows.filter(
    (r) =>
      (tab === "tabs" || r.status === tab) &&
      (!q || r.name.toLowerCase().includes(q.toLowerCase()) || r.phone.includes(q) || String(r.apartment?.number ?? "").includes(q)),
  );

  const apartments = useMemo(() => {
    const m = new Map<string, { apt: Apartment; people: ResidentRow[] }>();
    for (const r of rows) {
      if (!r.apartment || r.status !== "approved") continue;
      const e = m.get(r.apartment.id) ?? { apt: r.apartment, people: [] };
      e.people.push(r);
      m.set(r.apartment.id, e);
    }
    return [...m.values()].sort((a, b) => a.apt.number - b.apt.number);
  }, [rows]);

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Оршин суугчид</h1>
      <div className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn("inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 font-semibold", tab === t.id ? "bg-forest text-white" : "bg-white")}
          >
            {t.label}
            {t.id === "pending" && pendingCount > 0 && <span className="tabular rounded-full bg-lime px-2 text-sm text-forest">{pendingCount}</span>}
          </button>
        ))}
        <button
          role="tab"
          aria-selected={tab === "tabs"}
          onClick={() => setTab("tabs")}
          className={cn("inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 font-semibold", tab === "tabs" ? "bg-forest text-white" : "bg-white")}
        >
          <BookOpen className="size-5" aria-hidden /> Дэвтэр
        </button>
      </div>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

      {tab !== "tabs" && (
        <>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Нэр, утас, тоотоор хайх" aria-label="Хайх" className="h-11 max-w-sm bg-white text-base" />
          {list.length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-white p-8 text-center text-muted-foreground">Хоосон</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-lg font-bold">{aptShort(r.apartment) || "Хаяггүй"}</p>
                      <p className="font-medium">{r.name}</p>
                      <a href={`tel:${r.phone}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-brand-strong">
                        <Phone className="size-4" aria-hidden /> {phoneFmt(r.phone)}
                      </a>
                      <p className="text-xs text-muted-foreground">Бүртгүүлсэн {dateShort(r.created_at)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-mint-soft px-2.5 py-1 text-xs font-semibold text-forest">{ROLE_LABEL[r.role]}</span>
                  </div>
                  {r.id !== myId && (
                    <div className="flex flex-wrap gap-2">
                      {r.status !== "approved" && (
                        <button type="button" onClick={() => changeStatus(r, "approved")} className="h-11 flex-1 rounded-xl bg-brand-strong px-4 font-semibold text-white">
                          Баталгаажуулах
                        </button>
                      )}
                      {r.status !== "blocked" && (
                        <button type="button" onClick={() => changeStatus(r, "blocked")} className="h-11 rounded-xl border px-4 font-semibold text-destructive">
                          Хаах
                        </button>
                      )}
                      {isOwner && r.status === "approved" && (
                        <select
                          value={r.role}
                          aria-label={`${r.name} — эрх`}
                          onChange={(e) => {
                            const role = e.target.value as Role;
                            const prev = r.role;
                            update(r.id, { role });
                            start(async () => {
                              const res = await setResidentRole(r.id, role);
                              if ("error" in res) {
                                update(r.id, { role: prev });
                                setError(res.error);
                              }
                            });
                          }}
                          className="h-11 rounded-xl border bg-white px-3"
                        >
                          {(Object.keys(ROLE_LABEL) as Role[]).map((k) => (
                            <option key={k} value={k}>{ROLE_LABEL[k]}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "tabs" && (
        <>
          <p className="text-sm text-muted-foreground">
            Нийт төлөгдөөгүй: <b className="tabular text-foreground">{mnt(Object.values(balances).filter((b) => b > 0).reduce((s, b) => s + b, 0))}</b>
            {!isOwner && " · Дэвтэр нээх/хаахыг зөвхөн эзэн хийнэ."}
          </p>
          {apartments.length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-white p-8 text-center text-muted-foreground">Баталгаажсан тоот алга.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {apartments.map(({ apt, people }) => (
                <TabCard key={apt.id} apt={apt} people={people} balance={balances[apt.id] ?? 0} isOwner={isOwner} onError={setError} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function TabCard({
  apt,
  people,
  balance: initialBalance,
  isOwner,
  onError,
}: {
  apt: Apartment;
  people: ResidentRow[];
  balance: number;
  isOwner: boolean;
  onError: (e: string) => void;
}) {
  const [enabled, setEnabled] = useState(apt.tab_enabled);
  const [limit, setLimit] = useState(apt.tab_limit);
  const [balance, setBalance] = useState(initialBalance);
  const [pay, setPay] = useState("");
  const [pending, start] = useTransition();

  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">{aptShort(apt)}</p>
          <p className="text-sm text-muted-foreground">{people.map((p) => p.name).join(", ")}</p>
        </div>
        <p className={cn("tabular text-xl font-bold", balance > 0 && "text-forest")}>{mnt(balance)}</p>
      </div>
      {isOwner && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-11 items-center gap-3 font-medium">
            Дэвтэр
            <Switch
              checked={enabled}
              onCheckedChange={(v) => {
                setEnabled(v);
                start(async () => {
                  const r = await setApartmentTab(apt.id, v, limit);
                  if ("error" in r) {
                    setEnabled(!v);
                    onError(r.error);
                  }
                });
              }}
              className="scale-125"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            Хязгаар
            <Input
              type="number"
              inputMode="numeric"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              onBlur={() => start(async () => void (await setApartmentTab(apt.id, enabled, limit)))}
              className="h-11 w-32 text-base"
            />
          </label>
        </div>
      )}
      {(enabled || balance !== 0) && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const amount = Number(pay);
            if (!amount) return;
            start(async () => {
              const r = await recordTabPayment(apt.id, amount, "Төлөлт");
              if ("error" in r) onError(r.error);
              else {
                setBalance((b) => b - amount);
                setPay("");
              }
            });
          }}
        >
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={pay}
            onChange={(e) => setPay(e.target.value)}
            placeholder="Төлсөн дүн"
            aria-label={`${aptShort(apt)} — төлсөн дүн`}
            className="h-11 flex-1 text-base"
          />
          <button type="submit" disabled={pending || !pay} className="h-11 rounded-xl bg-brand-strong px-4 font-semibold text-white disabled:opacity-50">
            Төлөлт бүртгэх
          </button>
        </form>
      )}
    </li>
  );
}
