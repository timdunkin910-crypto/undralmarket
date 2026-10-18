"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMe, getSettings } from "@/lib/data";
import { aptShort, mnt } from "@/lib/format";
import { closedMessage, shopStatus } from "@/lib/hours";
import { sendPush } from "@/lib/push";
import type { Fulfilment, PaymentMethod, Settings } from "@/lib/types";

const ERRORS: Record<string, string> = {
  NOT_APPROVED: "Таны бүртгэл хараахан баталгаажаагүй байна. Дэлгүүрийн эзэн баталгаажуулсны дараа захиалах боломжтой.",
  SHOP_CLOSED: "Дэлгүүр хаалттай байна. Нээгдсэний дараа захиална уу.",
  DELIVERY_OFF: "Яг одоо хүргэлт түр зогссон байна. Лангуунаас авах сонголтоор захиална уу.",
  BAD_TIME: "Сонгосон хүргэх цаг өнгөрсөн эсвэл хаах цагаас хойш байна. Өөр цаг сонгоно уу.",
  EMPTY_CART: "Сагс хоосон байна.",
  PRODUCT_GONE: "Сагсанд байгаа зарим бараа худалдаанаас хасагдсан байна. Сагсаа шалгана уу.",
  BELOW_MINIMUM: "Захиалгын доод хэмжээнд хүрээгүй байна.",
  TAB_DISABLED: "Танай тоотод Дэвтэр нээгдээгүй байна.",
  TAB_LIMIT: "Дэвтрийн хязгаар хэтэрнэ. Өмнөх төлбөрөө төлнө үү.",
  BAD_QTY: "Тоо ширхэг буруу байна.",
  CANNOT_CANCEL: "Захиалгыг бэлтгэж эхэлсэн тул цуцлах боломжгүй. Дэлгүүр рүү залгана уу.",
};

/** Maps a place_order/cancel_order exception to Mongolian; with settings, names the reopening time and minimum. */
function errorText(message: string, settings?: Settings) {
  if (message.includes("SOLD_OUT:")) return `«${message.split("SOLD_OUT:")[1].trim()}» дууссан байна. Сагснаасаа хасна уу.`;
  if (settings && message.includes("SHOP_CLOSED")) {
    const status = shopStatus(settings.open_time, settings.close_time);
    if (!status.open) return `Дэлгүүр хаалттай байна · ${closedMessage(status)}.`;
  }
  if (settings && message.includes("BELOW_MINIMUM")) {
    return `Хамгийн бага захиалга ${mnt(settings.min_order)}. Сагсандаа бараа нэмнэ үү.`;
  }
  const code = Object.keys(ERRORS).find((k) => message.includes(k));
  return code ? ERRORS[code] : "Алдаа гарлаа. Дахин оролдоно уу.";
}

export type PlaceOrderInput = {
  items: { product_id: string; qty: number }[];
  fulfilment: Fulfilment;
  scheduledFor: string | null;
  payment: PaymentMethod;
  note: string;
  bottleReturn: number;
};

export async function placeOrder(input: PlaceOrderInput): Promise<{ id: number } | { error: string }> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("place_order", {
    p_items: input.items.slice(0, 60),
    p_fulfilment: input.fulfilment,
    p_scheduled_for: input.scheduledFor,
    p_payment: input.payment,
    p_note: input.note.slice(0, 300),
    p_bottle_return: input.bottleReturn,
  });
  if (error) return { error: errorText(error.message, await getSettings()) };

  const id = data as number;
  const [me, { data: order }] = await Promise.all([
    getMe(),
    sb.from("orders").select("total, fulfilment").eq("id", id).single(),
  ]);
  after(async () => {
    await sendPush("staff", {
      title: `Шинэ захиалга #${id}`,
      body: `${aptShort(me?.apartment)} · ${order ? mnt(order.total) : ""}${order?.fulfilment === "pickup" ? " · лангуунаас" : ""}`,
      url: "/admin",
      tag: `order-${id}`,
    });
  });
  revalidatePath("/orders");
  return { id };
}

export async function cancelOrder(id: number): Promise<{ ok: true } | { error: string }> {
  const sb = await createClient();
  const { error } = await sb.rpc("cancel_order", { p_order: id });
  if (error) return { error: errorText(error.message) };
  const me = await getMe();
  after(() =>
    sendPush("staff", { title: `Захиалга #${id} цуцлагдлаа`, body: aptShort(me?.apartment), url: "/admin", tag: `order-${id}` }),
  );
  revalidatePath(`/orders/${id}`);
  return { ok: true };
}
