// Opening-hours logic, always in Ulaanbaatar time (UTC+8, no DST).
const UB_OFFSET_MIN = 8 * 60;

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function hhmm(t: string) {
  return t.slice(0, 5);
}

/** Minutes since midnight in Ulaanbaatar. */
export function ubNowMinutes(now = new Date()) {
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMin + UB_OFFSET_MIN) % (24 * 60);
}

export type ShopStatus =
  | { open: true; closesAt: string; msLeft: number }
  | { open: false; opensAt: string; tomorrow: boolean };

export function shopStatus(openTime: string, closeTime: string, now = new Date()): ShopStatus {
  const cur = ubNowMinutes(now);
  const o = toMin(openTime);
  const c = toMin(closeTime);
  const open = o < c ? cur >= o && cur < c : cur >= o || cur < c;
  if (open) {
    const left = (c - cur + 24 * 60) % (24 * 60);
    return { open: true, closesAt: hhmm(closeTime), msLeft: left * 60_000 - now.getUTCSeconds() * 1000 };
  }
  return { open: false, opensAt: hhmm(openTime), tomorrow: cur >= c && o < c };
}

export function closedMessage(s: Extract<ShopStatus, { open: false }>) {
  return s.tomorrow ? `маргааш ${s.opensAt}-д нээгдэнэ` : `өнөөдөр ${s.opensAt}-д нээгдэнэ`;
}

/** Delivery slots for the rest of today (every 30 min, from now+45min until closing). */
export function todaySlots(closeTime: string, now = new Date()) {
  const cur = ubNowMinutes(now);
  const c = toMin(closeTime);
  const start = Math.ceil((cur + 45) / 30) * 30;
  const slots: { label: string; iso: string }[] = [];
  for (let m = start; m <= c - 15 && m < 24 * 60; m += 30) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const label = `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    // Build an absolute timestamp for that UB wall-clock time today
    const d = new Date(now.getTime() + (m - cur) * 60_000);
    d.setUTCSeconds(0, 0);
    slots.push({ label, iso: d.toISOString() });
  }
  return slots;
}
