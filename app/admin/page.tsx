import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminPage() {
  const session = await getAdminSession();
  redirect(session ? "/admin/ses-test" : "/admin/login");
}
