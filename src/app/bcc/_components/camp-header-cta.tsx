"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Header CTA that only appears for signed-in learners ("Go to portal"). New
// visitors on an application/marketing page have no account yet, so a "Sign in"
// link there just reads as confusing — we render nothing for them.
export function CampHeaderCta({ ink = "#1a1a1a" }: { ink?: string } = {}) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setSignedIn(!!data.user))
      .catch(() => setSignedIn(false));
  }, []);

  if (!signedIn) return null;

  return (
    <a
      href="/dashboard"
      className="text-[11px] font-medium uppercase tracking-[0.15em] transition-opacity hover:opacity-60"
      style={{ color: `${ink}a6` }}
    >
      Go to portal →
    </a>
  );
}
