"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

export function SurveyComplete() {
  const router = useRouter();

  return (
    <div className="panel p-8 sm:p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-6">
        <Check size={28} className="text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-ink mb-3">
        Thank you.
      </h2>
      <p className="text-sm text-ink-soft max-w-sm mx-auto mb-8">
        What you shared helps us shape the program around what you actually
        need. We appreciate you taking the time.
      </p>
      <button
        onClick={() => router.push("/dashboard")}
        className="inline-flex items-center gap-2 bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-ink/90 transition-colors"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
