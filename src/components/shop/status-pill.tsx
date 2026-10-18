"use client";

import { useEffect, useState } from "react";
import { closedMessage, shopStatus } from "@/lib/hours";
import { cn } from "@/lib/utils";

/** "Нээлттэй · 15–30 минутад хүргэнэ" / "Хаалттай · маргааш 08:00-д нээгдэнэ". Re-evaluates every minute. */
export function StatusPill({
  openTime,
  closeTime,
  deliveryEnabled,
  className,
}: {
  openTime: string;
  closeTime: string;
  deliveryEnabled: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const s = shopStatus(openTime, closeTime, now);
  const text = s.open
    ? deliveryEnabled
      ? "Нээлттэй · 15–30 минутад хүргэнэ"
      : "Нээлттэй · одоо зөвхөн лангуунаас"
    : `Хаалттай · ${closedMessage(s)}`;
  return (
    <span
      role="status"
      suppressHydrationWarning
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium",
        s.open ? "bg-mint text-forest" : "bg-zinc-100 text-zinc-700",
        className,
      )}
    >
      <span className={cn("size-2 rounded-full", s.open ? "bg-brand animate-pulse" : "bg-zinc-400")} aria-hidden />
      {text}
    </span>
  );
}
