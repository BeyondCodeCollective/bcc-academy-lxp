"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Header CTA that reflects the session: "Sign in" for visitors, "Go to portal"
// once you're signed in — so the camp page never shows a stale "Sign in" link
// to someone who's already logged in.
export function CampHeaderCta() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setSignedIn(!!data.user))
      .catch(() => setSignedIn(false));
  }, []);

  return (
    <a
      href={signedIn ? "/dashboard" : "/login"}
      className="text-[11px] font-medium uppercase tracking-[0.15em] transition-opacity hover:opacity-60"
      style={{ color: "#1a1a1a44" }}
    >
      {signedIn ? "Go to portal →" : "Sign in →"}
    </a>
  );
}
