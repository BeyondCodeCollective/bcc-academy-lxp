"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check } from "@phosphor-icons/react";

const PROGRAMS = [
  { slug: "atg",      name: "After The Game", tagline: "Tech careers for athletes" },
  { slug: "forge",    name: "The Forge",       tagline: "Human-led learning hubs" },
  { slug: "catalyst", name: "Catalyst",        tagline: "Accelerate your career" },
];

export function CentralLoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isDemoMode =
    process.env.NODE_ENV === "development" &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isLocalDev = process.env.NODE_ENV === "development";

  function buildCallbackUrl(programSlug?: string) {
    const base = isLocalDev
      ? "http://localhost:3000/auth/callback"
      : `${window.location.origin}/auth/callback`;
    return programSlug ? `${base}?program=${programSlug}` : base;
  }

  async function sendOtp(programSlug?: string) {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: buildCallbackUrl(programSlug) },
    });
    if (otpError) {
      setError(otpError.message || "Something went wrong. Please try again.");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

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

    try {
      const res = await fetch("/api/auth/lookup-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = (await res.json()) as { programSlug: string | null };

      if (data.programSlug) {
        // Known user — send OTP with their program in the callback so the
        // callback can route them directly to the right subdomain.
        await sendOtp(data.programSlug);
      } else {
        // Unknown email — show program picker.
        setNotFound(true);
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl md:text-5xl text-white mb-3 md:mb-4 leading-[0.9] uppercase font-bold">
            Check your email.
          </h1>
          <p className="text-base md:text-lg text-white/70 leading-relaxed">
            We sent a sign-in link to <span className="text-white">{email}</span>.
          </p>
        </div>
        <button
          onClick={() => { setSent(false); setEmail(""); setNotFound(false); }}
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
          <h1 className="font-display text-3xl md:text-5xl text-white mb-3 md:mb-4 leading-[0.9] uppercase font-bold">
            New here?
          </h1>
          <p className="text-base md:text-lg text-white/70 leading-relaxed">
            Select a program to create your account.
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="grid grid-cols-1 gap-3">
          {PROGRAMS.map((p) => (
            <button
              key={p.slug}
              onClick={() => sendOtp(p.slug)}
              disabled={loading}
              className="flex flex-col gap-1 p-4 text-left border border-white/15 hover:border-electric-green/50 hover:bg-white/5 transition-all disabled:opacity-50"
            >
              <span className="text-xs text-white/40 font-mono uppercase tracking-wider">Program</span>
              <span className="text-sm font-bold text-white">{p.name}</span>
              <span className="text-xs text-white/40">{p.tagline}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => { setNotFound(false); setEmail(""); setError(""); }}
          className="text-sm text-white/40 hover:text-white transition-colors"
        >
          Try a different email
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="font-display text-3xl md:text-5xl text-white mb-3 md:mb-4 leading-[0.9] uppercase font-bold">
          Welcome back.
        </h1>
        <p className="text-base md:text-lg text-white/70 leading-relaxed">
          Enter your email and we&rsquo;ll send you a sign-in link.
        </p>
      </div>
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
    </div>
  );
}
