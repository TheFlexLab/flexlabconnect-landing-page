import Image from "next/image";
import Link from "next/link";

const FLEXLAB_URL = "https://flexlab.io";
const CONTACT_URL = "https://flexlab.io/contact";
const PRIVACY_URL = "https://flexlab.io/privacy-policy";
const TERMS_URL = "https://flexlab.io/terms-and-conditions";

const SUPPORT_EMAIL = "contact@flexlabconnect.com";

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
            Official FlexLab Communication Domain
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
              This domain is used for requested business communication with
              people who contact FlexLab directly, request a meeting, or are
              already working with us as clients.
            </p>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted sm:text-base">
              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                <span>Replies to website and project inquiries</span>
              </li>

              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                <span>Meeting confirmations and meeting-related follow-ups</span>
              </li>

              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                <span>
                  Project and service-related communication with existing
                  clients
                </span>
              </li>

              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                <span>
                  Other communication directly requested by the recipient
                </span>
              </li>
            </ul>

            <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
              Recipients are contacted only after a direct interaction with
              FlexLab, such as submitting an inquiry, requesting a meeting, or
              becoming an existing client. Contact or meeting requests do not
              automatically subscribe anyone to marketing emails.
            </p>
          </div>

          <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-card-border bg-white/60 px-6 py-6 text-left">
            <h2 className="text-lg font-semibold text-foreground">
              Our email practices
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
              FlexLab does not use purchased, rented, scraped, or third-party
              mailing lists for emails sent through this domain. Email
              addresses are collected through direct business interactions
              with FlexLab.
            </p>

            <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            This domain is not used for cold outreach, newsletters, bulk marketing, or unsolicited email campaigns.
            </p>

            <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
              Bounce and complaint events are monitored and affected addresses
              are suppressed from future sending. Where an unsubscribe or
              communication preference request applies, it is recorded and
              respected for future email delivery.
            </p>

            <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
              If you received an email from this domain and need help with your
              communication preferences, contact{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Email%20Preference%20Request`}
                className="font-semibold text-foreground underline underline-offset-4"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>

          <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-card-border bg-white/60 px-6 py-6 text-left">
            <h2 className="text-lg font-semibold text-foreground">
              About FlexLab
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
              FlexLab is a software and AI solutions company. Our main business
              website is flexlab.io, while flexlabconnect.com is used as a
              dedicated domain for requested business email communication.
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

            <Link
              href="/unsubscribe"
              className="text-muted underline underline-offset-4 hover:text-foreground"
            >
              Email Preferences
            </Link>

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