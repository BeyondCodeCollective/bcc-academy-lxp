"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CAREER_STAGE_OPTIONS,
  CONFIDENCE_OPTIONS,
  DIGITAL_COMFORT_OPTIONS,
  ENTRY_COPY,
  TECH_EXPOSURE_OPTIONS,
  type EntryFlowAnswers,
} from "@/lib/assessment/entry-flow";
import { saveEntryFlow } from "./entry-actions";

type Step = "welcome" | "career" | "tech" | "confidence";

const STEPS: Step[] = ["welcome", "career", "tech", "confidence"];

export function EntryFlow({ programSlug }: { programSlug: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [careerStage, setCareerStage] = useState<string>();
  const [digitalComfort, setDigitalComfort] = useState<string>();
  const [techExposure, setTechExposure] = useState<string>();
  const [training, setTraining] = useState<number>();
  const [job, setJob] = useState<number>();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canContinue =
    step === "welcome" ||
    (step === "career" && !!careerStage) ||
    (step === "tech" && !!digitalComfort && !!techExposure) ||
    (step === "confidence" && !!training && !!job);

  function advance() {
    setError(null);
    if (step !== "confidence") {
      setStep(STEPS[STEPS.indexOf(step) + 1]);
      return;
    }
    const answers: EntryFlowAnswers = {
      careerStage: careerStage!,
      digitalComfort: digitalComfort!,
      techExposure: techExposure!,
      confidenceTraining: training!,
      confidenceJob: job!,
    };
    startTransition(async () => {
      try {
        await saveEntryFlow(answers, programSlug);
        router.refresh();
      } catch {
        setError("We could not save your answers. Please try again.");
      }
    });
  }

  const captureIndex = STEPS.indexOf(step); // welcome = 0, then 1 to 3

  return (
    <div className="max-w-xl mx-auto px-5 py-10 space-y-8">
      {step !== "welcome" && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
            Step {captureIndex} of 3
          </p>
          <div className="h-1 rounded-full bg-ink/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${(captureIndex / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {step === "welcome" && (
        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-ink">Before we start</h1>
          <p className="text-sm text-ink/60 leading-relaxed">{ENTRY_COPY.welcome}</p>
        </div>
      )}

      {step === "career" && (
        <Question
          prompt={ENTRY_COPY.careerStage.prompt}
          helper={ENTRY_COPY.careerStage.helper}
          options={CAREER_STAGE_OPTIONS}
          value={careerStage}
          onChange={setCareerStage}
        />
      )}

      {step === "tech" && (
        <div className="space-y-8">
          <Question
            prompt={ENTRY_COPY.digitalComfort.prompt}
            options={DIGITAL_COMFORT_OPTIONS}
            value={digitalComfort}
            onChange={setDigitalComfort}
          />
          <Question
            prompt={ENTRY_COPY.techExposure.prompt}
            options={TECH_EXPOSURE_OPTIONS}
            value={techExposure}
            onChange={setTechExposure}
          />
          <p className="text-sm text-ink/60">{ENTRY_COPY.techHelper}</p>
        </div>
      )}

      {step === "confidence" && (
        <div className="space-y-8">
          <Question
            prompt={ENTRY_COPY.confidenceTraining}
            options={CONFIDENCE_OPTIONS}
            value={training}
            onChange={setTraining}
          />
          <Question
            prompt={ENTRY_COPY.confidenceJob}
            options={CONFIDENCE_OPTIONS}
            value={job}
            onChange={setJob}
          />
          <p className="text-sm text-ink/60">{ENTRY_COPY.confidenceHelper}</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={advance}
        disabled={!canContinue || pending}
        className="w-full rounded-lg bg-accent text-white font-semibold py-3.5 text-sm transition-opacity disabled:opacity-40"
      >
        {step === "welcome" ? "Get started" : step === "confidence" ? "Start my assessment" : "Continue"}
      </button>
    </div>
  );
}

function Question<V extends string | number>({
  prompt, helper, options, value, onChange,
}: {
  prompt: string;
  helper?: string;
  options: readonly { value: V; label: string }[];
  value: V | undefined;
  onChange: (v: V) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-ink leading-snug">{prompt}</legend>
      {helper && <p className="text-xs text-ink/50">{helper}</p>}
      <div role="radiogroup" aria-label={prompt} className="grid gap-2.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              text-left rounded-lg border-2 px-4 py-3.5 text-sm leading-snug transition-all
              ${value === opt.value
                ? "border-accent bg-accent/10 text-ink font-medium"
                : "border-ink/10 bg-white hover:border-ink/30 text-ink/70"
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
