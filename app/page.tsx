import Image from "next/image";

const FLEXLAB_URL = "https://flexlab.io";
const CONTACT_URL = "https://flexlab.io/contact";
const PRIVACY_URL = "https://flexlab.io/privacy-policy";
const TERMS_URL = "https://flexlab.io/terms-and-conditions";
const SUPPORT_EMAIL = "info@flexlab.io";

export default function Home() {
  return (
    <div className="page-gradient relative flex min-h-screen flex-col">
      <div
        className="grid-motif pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      <header className="relative z-10 flex justify-center px-6 pt-8 sm:px-8">
        <a
          href={FLEXLAB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
          aria-label="Visit the official FlexLab website"
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

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-8 sm:py-16">
        <section
          className="w-full max-w-2xl rounded-3xl border border-card-border bg-card px-8 py-12 text-center shadow-[0_8px_30px_rgba(34,197,94,0.08)] sm:px-12 sm:py-14"
          aria-labelledby="site-heading"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-green-700">
            Official FlexLab Domain
          </p>

          <h1
            id="site-heading"
            className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          >
            FlexLab Connect
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            FlexLab Connect is an official email communication domain owned and
            operated by FlexLab.
          </p>

          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-card-border bg-white/60 px-6 py-6 text-left">
            <h2 className="text-lg font-semibold text-foreground">
              How we use this domain
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
              This domain is used for communications requested by website
              visitors, existing customers, business contacts who have directly
              contacted FlexLab, and subscribers who have explicitly requested
              updates.
            </p>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted sm:text-base">
              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                <span>
                  Contact-form and meeting-request confirmations
                </span>
              </li>

              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                <span>
                  Customer, project, billing, security, and service updates
                </span>
              </li>

              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                <span>
                  Updates sent to people who have explicitly subscribed
                </span>
              </li>

              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                <span>
                  Replies to inquiries submitted directly to FlexLab
                </span>
              </li>
            </ul>

            <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
              Recipients are added to this list only after taking a direct
              action, such as submitting our contact form, requesting a
              meeting, or checking a subscribe box on our website. We never
              add anyone without their explicit action, and typical
              recipients receive no more than a few emails per month.
            </p>
          </div>

          <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-card-border bg-white/60 px-6 py-6 text-left">
            <h2 className="text-lg font-semibold text-foreground">
              Our email policy
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
              FlexLab does not use purchased, rented, scraped, or third-party
              mailing lists for emails sent through this domain. Every optional
              email includes a one-click unsubscribe link, and any bounce,
              complaint, or unsubscribe is automatically suppressed from all
              future delivery.
            </p>

            <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
              Recipients can also request assistance or update their
              communication preferences by contacting{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Email%20Preference%20Request`}
                className="font-semibold text-foreground underline underline-offset-4"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={FLEXLAB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-foreground px-7 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:w-auto"
            >
              Visit FlexLab
            </a>

            <a
              href={CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-foreground px-7 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:w-auto"
            >
              Contact FlexLab
            </a>
          </div>

          <nav
            className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm"
            aria-label="Legal and support links"
          >
            <a
              href={PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted underline underline-offset-4 hover:text-foreground"
            >
              Privacy Policy
            </a>

            <a
              href={TERMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted underline underline-offset-4 hover:text-foreground"
            >
              Terms of Service
            </a>

            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Unsubscribe%20Request`}
              className="text-muted underline underline-offset-4 hover:text-foreground"
            >
              Unsubscribe Request
            </a>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-muted underline underline-offset-4 hover:text-foreground"
            >
              Email Support
            </a>
          </nav>
        </section>
      </main>

      <footer className="relative z-10 border-t border-card-border bg-white/70 px-6 py-6 text-center sm:px-8">
        <p className="text-xs leading-relaxed text-muted sm:text-sm">
          FlexLab Connect is an official communication domain of{" "}
          <a
            href={FLEXLAB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground underline underline-offset-4"
          >
            FlexLab
          </a>
          .
        </p>

        <p className="mt-2 text-xs leading-relaxed text-muted">
          © {new Date().getFullYear()} FlexLab. All rights reserved.
        </p>
      </footer>
    </div>
  );
}