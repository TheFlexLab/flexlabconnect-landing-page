"use client";

import { useEffect, useState } from "react";

type RedirectCountdownProps = {
  url?: string;
  seconds?: number;
};

export default function RedirectCountdown({
  url = "https://flexlab.io",
  seconds = 10,
}: RedirectCountdownProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(seconds);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          window.location.replace(url);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [url]);

  const hostname = new URL(url).hostname;

  return (
    <p
      className="mt-6 text-sm leading-relaxed text-muted"
      aria-live="polite"
      aria-atomic="true"
    >
      You will be redirected to {hostname} in {remainingSeconds} second
      {remainingSeconds === 1 ? "" : "s"}.
    </p>
  );
}
