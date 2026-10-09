"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Keeps the event registration form out of sight until the visitor asks for
 * it. The landing page leads with the event itself (art, headline, details);
 * this renders a single Register button in the signup slot and swaps in the
 * form when it is pressed, or when any `#signup` link on the page (the hero
 * button, the phone's sticky bar, an old shared link) sends the visitor here.
 */
export function EventSignupReveal({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#signup") setOpen(true);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  // The browser's own jump to #signup happens while the slot is still a
  // single button at the end of a short page, so it lands near the bottom of
  // the screen with the form unfolding below the fold. Once the form is in,
  // line the slot up with the top of the viewport.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      document.getElementById("signup")?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (open) return <>{children}</>;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex h-12 w-full items-center justify-center rounded-full px-7 text-[15px] font-semibold text-white md:w-auto"
      style={{ background: accent }}
    >
      {label}
    </button>
  );
}
