"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check } from "@phosphor-icons/react";

const PROGRAM_DOMAINS: Record<string, string> = {
  atg: "atg.bccacademy.io",
  forge: "forge.bccacademy.io",
  catalyst: "catalyst.bccacademy.io",
};

export function CentralLoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  // Demo shortcut only when there's genuinely no Supabase backend wired up.
  // When NEXT_PUBLIC_SUPABASE_URL is set (even in dev), run real OTP so
  // middleware's getUser() check finds an actual session.
  const isDemoMode =
    process.env.NODE_ENV === "development" &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isLocalDev = process.env.NODE_ENV === "development";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotFound(false);

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

    let programSlug: string | null = null;
    try {
      const res = await fetch("/api/auth/lookup-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = (await res.json()) as { programSlug: string | null };
      programSlug = data.programSlug;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    if (!programSlug || !PROGRAM_DOMAINS[programSlug]) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Use the current origin for the callback so the PKCE code_verifier cookie
    // (set on this domain) is readable when the callback route runs. Pointing
    // to a different domain (e.g. atg.bccacademy.io when testing on a Vercel
    // preview URL) causes exchangeCodeForSession to fail silently.
    const callbackUrl = isLocalDev
      ? `http://localhost:3000/auth/callback`
      : `${window.location.origin}/auth/callback`;
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
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
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-electric-green text-true-black">
            <Check size={20} weight="bold" />
          </div>
          <div>
            <p className="text-base font-bold text-white">Check your email</p>
            <p className="text-sm text-white/50">
              Sign-in link sent to <span className="text-white/80">{email}</span>
            </p>
          </div>
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

  if (notFound) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-base font-bold text-white">No account found</p>
          <p className="mt-1 text-sm text-white/50">
            We don&rsquo;t recognize <span className="text-white/80">{email}</span>. Ready to apply?
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://atg.bccacademy.io"
            className="flex flex-col gap-1 p-4 border border-white/15 hover:border-electric-green/50 hover:bg-white/5 transition-all"
          >
            <span className="text-xs text-white/40 font-mono uppercase tracking-wider">Program</span>
            <span className="text-sm font-bold text-white">After The Game</span>
            <span className="text-xs text-white/40">Tech careers for athletes</span>
          </a>
          <a
            href="https://forge.bccacademy.io"
            className="flex flex-col gap-1 p-4 border border-white/15 hover:border-electric-green/50 hover:bg-white/5 transition-all"
          >
            <span className="text-xs text-white/40 font-mono uppercase tracking-wider">Program</span>
            <span className="text-sm font-bold text-white">The Forge</span>
            <span className="text-xs text-white/40">Human-led learning hubs</span>
          </a>
        </div>
        <button
          onClick={() => { setNotFound(false); setEmail(""); }}
          className="text-sm text-white/40 hover:text-white transition-colors"
        >
          Try a different email
        </button>
      </div>
    );
  }

  return (
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
          className="w-full bg-white text-black placeholder-gray-400 px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-electric-green border-0"
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
        className={`w-full py-4 text-lg font-bold transition-all uppercase tracking-wider ${
          isValid
            ? "bg-electric-green text-true-black hover:brightness-110"
            : "bg-white/10 text-white/30 cursor-not-allowed"
        }`}
      >
        {loading ? "Checking..." : "Let's Go →"}
      </button>

      <p className="text-white/40 text-xs uppercase tracking-wider">
        No password needed — we&rsquo;ll email you a link.
      </p>
    </form>
  );
}
