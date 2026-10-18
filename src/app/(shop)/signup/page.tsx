import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth-forms";
import { getMe, getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Бүртгүүлэх" };

export default async function SignupPage() {
  const [me, settings] = await Promise.all([getMe(), getSettings()]);
  if (me) redirect("/me");
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 pt-4">
      <div>
        <h1 className="text-2xl font-bold">Бүртгүүлэх</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Зөвхөн манай байрны оршин суугчдад ({settings.building_name}). Хаягаа нэг удаа оруулахад хангалттай.
        </p>
      </div>
      <SignupForm entrances={settings.entrances} floors={settings.floors} />
    </div>
  );
}
