import "server-only";
import { redirect } from "next/navigation";
import { getMe } from "./data";

/** Every admin page calls this itself — layouts alone are not an auth boundary. */
export async function requireStaff(next = "/admin") {
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (me.status !== "approved" || (me.role !== "staff" && me.role !== "owner")) redirect("/");
  return me;
}
