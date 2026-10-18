import type { Apartment, OrderStatus, PaymentMethod } from "./types";

/** 12500 → "12,500₮" */
export function mnt(n: number) {
  return `${Math.round(n).toLocaleString("en-US")}₮`;
}

/** "3-р орц, 12 давхар, 47 тоот" */
export function aptLabel(a: Pick<Apartment, "entrance" | "floor" | "number"> | null | undefined) {
  if (!a) return "";
  return `${a.entrance}-р орц, ${a.floor} давхар, ${a.number} тоот`;
}

export function aptShort(a: Pick<Apartment, "entrance" | "floor" | "number"> | null | undefined) {
  if (!a) return "";
  return `${a.entrance} орц · ${a.floor} давх · ${a.number} тоот`;
}

/** "99977961" → "9997-7961" */
export function phoneFmt(p: string) {
  return p.length === 8 ? `${p.slice(0, 4)}-${p.slice(4)}` : p;
}

/** Residents log in with phone + password; Supabase Auth needs an email, so we derive one. */
export function phoneToEmail(phone: string) {
  return `${phone}@resident.undralmarket.mn`;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Хүлээн авсан",
  preparing: "Бэлтгэж байна",
  delivering: "Хүргэлтэнд гарсан",
  delivered: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
};

export const PICKUP_STATUS_LABEL: Record<OrderStatus, string> = {
  ...STATUS_LABEL,
  delivering: "Авахад бэлэн",
  delivered: "Авсан",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  qpay: "QPay",
  socialpay: "SocialPay",
  transfer: "Дансаар шилжүүлэх",
  cash_card: "Бэлнээр / карт",
  tab: "Дэвтэр",
};

export function timeHM(iso: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function dateShort(iso: string) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${m}/${day} ${timeHM(iso)}`;
}
