import { brandIcon } from "@/lib/brand-icon";

const SIZES = ["192", "512", "maskable"] as const;

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(_: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  if (size === "maskable") return brandIcon(512, { maskable: true });
  return brandIcon(size === "192" ? 192 : 512);
}
