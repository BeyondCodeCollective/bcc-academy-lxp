"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CONFIDENCE_OPTIONS, EXIT_COPY } from "@/lib/assessment/entry-flow";
import { saveExitConfidence } from "../entry-actions";
import { Question } from "../entry-flow";

export function ExitConfidence() {
  const router = useRouter();
  const [training, setTraining] = useState<number>();
  const [job, setJob] = useState<number>();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await saveExitConfidence({ confidenceTraining: training!, confidenceJob: job! });
        router.push("/dashboard");
      } catch {
        setError("We could not save your answers. Please try again.");
      }
    });
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-10 space-y-8">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-ink">One last check-in</h1>
        <p className="text-sm text-ink/60 leading-relaxed">{EXIT_COPY.intro}</p>
      </div>
      <Question
        prompt={EXIT_COPY.confidenceTraining}
        options={CONFIDENCE_OPTIONS}
        value={training}
        onChange={setTraining}
      />
      <Question
        prompt={EXIT_COPY.confidenceJob}
        options={CONFIDENCE_OPTIONS}
        value={job}
        onChange={setJob}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={!training || !job || pending}
        className="w-full rounded-lg bg-accent text-white font-semibold py-3.5 text-sm transition-opacity disabled:opacity-40"
      >
        Done
      </button>
    </div>
  );
}
