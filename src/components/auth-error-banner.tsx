"use client";

import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";

type ErrorInfo = { title: string; message: string };

// Supabase returns auth errors in the URL fragment (e.g.
// #error=access_denied&error_code=otp_expired). Fragments aren't sent to the
// server, so our /auth/callback handler can't act on them — it falls through
// to /?error=auth and the browser preserves the fragment. We read both here
// and surface a friendlier message than "Sign-in failed — try again".
function parseAuthError(): ErrorInfo | null {
  if (typeof window === "undefined") return null;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);

  const errorCode = hashParams.get("error_code");
  const fragmentError = hashParams.get("error");
  const queryError = queryParams.get("error");

  if (errorCode === "otp_expired") {
    return {
      title: "This sign-in link expired",
      message:
        "Magic links are single-use and time-limited. Some email scanners also consume the link before you click. Request a new link below and open it in the same browser.",
    };
  }

  if (fragmentError === "access_denied") {
    return {
      title: "Sign-in didn't go through",
      message:
        "The sign-in link couldn't be verified. Request a fresh link and click it from the same browser you requested it in.",
    };
  }

  // ?error=invite is handled by the dedicated <InviteLinkNotice> on the login
  // page (friendlier, family-facing copy). Skip it here so the two banners
  // don't both fire — and so this effect doesn't strip ?error before that
  // component reads it.

  if (queryError === "auth") {
    return {
      title: "Sign-in failed",
      message: "Please request a new sign-in link and try again.",
    };
  }

  return null;
}

export function AuthErrorBanner() {
  const [info, setInfo] = useState<ErrorInfo | null>(null);

  useEffect(() => {
    const parsed = parseAuthError();
    if (!parsed) return;
    setInfo(parsed);
    // Strip the error from the URL so a refresh doesn't re-trigger the banner
    // and a screenshot doesn't expose the error fragment.
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    url.searchParams.delete("status");
    url.hash = "";
    window.history.replaceState(null, "", url.toString());
  }, []);

  if (!info) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed inset-x-3 top-3 z-[100] sm:inset-x-auto sm:left-1/2 sm:top-4 sm:w-full sm:max-w-md sm:-translate-x-1/2"
    >
      <div className="border border-[#1D59FF]/30 bg-[#1a1a1a] px-4 py-3 shadow-2xl sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#1D59FF]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{info.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/70">
              {info.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInfo(null)}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
