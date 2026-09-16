import { redirect } from "next/navigation";
import Image from "next/image";
import { getAdminSession } from "@/lib/admin-auth";
import LoginForm from "./LoginForm";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin/ses-test");

  return (
    <main className="page-gradient relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid-motif pointer-events-none absolute inset-0" aria-hidden="true" />
      <section className="relative z-10 w-full max-w-md rounded-3xl border border-card-border bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-10">
        <div className="flex justify-center">
          <Image src="/flexlab-logo.svg" alt="FlexLab" width={123} height={32} priority />
        </div>
        <div className="mt-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Internal Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">SES Test Sender</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Sign in with the admin credentials configured in the environment.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
