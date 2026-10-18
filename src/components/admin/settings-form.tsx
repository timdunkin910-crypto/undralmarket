"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { regenerateInviteCode, saveSettings, type SettingsInput } from "@/app/actions/admin";
import type { Settings } from "@/lib/types";
import { hhmm } from "@/lib/hours";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsForm({ settings, inviteCode, isOwner }: { settings: Settings; inviteCode: string; isOwner: boolean }) {
  const [s, setS] = useState<SettingsInput>({
    building_name: settings.building_name,
    district: settings.district,
    entrances: settings.entrances,
    floors: settings.floors,
    apts_per_floor: settings.apts_per_floor,
    open_time: hhmm(settings.open_time),
    close_time: hhmm(settings.close_time),
    min_order: settings.min_order,
    shop_phone: settings.shop_phone,
    bank_name: settings.bank_name,
    bank_account: settings.bank_account,
    bank_holder: settings.bank_holder,
  });
  const [code, setCode] = useState(inviteCode);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const field = (k: keyof SettingsInput, label: string, type: "text" | "number" | "time" = "text") => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`s-${k}`}>{label}</Label>
      <Input
        id={`s-${k}`}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        disabled={!isOwner}
        value={s[k]}
        onChange={(e) => setS({ ...s, [k]: type === "number" ? Number(e.target.value) : e.target.value })}
        className="h-12 bg-white text-base"
      />
    </div>
  );

  return (
    <form
      className="mx-auto flex max-w-2xl flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSettings(s);
          setMsg("error" in r ? { ok: false, text: r.error } : { ok: true, text: "Хадгаллаа." });
        });
      }}
    >
      <h1 className="text-2xl font-bold">Тохиргоо</h1>
      {!isOwner && <p className="rounded-xl bg-mint p-3 text-sm text-forest">Тохиргоог зөвхөн эзэн өөрчилнө. Хүргэлтийг захиалгын самбараас түр зогсоож болно.</p>}

      <section className="flex flex-col gap-3 rounded-2xl bg-white p-4">
        <h2 className="font-bold">Урилгын код</h2>
        <p className="text-sm text-muted-foreground">Лифтэнд наасан зарын код. Солих үед шинэ зар хэвлэж наана уу.</p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-xl bg-mint-soft px-4 py-2 text-2xl font-bold tracking-wider text-forest">{code}</code>
          {isOwner && (
            <button
              type="button"
              onClick={() =>
                confirm("Шинэ код үүсгэх үү? Хуучин код ажиллахаа болино.") &&
                start(async () => {
                  const r = await regenerateInviteCode();
                  if ("code" in r) setCode(r.code);
                  else setMsg({ ok: false, text: r.error });
                })
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl border px-4 font-semibold"
            >
              <RefreshCw className="size-4" aria-hidden /> Шинэ код
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Байр</h2>
        {field("building_name", "Байрны нэр / дугаар")}
        {field("district", "Дүүрэг")}
        {field("entrances", "Орцны тоо", "number")}
        {field("floors", "Давхрын тоо", "number")}
        {field("apts_per_floor", "Давхар дахь айлын тоо", "number")}
      </section>

      <section className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Цагийн хуваарь, захиалга</h2>
        {field("open_time", "Нээх цаг", "time")}
        {field("close_time", "Хаах цаг (24 цагийн формат, жишээ нь 23:00)", "time")}
        {field("min_order", "Захиалгын доод хэмжээ (₮)", "number")}
        {field("shop_phone", "Дэлгүүрийн утас")}
      </section>

      <section className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Дансны мэдээлэл</h2>
        {field("bank_name", "Банк")}
        {field("bank_account", "Дансны дугаар")}
        {field("bank_holder", "Данс эзэмшигч")}
      </section>

      {msg && (
        <p role="status" className={msg.ok ? "font-medium text-brand-strong" : "font-medium text-destructive"}>
          {msg.text}
        </p>
      )}
      {isOwner && (
        <button type="submit" disabled={pending} className="h-14 rounded-xl bg-brand-strong text-base font-semibold text-white disabled:opacity-60">
          {pending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      )}
    </form>
  );
}
