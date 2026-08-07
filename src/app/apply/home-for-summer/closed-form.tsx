"use client";

import { useState } from "react";
import { saveInterestSignup } from "./actions";

/**
 * Applications-closed state for Home for the Summer. The cohort is full, but
 * the page keeps working for us: email + ZIP joins the newsletter so future
 * runs of this and similar programs start with a warm list.
 */
export function ClosedForm() {
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const r = await saveInterestSignup({ email, zip });
      if (r.ok) setDone(true);
      else setError(r.error);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400 mb-2">
          Beyond Code Collective · NextEra Energy
        </p>
        <h1 className="text-3xl font-bold text-neutral-900 mb-3">
          Home for the Summer
        </h1>
        <p className="text-sm text-neutral-500">
          Applications for this cohort are now closed.
        </p>
      </div>

      <div className="border border-rule bg-surface-elevated p-8 sm:p-10">
        {done ? (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-6">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">
              You&apos;re on the list.
            </h2>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto">
              We&apos;ll let you know when applications open for future programs.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">
              Hear about the next one first
            </h2>
            <p className="text-sm text-neutral-500 mb-6">
              We run this and similar programs throughout the year. Leave your
              email and ZIP code and we&apos;ll notify you when the next
              application window opens.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full border border-rule bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500 mb-1.5">
                  ZIP code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="30303"
                  required
                  className="w-full border border-rule bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-neutral-900"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={pending}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold px-6 py-3.5 transition-colors disabled:opacity-60"
              >
                {pending ? "Signing up…" : "Notify me"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
