"use client";

import { useEffect, useState } from "react";

/**
 * Phone-only call to action pinned to the bottom of the screen. The landing
 * page puts the pitch before the form on narrow screens, so this keeps the
 * form one tap away from anywhere on the page. It slides out of the way while
 * the form itself is on screen so it never sits on top of the real submit
 * button. Hidden from md up, where the form is back under the headline.
 */
export function MobileRegisterBar({
  label,
  href = "#signup",
  accent,
  ink,
  bg,
}: {
  label: string;
  /** Defaults to the in-page form; an external apply link goes straight there. */
  href?: string;
  accent: string;
  ink: string;
  bg: string;
}) {
  const [formOnScreen, setFormOnScreen] = useState(false);

  useEffect(() => {
    if (href !== "#signup") return;
    const target = document.getElementById("signup");
    if (!target) return;
    const io = new IntersectionObserver(
      ([entry]) => setFormOnScreen(entry.isIntersecting),
      // Ignore the strip the bar itself covers, so "on screen" means visible
      // above the bar, not hidden behind it.
      { rootMargin: "0px 0px -76px 0px" },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [href]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out md:hidden ${
        formOnScreen ? "translate-y-full" : "translate-y-0"
      }`}
      style={{ background: bg, borderTop: `1px solid ${ink}14` }}
      aria-hidden={formOnScreen}
    >
      <a
        href={href}
        tabIndex={formOnScreen ? -1 : undefined}
        className="flex h-12 items-center justify-center rounded-full text-[15px] font-semibold text-white"
        style={{ background: accent }}
      >
        {label}
      </a>
    </div>
  );
}
