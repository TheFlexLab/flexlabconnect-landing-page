"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Toast = { type: "success" | "error"; message: string } | null;

const DEFAULT_SUBJECT = "FlexLab SES transactional email test";
const DEFAULT_MESSAGE = `Hello,\n\nThis is a transactional email test from FlexLab Connect using Amazon SES.\n\nRegards,\nFlexLab`;

export default function SesTestClient({
  fromEmail,
  replyTo,
  region,
}: {
  fromEmail: string;
  replyTo: string;
  region: string;
}) {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [messageId, setMessageId] = useState("");

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setToast(null);
    setMessageId("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/ses-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to, subject, message }),
      });
      const data = (await response.json()) as { error?: string; messageId?: string };
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok) throw new Error(data.error || "Unable to send email.");
      setMessageId(data.messageId || "");
      setToast({ type: "success", message: "Test email sent successfully through Amazon SES." });
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Unable to send email." });
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <>
      {toast ? (
        <div className={`fixed right-5 top-5 z-50 max-w-sm rounded-2xl border px-5 py-4 text-sm shadow-xl ${toast.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`} role="status" aria-live="polite">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 font-bold" aria-hidden="true">{toast.type === "success" ? "✓" : "!"}</span>
            <p className="leading-5">{toast.message}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-card-border bg-white/95 p-6 shadow-[0_14px_45px_rgba(0,0,0,0.06)] sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Send a test email</h2>
            <p className="mt-2 text-sm leading-6 text-muted">While SES is in sandbox, the recipient must be verified in the same SES region.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="to" className="mb-2 block text-sm font-semibold text-foreground">Recipient email</label>
              <input id="to" type="email" autoComplete="email" required maxLength={254} value={to} onChange={(e) => setTo(e.target.value)} className="admin-input" placeholder="verified-recipient@example.com" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="subject" className="block text-sm font-semibold text-foreground">Subject</label>
                <span className="text-xs text-muted">{subject.length}/200</span>
              </div>
              <input id="subject" required maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} className="admin-input" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="message" className="block text-sm font-semibold text-foreground">Message</label>
                <span className="text-xs text-muted">{message.length}/10,000</span>
              </div>
              <textarea id="message" required maxLength={10000} rows={9} value={message} onChange={(e) => setMessage(e.target.value)} className="admin-input resize-y" />
            </div>
            <button type="submit" disabled={loading || !to || !subject.trim() || !message.trim()} className="admin-primary-button min-w-40 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Sending…" : "Send test email"}
            </button>
          </form>

          {messageId ? (
            <div className="mt-6 rounded-2xl border border-green-200 bg-green-50/70 p-4">
              <p className="text-sm font-semibold text-green-900">SES accepted the email</p>
              <p className="mt-1 break-all font-mono text-xs leading-5 text-green-800">Message ID: {messageId}</p>
            </div>
          ) : null}
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-card-border bg-white/95 p-6 shadow-[0_14px_45px_rgba(0,0,0,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-700">Sender</p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">FlexLab</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="text-muted">From</dt><dd className="mt-1 break-all font-medium text-foreground">{fromEmail}</dd></div>
              <div><dt className="text-muted">Reply-To</dt><dd className="mt-1 break-all font-medium text-foreground">{replyTo}</dd></div>
              <div><dt className="text-muted">Region</dt><dd className="mt-1 font-medium text-foreground">{region}</dd></div>
            </dl>
          </div>

          <div className="rounded-3xl border border-card-border bg-white/95 p-6 shadow-[0_14px_45px_rgba(0,0,0,0.05)]">
            <h2 className="text-sm font-semibold text-foreground">Admin session</h2>
            <p className="mt-2 text-sm leading-6 text-muted">This page is protected by an HTTP-only signed session cookie.</p>
            <button type="button" onClick={logout} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-foreground px-5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5">Log out</button>
          </div>
        </aside>
      </div>
    </>
  );
}
