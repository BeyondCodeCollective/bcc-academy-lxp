"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isDev = process.env.NODE_ENV === "development";

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isDev) {
      // Set demo cookie and go to dashboard
      await fetch("/api/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await new Promise((r) => setTimeout(r, 400));
      window.location.href = "/dashboard";
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message || "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#fafafa] px-5 py-8">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #e5e5e5 1px, transparent 1px), linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm animate-[fadeIn_0.4s_ease-out]">
        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {/* Logo banner */}
          <div className="bg-neutral-900 px-6 py-7 flex flex-col items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/atg-logo.svg"
              alt="After The Game"
              className="h-5"
            />
            <div className="h-px w-10 bg-white/20" />
            <p className="text-[11px] font-medium tracking-[0.2em] text-[#E4F800] uppercase">
              From Sports to Tech
            </p>
          </div>

          {/* Form area */}
          <div className="px-6 py-8 sm:px-8">
            {sent ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200">
                  <svg
                    className="h-5 w-5 text-neutral-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    Check your email
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    We sent a link to{" "}
                    <span className="font-medium text-neutral-900">
                      {email}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                  className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-center text-xl font-semibold text-neutral-900">
                  Welcome back
                </h1>
                <p className="mt-1 text-center text-sm text-neutral-400">
                  Sign in to your student portal
                </p>

                <form onSubmit={handleSignIn} className="mt-6 space-y-3">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-xs font-medium text-neutral-500"
                    >
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:outline-none transition-all"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-neutral-800 active:bg-neutral-950 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="h-3.5 w-3.5 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      "Continue"
                    )}
                  </button>

                  <p className="text-center text-xs text-neutral-400">
                    We&apos;ll email you a magic link to sign in
                  </p>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-300">
          &copy; {new Date().getFullYear()} Beyond Code Collective
        </p>
      </div>
    </div>
  );
}
