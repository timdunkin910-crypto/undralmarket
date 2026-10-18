import type { Metadata } from "next";
import { ResidentAdmin, type ResidentRow } from "@/components/admin/resident-admin";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Оршин суугчид" };

export default async function AdminResidentsPage() {
  const me = await requireStaff("/admin/residents");
  const sb = await createClient();
  const [{ data: residents }, { data: balances }] = await Promise.all([
    sb.from("residents").select("*, apartment:apartments(*)").order("created_at", { ascending: false }),
    sb.from("apartment_balances").select("*"),
  ]);
  const balance = Object.fromEntries((balances ?? []).map((b) => [b.apartment_id as string, b.balance as number]));
  return <ResidentAdmin residents={(residents as ResidentRow[]) ?? []} balances={balance} isOwner={me.role === "owner"} myId={me.id} />;
}
