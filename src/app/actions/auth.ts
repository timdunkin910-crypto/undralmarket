"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { phoneToEmail } from "@/lib/format";

export type FormState = { error?: string } | undefined;

const cleanPhone = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\D/g, "");
const safeNext = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "/");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  if (!supabaseConfigured) return { error: "Систем тохируулагдаагүй байна." };
  const phone = cleanPhone(form.get("phone"));
  const password = String(form.get("password") ?? "");
  if (phone.length !== 8) return { error: "Утасны дугаар 8 оронтой байна." };

  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword({ email: phoneToEmail(phone), password });
  if (error) return { error: "Утасны дугаар эсвэл нууц үг буруу байна." };
  revalidatePath("/", "layout");
  redirect(safeNext(form.get("next")));
}

const REGISTER_ERRORS: Record<string, string> = {
  BAD_INVITE_CODE: "Урилгын код буруу байна. Лифтэн дэх зарын кодыг шалгана уу.",
  BAD_ADDRESS: "Орц эсвэл давхар буруу байна.",
  ADDRESS_MISMATCH: "Энэ тоот өөр орц/давхарт бүртгэлтэй байна. Дэлгүүр рүү залгана уу.",
};

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  if (!supabaseConfigured) return { error: "Систем тохируулагдаагүй байна." };
  const name = String(form.get("name") ?? "").trim();
  const phone = cleanPhone(form.get("phone"));
  const password = String(form.get("password") ?? "");
  const entrance = Number(form.get("entrance"));
  const floor = Number(form.get("floor"));
  const number = Number(form.get("number"));
  const code = String(form.get("code") ?? "").trim();

  if (!name || name.length > 60) return { error: "Нэрээ оруулна уу." };
  if (phone.length !== 8) return { error: "Утасны дугаар 8 оронтой байна." };
  if (password.length < 6) return { error: "Нууц үг хамгийн багадаа 6 тэмдэгт байна." };
  if (![entrance, floor, number].every((n) => Number.isInteger(n) && n > 0)) return { error: "Орц, давхар, тоотоо сонгоно уу." };

  const sb = await createClient();
  // Check the code before creating an auth account, so wrong codes don't leave orphan users
  const { data: codeOk } = await sb.rpc("check_invite_code", { p_code: code });
  if (!codeOk) return { error: REGISTER_ERRORS.BAD_INVITE_CODE };

  const email = phoneToEmail(phone);
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name, phone } } });
  if (error) {
    // Account exists (e.g. an earlier attempt failed half-way): let them finish if the password matches
    const { error: inErr } = await sb.auth.signInWithPassword({ email, password });
    if (inErr) return { error: "Энэ дугаар бүртгэлтэй байна. Нэвтэрнэ үү." };
  } else if (!data.session) {
    return { error: "Supabase-д имэйл баталгаажуулалтыг унтраах шаардлагатай (README)." };
  }

  const { error: regErr } = await sb.rpc("register_resident", {
    p_name: name,
    p_phone: phone,
    p_entrance: entrance,
    p_floor: floor,
    p_number: number,
    p_code: code,
  });
  if (regErr) {
    const key = Object.keys(REGISTER_ERRORS).find((k) => regErr.message.includes(k));
    if (regErr.message.includes("duplicate")) return { error: "Энэ утасны дугаар бүртгэлтэй байна." };
    return { error: key ? REGISTER_ERRORS[key] : "Бүртгэхэд алдаа гарлаа. Дахин оролдоно уу." };
  }
  revalidatePath("/", "layout");
  redirect("/me?welcome=1");
}

export async function signOut() {
  const sb = await createClient();
  await sb.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
