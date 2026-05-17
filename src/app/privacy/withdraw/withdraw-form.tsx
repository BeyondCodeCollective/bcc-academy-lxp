"use client";

import { useState } from "react";
import { requestWithdrawConfirmation } from "./actions";

export function WithdrawForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await requestWithdrawConfirmation({ email });
      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <p className="text-sm font-semibold text-neutral-900">Check your email.</p>
        <p className="mt-2 text-sm text-neutral-600">
          If any survey responses are tied to that address, we&apos;ve emailed
          a confirmation link. Click it within the next hour to complete the
          deletion. If nothing arrives, the address has no data on file.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="withdraw-email"
          className="block text-sm font-medium text-neutral-900"
        >
          Email address
        </label>
        <input
          id="withdraw-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
        />
      </div>

      <p
        role="alert"
        aria-live="assertive"
        className={`text-sm text-red-600 ${error ? "" : "sr-only"}`}
      >
        {error}
      </p>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Email me a confirmation link"}
      </button>
    </form>
  );
}
