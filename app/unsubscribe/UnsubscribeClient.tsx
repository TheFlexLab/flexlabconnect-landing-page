"use client";

import { useState } from "react";
import Image from "next/image";

type UnsubscribeState =
  | "idle"
  | "loading"
  | "success"
  | "already_unsubscribed"
  | "error";

export default function UnsubscribeClient({ token }: { token: string }) {

  const [status, setStatus] = useState<UnsubscribeState>("idle");
  const [message, setMessage] = useState("");

  const handleUnsubscribe = async () => {
    if (!token) {
      setStatus("error");
      setMessage(
        "This unsubscribe link is invalid or incomplete. Please contact FlexLab support for assistance."
      );
      return;
    }

    try {
      setStatus("loading");
      setMessage("");

      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.status === "already_unsubscribed") {
        setStatus("already_unsubscribed");
        setMessage(
          "You are already unsubscribed from optional FlexLab email communications."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message || "We were unable to process your request."
        );
      }

      setStatus("success");
      setMessage(
        "You have been successfully unsubscribed from optional FlexLab email communications."
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "We were unable to process your unsubscribe request."
      );
    }
  };

  const isFinished =
    status === "success" || status === "already_unsubscribed";

  return (
    <div className="page-gradient relative flex min-h-screen flex-col">
      <div
        className="grid-motif pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      <header className="relative z-10 flex justify-center px-6 pt-8 sm:px-8">
        <a
          href="/"
          className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
          aria-label="FlexLab Connect home"
        >
          <Image
            src="/flexlab-logo.svg"
            alt="FlexLab"
            width={123}
            height={32}
            priority
          />
        </a>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12 sm:px-8 sm:py-16">
        <section className="w-full max-w-xl rounded-3xl border border-card-border bg-card px-8 py-12 text-center shadow-[0_8px_30px_rgba(34,197,94,0.08)] sm:px-12 sm:py-14">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-green-700">
            Email Preferences
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Unsubscribe
          </h1>

          {!isFinished && (
            <>
              <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted">
                You can stop receiving optional FlexLab email communications at
                any time.
              </p>

              <div className="mt-8 rounded-2xl border border-card-border bg-white/60 px-6 py-6 text-left">
                <h2 className="text-lg font-semibold text-foreground">
                  What happens when you unsubscribe?
                </h2>

                <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
                  <li className="flex gap-3">
                    <span aria-hidden="true">✓</span>
                    <span>
                      You will no longer receive optional marketing or update
                      emails from FlexLab.
                    </span>
                  </li>

                  <li className="flex gap-3">
                    <span aria-hidden="true">✓</span>
                    <span>
                      Your unsubscribe preference will be recorded immediately.
                    </span>
                  </li>

                  <li className="flex gap-3">
                    <span aria-hidden="true">✓</span>
                    <span>
                      Important transactional or service-related messages may
                      still be sent where necessary.
                    </span>
                  </li>
                </ul>
              </div>

              {status === "error" && (
                <div
                  className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-left text-sm leading-6 text-red-700"
                  role="alert"
                >
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={status === "loading"}
                className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-foreground px-7 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {status === "loading"
                  ? "Processing..."
                  : "Unsubscribe from optional emails"}
              </button>

              <p className="mx-auto mt-5 max-w-md text-xs leading-relaxed text-muted">
                If you did not request this change or need assistance, contact{" "}
                <a
                  href="mailto:info@flexlab.io"
                  className="font-semibold text-foreground underline underline-offset-4"
                >
                  info@flexlab.io
                </a>
                .
              </p>
            </>
          )}

          {isFinished && (
            <div className="mt-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-green-200 bg-green-50 text-2xl">
                ✓
              </div>

              <h2 className="mt-6 text-2xl font-semibold text-foreground">
                Preference updated
              </h2>

              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted">
                {message}
              </p>

              <a
                href="https://flexlab.io"
                className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-7 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
              >
                Visit FlexLab
              </a>
            </div>
          )}
        </section>
      </main>

      <footer className="relative z-10 border-t border-card-border bg-white/70 px-6 py-6 text-center sm:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted sm:text-sm">
          <a
            href="https://flexlab.io/privacy-policy"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Privacy Policy
          </a>

          <a
            href="https://flexlab.io/terms-and-conditions"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Terms of Service
          </a>

          <a
            href="mailto:info@flexlab.io"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Email Support
          </a>
        </div>

        <p className="mt-3 text-xs text-muted">
          © {new Date().getFullYear()} FlexLab. All rights reserved.
        </p>
      </footer>
    </div>
  );
}