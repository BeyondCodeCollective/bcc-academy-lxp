"use client";

import { useState, useCallback, useMemo } from "react";
import { MODULE_1_ITEMS, MODULE_2_SCENARIOS, MODULE_3_ITEMS, TRANSITION_MESSAGES } from "@/lib/assessment/content";
import { scoreAssessment } from "@/lib/assessment/scoring";
import { ResultsProfile } from "@/app/dashboard/assessment/results/results-profile";
import type { RawResponses, ScoredOutput } from "@/lib/assessment/types";

type WizardStage = "m1a" | "m1b" | "m2" | "m3" | "transitioning" | "done";

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const TOTAL_QUESTIONS =
  MODULE_1_ITEMS.length + MODULE_2_SCENARIOS.length + MODULE_3_ITEMS.length;

const SECTION_META = {
  m1: {
    eyebrow: "Module 1 of 3",
    title: "How you tend to show up",
    description:
      "These questions help us understand your natural strengths — how you show up across different situations. Answer honestly; there are no right or wrong answers.",
  },
  m2: {
    eyebrow: "Module 2 of 3",
    title: "How you tend to work",
    description:
      "For each situation, pick the response that fits you best. Both options are valid — there's no right or wrong answer.",
  },
  m3: {
    eyebrow: "Module 3 of 3",
    title: "What drives you",
    description:
      "These questions are about what keeps you motivated and the kind of path that fits you right now.",
  },
} as const;

export function AssessmentPreviewWizard() {
  const [responses, setResponses] = useState<RawResponses>({});
  const [stage, setStage] = useState<WizardStage>("m1a");
  const [transitionMsg, setTransitionMsg] = useState("");
  const [result, setResult] = useState<ScoredOutput | null>(null);

  const setResponse = useCallback((id: string, value: number | string) => {
    setResponses(prev => ({ ...prev, [id]: value }));
  }, []);

  const m1Items = useMemo(() => shuffle(MODULE_1_ITEMS), []);
  const m2Items = useMemo(() => shuffle(MODULE_2_SCENARIOS), []);
  const m3Items = useMemo(() => shuffle(MODULE_3_ITEMS), []);

  const m1aItems = m1Items.slice(0, 14);
  const m1bItems = m1Items.slice(14);

  const isStageComplete = () => {
    if (stage === "m1a") return m1aItems.every(i => responses[i.id] != null);
    if (stage === "m1b") return m1bItems.every(i => responses[i.id] != null);
    if (stage === "m2") return m2Items.every(s => responses[s.id] != null);
    if (stage === "m3") return m3Items.every(i => responses[i.id] != null);
    return false;
  };

  const answeredCount = useMemo(() => {
    let n = 0;
    for (const i of MODULE_1_ITEMS) if (responses[i.id] != null) n++;
    for (const s of MODULE_2_SCENARIOS) if (responses[s.id] != null) n++;
    for (const i of MODULE_3_ITEMS) if (responses[i.id] != null) n++;
    return n;
  }, [responses]);
  const progressPct = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);

  const section =
    stage === "m1a" || stage === "m1b" ? SECTION_META.m1
    : stage === "m2" ? SECTION_META.m2
    : SECTION_META.m3;

  const numberOffset = stage === "m1b" ? m1aItems.length : 0;

  const advance = () => {
    if (stage === "m1a") {
      setTransitionMsg(TRANSITION_MESSAGES.afterM1A);
      setStage("transitioning");
      setTimeout(() => setStage("m1b"), 1800);
    } else if (stage === "m1b") {
      setTransitionMsg(TRANSITION_MESSAGES.afterM1B);
      setStage("transitioning");
      setTimeout(() => setStage("m2"), 1800);
    } else if (stage === "m2") {
      setTransitionMsg(TRANSITION_MESSAGES.afterM2);
      setStage("transitioning");
      setTimeout(() => setStage("m3"), 1800);
    } else if (stage === "m3") {
      setTransitionMsg(TRANSITION_MESSAGES.afterM3);
      setStage("transitioning");
      const scored = scoreAssessment(responses);
      setResult(scored);
      setTimeout(() => setStage("done"), 1800);
    }
  };

  if (stage === "done" && result) {
    return <ResultsProfile result={result} />;
  }

  if (stage === "transitioning") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-ink/60 text-sm font-medium">{transitionMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 space-y-8">
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Pathway Profile
          </p>
          <p className="text-xs font-medium text-ink/40">
            {answeredCount} of {TOTAL_QUESTIONS} · {progressPct}%
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">
          {section.eyebrow}
        </p>
        <h1 className="text-xl font-semibold text-ink">{section.title}</h1>
        <p className="text-sm text-ink/60 leading-relaxed">{section.description}</p>
      </div>

      <div className="space-y-8">
        {stage === "m1a" && m1aItems.map((item, idx) => (
          <LikertRow
            key={item.id}
            number={idx + 1}
            text={item.text}
            value={responses[item.id] as number | undefined}
            onChange={(v) => setResponse(item.id, v)}
          />
        ))}

        {stage === "m1b" && m1bItems.map((item, idx) => (
          <LikertRow
            key={item.id}
            number={numberOffset + idx + 1}
            text={item.text}
            value={responses[item.id] as number | undefined}
            onChange={(v) => setResponse(item.id, v)}
          />
        ))}

        {stage === "m2" && m2Items.map((scenario, idx) => (
          <ForcedChoiceRow
            key={scenario.id}
            number={idx + 1}
            scenario={scenario}
            value={responses[scenario.id] as string | undefined}
            onChange={(v) => setResponse(scenario.id, v)}
          />
        ))}

        {stage === "m3" && m3Items.map((item, idx) => (
          <LikertRow
            key={item.id}
            number={idx + 1}
            text={item.text}
            value={responses[item.id] as number | undefined}
            onChange={(v) => setResponse(item.id, v)}
          />
        ))}
      </div>

      <button
        onClick={advance}
        disabled={!isStageComplete()}
        className="w-full rounded-xl bg-accent text-white font-semibold py-3.5 text-sm transition-opacity disabled:opacity-40"
      >
        {stage === "m3" ? "See my results" : "Continue"}
      </button>
    </div>
  );
}

const LIKERT_OPTIONS = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Not sure" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];

function LikertRow({
  number, text, value, onChange,
}: {
  number: number;
  text: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink leading-snug">
        <span className="font-semibold text-ink/40 mr-1.5">{number}.</span>
        {text}
      </p>
      <div className="flex gap-2">
        {LIKERT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={`
              flex-1 rounded-lg border-2 py-2.5 text-xs font-medium transition-all
              ${value === opt.value
                ? "border-accent bg-accent/10 text-accent"
                : "border-ink/10 text-ink/50 hover:border-ink/30"
              }
            `}
          >
            {opt.value}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-ink/40 px-0.5">
        <span>Strongly disagree</span>
        <span>Strongly agree</span>
      </div>
    </div>
  );
}

function ForcedChoiceRow({
  number, scenario, value, onChange,
}: {
  number: number;
  scenario: typeof MODULE_2_SCENARIOS[number];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink leading-snug">
        <span className="font-semibold text-ink/40 mr-1.5">{number}.</span>
        {scenario.scenario}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(["A", "B"] as const).map((letter) => {
          const opt = letter === "A" ? scenario.optionA : scenario.optionB;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => onChange(letter)}
              className={`
                text-left rounded-xl border-2 px-4 py-4 text-sm leading-snug transition-all
                ${value === letter
                  ? "border-accent bg-accent/10 text-ink font-medium"
                  : "border-ink/10 bg-white hover:border-ink/30 text-ink/70"
                }
              `}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
