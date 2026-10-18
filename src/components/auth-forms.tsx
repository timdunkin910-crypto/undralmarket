"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const field = "h-12 rounded-xl text-base";
const select = "h-12 w-full rounded-xl border border-input bg-white px-3 text-base outline-none focus:border-brand focus:ring-3 focus:ring-mint";
const submit = "h-14 w-full rounded-xl bg-brand-strong text-base font-semibold text-white hover:bg-forest disabled:opacity-60";

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-destructive">
      {error}
    </p>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Утасны дугаар</Label>
        <Input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="9911 2233" maxLength={9} required className={field} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Нууц үг</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className={field} />
      </div>
      <ErrorText error={state?.error} />
      <button type="submit" disabled={pending} className={submit}>
        {pending ? "Түр хүлээнэ үү…" : "Нэвтрэх"}
      </button>
      <p className="text-center text-sm">
        Бүртгэлгүй юу? <Link href="/signup" className="font-semibold text-brand-strong underline">Бүртгүүлэх</Link>
      </p>
      <p className="text-center text-xs text-muted-foreground">Нууц үгээ мартсан бол дэлгүүрт хандана уу.</p>
    </form>
  );
}

export function SignupForm({ entrances, floors }: { entrances: number; floors: number }) {
  const [state, action, pending] = useActionState(signUp, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Нэр</Label>
        <Input id="name" name="name" autoComplete="given-name" maxLength={60} required className={field} placeholder="Жишээ нь: Болд" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Утасны дугаар</Label>
        <Input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" maxLength={9} required className={field} placeholder="9911 2233" />
      </div>
      <fieldset className="grid grid-cols-3 gap-2">
        <legend className="mb-1.5 text-sm font-medium">Хаяг</legend>
        <div className="flex flex-col gap-1">
          <Label htmlFor="entrance" className="text-xs text-muted-foreground">Орц</Label>
          <select id="entrance" name="entrance" required className={select} defaultValue="">
            <option value="" disabled>—</option>
            {Array.from({ length: entrances }, (_, i) => (
              <option key={i} value={i + 1}>{i + 1}-р орц</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="floor" className="text-xs text-muted-foreground">Давхар</Label>
          <select id="floor" name="floor" required className={select} defaultValue="">
            <option value="" disabled>—</option>
            {Array.from({ length: floors }, (_, i) => (
              <option key={i} value={i + 1}>{i + 1}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="number" className="text-xs text-muted-foreground">Тоот</Label>
          <Input id="number" name="number" type="number" inputMode="numeric" min={1} max={9999} required className={field} />
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">Урилгын код</Label>
        <Input id="code" name="code" autoCapitalize="characters" autoComplete="off" required className={`${field} uppercase`} placeholder="UNDRAL-XXXXXX" />
        <p className="text-xs text-muted-foreground">Лифтэнд наасан зар дээр байгаа.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Нууц үг</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={6} required className={field} />
      </div>
      <ErrorText error={state?.error} />
      <button type="submit" disabled={pending} className={submit}>
        {pending ? "Бүртгэж байна…" : "Бүртгүүлэх"}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        Дэлгүүрийн эзэн баталгаажуулсны дараа захиалах боломжтой болно.
      </p>
      <p className="text-center text-sm">
        Бүртгэлтэй юу? <Link href="/login" className="font-semibold text-brand-strong underline">Нэвтрэх</Link>
      </p>
    </form>
  );
}
