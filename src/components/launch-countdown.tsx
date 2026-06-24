"use client";

import { useEffect, useState } from "react";

// Live countdown to a launch date, shown on the pre-start holding page. Server
// gates the actual content; this is just the ticking display. When it reaches
// zero it self-refreshes so the now-unlocked curriculum appears without a reload.

function parts(msLeft: number) {
  const clamp = Math.max(0, msLeft);
  return {
    days: Math.floor(clamp / 86_400_000),
    hours: Math.floor((clamp % 86_400_000) / 3_600_000),
    minutes: Math.floor((clamp % 3_600_000) / 60_000),
    seconds: Math.floor((clamp % 60_000) / 1000),
  };
}

export function LaunchCountdown({
  targetIso,
  accent = "#1D59FF",
}: {
  targetIso: string;
  /** Brand accent for the unit cards (defaults to BCC cobalt). */
  accent?: string;
}) {
  const target = new Date(targetIso).getTime();
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const left = target - Date.now();
      setMsLeft(left);
      if (left <= 0) window.location.reload();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  // Render a sized placeholder until the client clock is known (no hydration flash).
  if (msLeft === null) {
    return <div className="h-[104px]" aria-hidden />;
  }

  const t = parts(msLeft);
  const units: Array<[string, number]> = [
    ["Days", t.days],
    ["Hours", t.hours],
    ["Minutes", t.minutes],
    ["Seconds", t.seconds],
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-label="Time until launch">
      {units.map(([label, value]) => (
        <div
          key={label}
          className="relative overflow-hidden rounded-xl border border-rule bg-surface-soft px-1 py-3 sm:py-5 text-center"
        >
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ background: accent }}
          />
          <span className="tabular-nums block text-3xl font-bold leading-none tracking-tight text-ink sm:text-5xl">
            {String(value).padStart(2, "0")}
          </span>
          <span className="mt-1.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-faint sm:text-[11px]">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
