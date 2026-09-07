"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startExamAttempt, submitExamAttempt, type ExamResult } from "./actions";
import { buttonClass } from "@/components/ui";

type ClientExam = {
  id: string;
  title: string;
  description: string;
  minutes: number;
  questions: { n: number; domain: string; prompt: string; options: string[] }[];
};

const LETTERS = ["A", "B", "C", "D", "E"];

export function ExamRunner({
  exam,
  history,
}: {
  exam: ClientExam;
  history: { when: string; score: number; total: number }[];
}) {
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState<number>(exam.minutes * 60);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExamResult | null>(null);
  // Submission must fire exactly once, whether from the button or the timer.
  const submitted = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  async function begin() {
    setPending(true);
    setError("");
    try {
      const res = await startExamAttempt(exam.id);
      if (!res.ok) {
        setError(res.error);
      } else {
        setAttemptId(res.attemptId);
        setDeadline(new Date(res.deadline).getTime());
        setPhase("running");
      }
    } catch {
      setError("Could not start the exam. Please try again.");
    }
    setPending(false);
  }

  async function submit(auto = false) {
    if (submitted.current) return;
    submitted.current = true;
    setPending(true);
    setError("");
    try {
      const res = await submitExamAttempt({
        examId: exam.id,
        attemptId: attemptId!,
        answers: answersRef.current,
      });
      if (res.ok) {
        setResult(res.result);
        setPhase("done");
      } else {
        setError(res.error);
        if (!auto) submitted.current = false;
      }
    } catch {
      setError("Something went wrong submitting. Your answers are still on screen — try again.");
      submitted.current = false;
    }
    setPending(false);
  }

  // Hard timer: tick every second, auto-submit at zero.
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        void submit(true);
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, deadline]);

  const answeredCount = Object.keys(answers).length;
  const clock = useMemo(() => {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, [remaining]);

  if (phase === "done" && result) {
    return (
      <div className="space-y-5">
        <div className="panel p-6 text-center">
          <p className="text-micro font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Your score
          </p>
          <p className="mt-2 text-5xl font-bold tabular-nums text-ink">{result.percent}%</p>
          <p className="mt-1 text-sm text-ink-soft">
            {result.score} of {result.total} correct
          </p>
        </div>
        <div className="panel p-5">
          <p className="mb-3 text-sm font-semibold text-ink">By domain</p>
          <div className="space-y-3">
            {result.domainScores.map((d) => (
              <div key={d.domain}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm text-ink">{d.domain}</p>
                  <p className="text-xs tabular-nums text-ink-faint">
                    {d.correct}/{d.total}
                  </p>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((d.correct / d.total) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {result.missed.length > 0 && (
          <div className="panel p-5">
            <p className="text-sm font-semibold text-ink">
              Questions to review ({result.missed.length})
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              What you missed and what you answered — study these areas, then retake.
              Correct answers aren&rsquo;t shown, so a retake stays a real test.
            </p>
            <div className="mt-4 space-y-5">
              {Array.from(
                result.missed.reduce((m, q) => {
                  m.set(q.domain, [...(m.get(q.domain) ?? []), q]);
                  return m;
                }, new Map<string, typeof result.missed>()),
              ).map(([domain, qs]) => (
                <div key={domain}>
                  <p className="text-micro font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    {domain} · {qs.length} missed
                  </p>
                  <ul className="mt-2 space-y-3">
                    {qs.map((q) => (
                      <li key={q.n} className="border-l-2 border-rule pl-3">
                        <p className="text-sm text-ink">
                          <span className="tabular-nums text-ink-faint">Q{q.n}.</span> {q.prompt}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-soft">
                          {q.answered ? <>You answered: {q.answered}</> : "Left blank"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-sm text-ink-soft">
          Your instructor can see this score. You can retake the exam any time — a fresh
          attempt starts a new 90-minute clock.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`${buttonClass("secondary", "md")} w-full`}
        >
          Back to exam page
        </button>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="space-y-5">
        <div className="panel p-5">
          <p className="text-sm leading-relaxed text-ink-soft">{exam.description}</p>
          <ul className="mt-3 space-y-1 text-sm text-ink-soft">
            <li>· The 90-minute timer starts when you click Start and does not pause.</li>
            <li>· When time runs out, whatever you have answered submits automatically.</li>
            <li>· You will get your score and a domain breakdown right away.</li>
            <li>· You can retake the exam as many times as you like.</li>
          </ul>
        </div>
        {history.length > 0 && (
          <div className="panel p-5">
            <p className="mb-2 text-sm font-semibold text-ink">Your previous attempts</p>
            <ul className="space-y-1">
              {history.slice(0, 5).map((h, i) => (
                <li key={i} className="flex justify-between text-sm text-ink-soft">
                  <span>{new Date(h.when).toLocaleDateString()}</span>
                  <span className="tabular-nums">
                    {Math.round((h.score / h.total) * 1000) / 10}% ({h.score}/{h.total})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={begin}
          className={`${buttonClass("primary", "md")} w-full`}
        >
          {pending ? "Starting…" : "Start the exam"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky clock + progress. Turns amber under 10 minutes. */}
      <div className="sticky top-2 z-20 flex items-center justify-between rounded-lg border border-rule bg-surface-elevated px-4 py-2.5 shadow-sm">
        <p className="text-sm text-ink-soft">
          {answeredCount}/{exam.questions.length} answered
        </p>
        <p
          className={`font-mono text-lg font-semibold tabular-nums ${
            remaining < 600 ? "text-amber-600" : "text-ink"
          }`}
          aria-live="polite"
        >
          {clock}
        </p>
      </div>

      {exam.questions.map((q) => (
        <fieldset key={q.n} className="panel p-5">
          <legend className="sr-only">Question {q.n}</legend>
          <p className="text-sm font-semibold leading-relaxed text-ink">
            {q.n}. {q.prompt}
          </p>
          <div className="mt-3 space-y-1.5">
            {q.options.map((opt, i) => (
              <label
                key={i}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  answers[String(q.n)] === i
                    ? "border-primary bg-primary/[0.06] text-ink"
                    : "border-rule text-ink-soft hover:border-ink-faint"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${q.n}`}
                  checked={answers[String(q.n)] === i}
                  onChange={() => setAnswers((a) => ({ ...a, [String(q.n)]: i }))}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-semibold">{LETTERS[i]}.</span> {opt}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const missing = exam.questions.length - answeredCount;
          if (
            missing > 0 &&
            !window.confirm(`You have ${missing} unanswered question${missing === 1 ? "" : "s"}. Submit anyway?`)
          ) {
            return;
          }
          void submit();
        }}
        className={`${buttonClass("primary", "md")} w-full`}
      >
        {pending ? "Submitting…" : "Submit exam"}
      </button>
    </div>
  );
}
