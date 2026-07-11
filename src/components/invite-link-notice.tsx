"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Shown on /login when an invite link couldn't be redeemed
// (/invite/<token> redirects here with ?error=invite — dead token, or the
// magic link was consumed by an email scanner before the student's browser
// verified it). Families arriving from one-click emails have no password, so
// without this banner the bare login form is a dead end. Reads the query
// param client-side to keep the login page fully static.

function Notice() {
  const params = useSearchParams();
  if (params.get("error") !== "invite") return null;
  return (
    <div className="mb-6 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
      <p className="font-semibold mb-1">That sign-in link didn&apos;t work.</p>
      <p>
        {/* Explicit {" "} — the compiler dropped the plain space after the
           inline element in this multi-line text node, rendering
           "newestemail" in prod. */}
        No worries — open the <strong>newest</strong>{" "}
        email from us and tap the button again. It creates a fresh link every
        time. Still stuck? Enter your email below and we&apos;ll send you a
        new sign-in link.
      </p>
    </div>
  );
}

export function InviteLinkNotice() {
  // useSearchParams requires a Suspense boundary on statically rendered pages.
  return (
    <Suspense fallback={null}>
      <Notice />
    </Suspense>
  );
}
