import Image from "next/image";

export default function Home() {
  return (
    <div className="page-gradient relative flex min-h-full flex-1 flex-col">
      <div
        className="grid-motif pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      <header className="relative z-10 flex justify-center px-6 pt-8 sm:px-8">
        <a
          href="https://flexlab.io"
          className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
          aria-label="Visit FlexLab"
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
          className="w-full max-w-xl rounded-3xl border border-card-border bg-card px-8 py-12 text-center shadow-[0_8px_30px_rgba(34,197,94,0.08)] sm:px-12 sm:py-14"
          aria-labelledby="site-heading"
        >
          <h1
            id="site-heading"
            className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          >
            FlexLab Connect
          </h1>

          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Official outreach and communication domain of FlexLab.
          </p>

          <div className="mt-9">
            <a
              href="https://flexlab.io"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-7 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              For more information, visit FlexLab
            </a>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-card-border bg-white/70 px-6 py-6 text-center sm:px-8">
        <p className="text-xs leading-relaxed text-muted sm:text-sm">
          FlexLab Connect is an official communication domain of FlexLab.
        </p>
      </footer>
    </div>
  );
}
