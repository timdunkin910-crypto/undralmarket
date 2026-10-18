import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { getMe } from "@/lib/data";

export const metadata: Metadata = { title: "Нэвтрэх" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 pt-4">
      <h1 className="text-2xl font-bold">Нэвтрэх</h1>
      <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-mint-soft" />}>
        <Login searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Login({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  if (await getMe()) redirect(next);
  return <LoginForm next={next} />;
}
