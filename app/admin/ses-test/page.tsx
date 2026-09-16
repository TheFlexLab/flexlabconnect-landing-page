import { redirect } from "next/navigation";
import Image from "next/image";
import { getAdminSession } from "@/lib/admin-auth";
import SesTestClient from "./SesTestClient";

export const metadata = { robots: { index: false, follow: false } };

export default async function SesTestPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <main className="page-gradient relative min-h-screen px-5 py-8 sm:px-8 sm:py-10">
      <div className="grid-motif pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-card-border bg-white px-4 py-3 shadow-sm">
              <Image src="/flexlab-logo.svg" alt="FlexLab" width={112} height={29} priority />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Internal Admin</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">SES Test Sender</h1>
            </div>
          </div>
        </header>
        <SesTestClient
          fromEmail={process.env.SES_FROM_EMAIL || "contact@flexlabconnect.com"}
          replyTo={process.env.SES_REPLY_TO || process.env.SES_FROM_EMAIL || "contact@flexlabconnect.com"}
          region={process.env.SES_REGION || "us-east-2"}
        />
      </div>
    </main>
  );
}
