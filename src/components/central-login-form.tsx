"use client";

import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { sendLoginLink } from "@/app/login/actions";

export function CentralLoginForm({
  programs = [],
  compact = false,
}: {
  /**
   * Programs to surface on the "No account found" CTA list. `defaultTrack`
   * is the slug to append as `?track=<slug>` for invite-only programs
   * (Forte's `/join/forte` shows a dead-end "invite required" message
   * without it). For programs that accept bare `/join/<slug>`, leave it null.
   */
  programs?: { slug: string; name: string; defaultTrack: string | null }[];
  /**
   * Compact rendering for embedding inline (e.g. the homepage "I'm a student"
   * card): no oversized heading, card-sized dark inputs, no autofocus. The full
   * /login page leaves this false and renders unchanged.
   */
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [noAccount, setNoAccount] = useState(false);
  const [error, setError] = useState("");

  const notEnrolled =
    noAccount ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("status") === "not-enrolled");

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isDemoMode =
    process.env.NODE_ENV === "development" &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isLocalDev = process.env.NODE_ENV === "development";

  const headingCls = compact
    ? "font-display text-lg font-bold text-white uppercase mb-1"
    : "font-display text-3xl md:text-5xl text-white mb-3 md:mb-4 leading-[0.9] uppercase font-bold";
  const subCls = compact
    ? "text-sm text-neutral-300"
    : "text-base md:text-lg text-white/70 leading-relaxed";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const trimmedEmail = email.trim().toLowerCase();

    if (isDemoMode) {
      await fetch("/api/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      window.location.href = "/dashboard";
      return;
    }

    // Single server-action round-trip handles the entire flow:
    //   - branded Resend send when configured, or
    //   - server-side Supabase OTP fallback.
    // Previously the client did three RTTs (account-exists → action →
    // direct supabase.signInWithOtp), which stalled iCloud/Bahamas
    // users on "Sending…" for 5–10s. Now: one short hop to Vercel,
    // server-to-server to Supabase, done.
    const origin = isLocalDev
      ? "http://localhost:3000"
      : window.location.origin;
    const next = new URLSearchParams(window.location.search).get("next") ?? undefined;
    const result = await sendLoginLink({ email: trimmedEmail, origin, next });

    if (result.ok) {
      setSent(true);
      setLoading(false);
      return;
    }

    setError(result.error);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className={compact ? "space-y-3" : "space-y-6"}>
        <div>
          <h1 className={headingCls}>Check your email.</h1>
          <p className={subCls}>
            We sent a sign-in link to <span className="text-white">{email}</span>.
          </p>
        </div>
        <button
          onClick={() => { setSent(false); setEmail(""); }}
          className="text-sm text-white/40 hover:text-white transition-colors"
        >
          Use a different email
        </button>
      </div>
    );
  }

  if (notEnrolled) {
    return (
      <div className={compact ? "space-y-4" : "space-y-6"}>
        <div>
          <h1 className={headingCls}>No account found.</h1>
          <p className={subCls}>
            If you have an invite link from your instructor, use that to sign up.
          </p>
        </div>

        {programs.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
              Or join a program
            </p>
            <div className="space-y-2">
              {programs.map((p) => (
                <a
                  key={p.slug}
                  href={p.defaultTrack ? `/join/${p.slug}?track=${p.defaultTrack}` : `/join/${p.slug}`}
                  className="flex w-full items-center justify-between rounded bg-white/5 px-4 py-3 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-white/40">&rarr;</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div>
          <button
            onClick={() => {
              setNoAccount(false);
              setEmail("");
              window.history.replaceState(null, "", "/login");
            }}
            className="text-sm text-white/40 hover:text-white transition-colors"
          >
            Try a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-6 md:space-y-8"}>
      {!compact && (
        <div>
          <h1 className={headingCls}>Sign in.</h1>
          <p className={subCls}>
            Enter your email and we&rsquo;ll send you a sign-in link.
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className={compact ? "space-y-3" : "space-y-4 md:space-y-5"}>
      <div className="relative">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          aria-label="Email address"
          required
          autoComplete="email"
          autoFocus={!compact}
          className={
            compact
              ? "w-full border border-electric-green/70 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-electric-green focus:outline-none"
              : "w-full bg-white text-black placeholder-gray-400 px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-electric-green border-0"
          }
        />
        {isValid && (
          <div className={`absolute right-4 top-1/2 -translate-y-1/2 ${compact ? "text-electric-green" : "text-black"}`}>
            <Check size={compact ? 18 : 24} weight="bold" />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !isValid}
        className={`w-full font-bold transition-all uppercase tracking-wider ${
          compact ? "py-3 text-sm" : "py-4 text-lg"
        } ${
          isValid
            ? "bg-electric-green text-true-black hover:brightness-110"
            : "bg-white/10 text-white/30 cursor-not-allowed"
        }`}
      >
        {loading ? "Sending..." : compact ? "Sign in" : "Let's Go →"}
      </button>

      <p className={`text-white/40 uppercase tracking-wider ${compact ? "text-[11px]" : "text-xs"}`}>
          No password needed — we&rsquo;ll email you a link.
        </p>
      </form>
    </div>
  );
}
