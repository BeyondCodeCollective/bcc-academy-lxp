"use client";

import { useState } from "react";
import { withdrawPublicSurveyResponses } from "./actions";

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
      const result = await withdrawPublicSurveyResponses({ email });
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
        <p className="text-sm font-semibold text-neutral-900">Request received.</p>
        <p className="mt-2 text-sm text-neutral-600">
          If any survey responses were tied to that email, they have been
          deleted. Thanks for letting us know.
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {submitting ? "Removing…" : "Remove my response"}
      </button>
    </form>
  );
}
