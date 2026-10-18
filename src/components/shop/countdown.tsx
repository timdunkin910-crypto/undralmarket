"use client";

import { useEffect, useState } from "react";
import { shopStatus } from "@/lib/hours";

/** Live HH:MM:SS until closing time (daily deals end when the shop closes). */
export function Countdown({ openTime, closeTime }: { openTime: string; closeTime: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start the clock on the client only
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <span className="tabular" aria-hidden>--:--:--</span>;
  const s = shopStatus(openTime, closeTime, now);
  if (!s.open) return <span>Дууссан</span>;
  const sec = Math.max(0, Math.floor(s.msLeft / 1000));
  const parts = [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60].map((n) => String(n).padStart(2, "0"));
  return (
    <span className="tabular inline-flex gap-1" aria-label={`Хаахад ${parts[0]} цаг ${parts[1]} минут үлдлээ`}>
      {parts.map((p, i) => (
        <span key={i} className="rounded-md bg-white px-1.5 py-0.5 font-bold text-forest">
          {p}
        </span>
      ))}
    </span>
  );
}
