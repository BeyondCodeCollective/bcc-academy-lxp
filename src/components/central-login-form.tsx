"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check } from "@phosphor-icons/react";

export function CentralLoginForm() {
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

    try {
      const checkRes = await fetch("/api/auth/account-exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const { exists } = (await checkRes.json()) as { exists: boolean };
      if (!exists) {
        setNoAccount(true);
        setLoading(false);
        return;
      }
    } catch {
      // If the check fails, fall through to OTP — the auth callback
      // has its own guard for unadmitted users.
    }

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
        <div>
          <h1 className="font-display text-3xl md:text-5xl text-white mb-3 md:mb-4 leading-[0.9] uppercase font-bold">
            Check your email.
          </h1>
          <p className="text-base md:text-lg text-white/70 leading-relaxed">
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
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl md:text-5xl text-white mb-3 md:mb-4 leading-[0.9] uppercase font-bold">
            No account found.
          </h1>
          <p className="text-base md:text-lg text-white/70 leading-relaxed">
            We don&rsquo;t have an account for that email. If you&rsquo;ve been
            invited to a program, use the link your instructor sent you.
          </p>
        </div>
        <a
          href="/#programs"
          className="inline-flex items-center gap-2 px-6 py-3 bg-electric-green text-true-black text-sm font-bold uppercase tracking-wider transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(229,247,1,0.3)]"
        >
          Explore our programs &rarr;
        </a>
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
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="font-display text-3xl md:text-5xl text-white mb-3 md:mb-4 leading-[0.9] uppercase font-bold">
          Sign in.
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
        {loading ? "Sending..." : "Let's Go →"}
      </button>

      <p className="text-white/40 text-xs uppercase tracking-wider">
          No password needed — we&rsquo;ll email you a link.
        </p>
      </form>
    </div>
  );
}
