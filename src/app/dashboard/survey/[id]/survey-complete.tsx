"use client";

import { useRouter } from "next/navigation";

export function SurveyComplete() {
  const router = useRouter();

  return (
    <div className="border border-rule bg-surface-elevated p-8 sm:p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-6">
        <span className="text-green-600 text-2xl">✓</span>
      </div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-3">
        Thank you.
      </h2>
      <p className="text-sm text-neutral-500 max-w-sm mx-auto mb-8">
        What you shared helps us shape the program around what you actually
        need. We appreciate you taking the time.
      </p>
      <button
        onClick={() => router.push("/dashboard")}
        className="inline-flex items-center gap-2 bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
