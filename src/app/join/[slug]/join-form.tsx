"use client";

import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
// TODO: swap back to sendJoinLink (Resend) once mail.bccacademy.io is verified in Resend (Tuesday)

export function JoinForm({
  programSlug,
  trackSlug,
  trackName,
}: {
  programSlug: string;
  trackSlug: string | null;
  trackName?: string;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Persist join intent in cookies so the auth callback can recover it
    // if Supabase strips query params from the magic-link redirect URL
    // (happens when the exact callback URL — params and all — isn't in
    // Supabase's Redirect URL allowlist). Short TTL — these are only needed
    // to bridge the email round-trip.
    const tenMinutes = 60 * 10;
    document.cookie = `pending-join-slug=${encodeURIComponent(programSlug)}; path=/; max-age=${tenMinutes}; samesite=lax`;
    if (trackSlug) {
      document.cookie = `pending-join-track=${encodeURIComponent(trackSlug)}; path=/; max-age=${tenMinutes}; samesite=lax`;
    }

    const callbackParams = new URLSearchParams({ join: programSlug });
    if (trackSlug) callbackParams.set("track", trackSlug);
    const callbackUrl = `${window.location.origin}/auth/callback?${callbackParams}`;

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: callbackUrl },
    });

    if (otpError) {
      setError(otpError.message || "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="mb-3 text-3xl font-bold uppercase leading-[0.9] text-white font-display md:text-5xl">
            Check your email.
          </h2>
          <p className="text-base text-white/70 md:text-lg">
            We sent a sign-in link to{" "}
            <span className="text-white">{email}</span>.
          </p>
        </div>
        <button
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
          className="text-sm text-white/40 transition-colors hover:text-white"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
        <div className="relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoComplete="email"
            autoFocus
            className="w-full border-0 bg-white px-5 py-4 text-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E5F701]"
          />
          {isValid && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-black">
              <Check size={24} weight="bold" />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || !isValid}
          className={`w-full py-4 text-lg font-bold uppercase tracking-wider transition-all ${
            isValid
              ? "bg-[#E5F701] text-[#1a1a1a] hover:brightness-110"
              : "cursor-not-allowed bg-white/10 text-white/30"
          }`}
        >
          {loading ? "Sending..." : trackName ? `Join ${trackName} →` : "Join →"}
        </button>

        <p className="text-xs uppercase tracking-wider text-white/40">
          No password needed — we&rsquo;ll email you a link.
        </p>
      </form>

      <Link
        href="/login"
        className="inline-block text-sm text-white/40 transition-colors hover:text-white"
      >
        Already have an account? Sign in
      </Link>
    </div>
  );
}
