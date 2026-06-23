"use client";

import { useEffect, useState } from "react";

// Live countdown to a launch date, shown on the pre-start holding page. Server
// gates the actual content; this is just the ticking display. When it reaches
// zero it self-refreshes so the now-unlocked curriculum appears without the
// student having to reload.

function parts(msLeft: number) {
  const clamp = Math.max(0, msLeft);
  return {
    days: Math.floor(clamp / 86_400_000),
    hours: Math.floor((clamp % 86_400_000) / 3_600_000),
    minutes: Math.floor((clamp % 3_600_000) / 60_000),
    seconds: Math.floor((clamp % 60_000) / 1000),
  };
}

export function LaunchCountdown({ targetIso }: { targetIso: string }) {
  const target = new Date(targetIso).getTime();
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const left = target - Date.now();
      setMsLeft(left);
      // Reached zero: pull the unlocked content in.
      if (left <= 0) window.location.reload();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  // Render nothing until the client clock is known (avoids hydration mismatch).
  if (msLeft === null) {
    return <div className="h-[72px]" aria-hidden />;
  }

  const t = parts(msLeft);
  const units: Array<[string, number]> = [
    ["days", t.days],
    ["hours", t.hours],
    ["mins", t.minutes],
    ["secs", t.seconds],
  ];

  return (
    <div className="flex gap-3 sm:gap-4" role="timer" aria-label="Time until launch">
      {units.map(([label, value]) => (
        <div key={label} className="flex flex-col items-center">
          <span className="tabular-nums text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {String(value).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
