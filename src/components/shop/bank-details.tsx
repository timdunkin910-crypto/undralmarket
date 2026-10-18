"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { mnt } from "@/lib/format";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-brand-strong px-3 text-sm font-semibold text-brand-strong"
      aria-label={`${label} хуулах`}
    >
      {done ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {done ? "Хуулсан" : "Хуулах"}
    </button>
  );
}

export function BankDetails({
  bank,
  account,
  holder,
  amount,
  reference,
}: {
  bank: string;
  account: string;
  holder: string;
  amount?: number;
  reference?: string;
}) {
  return (
    <dl className="flex flex-col gap-2 rounded-xl bg-mint-soft p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <dt className="text-muted-foreground">{bank} · данс</dt>
          <dd className="tabular text-lg font-bold">{account}</dd>
        </div>
        <CopyButton value={account} label="Дансны дугаар" />
      </div>
      <div>
        <dt className="text-muted-foreground">Хүлээн авагч</dt>
        <dd className="font-semibold">{holder}</dd>
      </div>
      {amount != null && (
        <div>
          <dt className="text-muted-foreground">Дүн</dt>
          <dd className="tabular font-semibold">{mnt(amount)}</dd>
        </div>
      )}
      {reference && (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <dt className="text-muted-foreground">Гүйлгээний утга</dt>
            <dd className="font-semibold">{reference}</dd>
          </div>
          <CopyButton value={reference} label="Гүйлгээний утга" />
        </div>
      )}
    </dl>
  );
}
