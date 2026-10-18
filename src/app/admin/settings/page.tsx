import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Тохиргоо" };

export default async function AdminSettingsPage() {
  const me = await requireStaff("/admin/settings");
  const settings = await getSettings();
  const sb = await createClient();
  // Raw row (incl. invite code) is readable by staff only
  const { data } = await sb.from("settings").select("invite_code").eq("id", 1).maybeSingle();
  return <SettingsForm settings={settings} inviteCode={data?.invite_code ?? ""} isOwner={me.role === "owner"} />;
}
