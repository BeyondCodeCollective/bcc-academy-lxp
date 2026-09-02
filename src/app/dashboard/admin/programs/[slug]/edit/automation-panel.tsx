"use client";

import { useState, useTransition } from "react";
import { Field, fieldInput, buttonClass } from "@/components/ui";
import { useToast } from "@/components/motion/toast";
import { saveTrackAutomation } from "./automation-actions";
import type { NudgeRule } from "@/lib/automation/rules";

// Course automation settings — the admin face of src/lib/automation. Both
// switches default OFF; flipping one on is the consent for the nightly cron
// to act on this course's roster.

type Props = {
  programSlug: string;
  trackSlug: string;
  /** How many weeks of this course carry a video (the lessons:"all" denominator). */
  videoWeeks: number;
  initial: {
    autoCertificate: boolean;
    completionLessons: "all" | number;
    completionSubmissions: number | null;
    nudgesEnabled: boolean;
    nudges: NudgeRule[];
  };
};

export function AutomationPanel({ programSlug, trackSlug, videoWeeks, initial }: Props) {
  const { showToast, updateToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [autoCert, setAutoCert] = useState(initial.autoCertificate);
  const [lessons, setLessons] = useState<string>(
    initial.completionLessons === "all" ? "all" : String(initial.completionLessons),
  );
  const [subs, setSubs] = useState<string>(
    initial.completionSubmissions ? String(initial.completionSubmissions) : "",
  );
  const [nudgesOn, setNudgesOn] = useState(initial.nudgesEnabled);
  const [neverStartedDays, setNeverStartedDays] = useState(
    String(initial.nudges.find((n) => n.id === "never-started")?.afterDays ?? 7),
  );
  const [stalledDays, setStalledDays] = useState(
    String(initial.nudges.find((n) => n.id === "stalled")?.afterDays ?? 14),
  );

  function save() {
    startTransition(async () => {
      const id = showToast({ title: "Saving automation…", status: "loading", duration: 0 });
      const result = await saveTrackAutomation(programSlug, trackSlug, {
        autoCertificate: autoCert,
        completion: {
          lessons: lessons === "all" ? "all" : Number(lessons) || 1,
          ...(subs.trim() ? { submissions: Number(subs) } : {}),
        },
        nudgesEnabled: nudgesOn,
        nudges: [
          { id: "never-started", afterDays: Number(neverStartedDays) || 7 },
          { id: "stalled", afterDays: Number(stalledDays) || 14 },
        ],
      });
      if (result.ok) {
        updateToast(id, { title: "Automation saved", status: "success", duration: 4200 });
      } else {
        updateToast(id, {
          title: "Automation not saved",
          description: result.error,
          status: "error",
          duration: 8000,
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={autoCert}
            onChange={(e) => setAutoCert(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--primary)]"
          />
          <span>
            <span className="block text-sm font-semibold text-ink">
              Auto-issue certificates
            </span>
            <span className="block text-xs text-ink-soft">
              Each night, learners who meet the completion rule below get their
              certificate created and emailed — no manual issuing.
            </span>
          </span>
        </label>
        {autoCert && (
          <div className="mt-3 grid grid-cols-2 gap-3 pl-7">
            <Field label="Lessons required" hint={`course has ${videoWeeks}`}>
              <select
                value={lessons}
                onChange={(e) => setLessons(e.target.value)}
                className={fieldInput}
              >
                <option value="all">All lessons</option>
                {Array.from({ length: Math.max(videoWeeks, 1) }, (_, i) => i + 1).map(
                  (n) => (
                    <option key={n} value={String(n)}>
                      At least {n}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Submissions required" hint="blank = none">
              <input
                type="number"
                min={1}
                value={subs}
                onChange={(e) => setSubs(e.target.value)}
                placeholder="0"
                className={fieldInput}
              />
            </Field>
          </div>
        )}
      </div>

      <div>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={nudgesOn}
            onChange={(e) => setNudgesOn(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--primary)]"
          />
          <span>
            <span className="block text-sm font-semibold text-ink">
              Engagement nudge emails
            </span>
            <span className="block text-xs text-ink-soft">
              A nightly scan emails learners who never started or went quiet.
              Each learner gets each nudge at most once, ever.
            </span>
          </span>
        </label>
        {nudgesOn && (
          <div className="mt-3 grid grid-cols-2 gap-3 pl-7">
            <Field label="Never started" hint="days after enrolling">
              <input
                type="number"
                min={1}
                value={neverStartedDays}
                onChange={(e) => setNeverStartedDays(e.target.value)}
                className={fieldInput}
              />
            </Field>
            <Field label="Went quiet" hint="days since last activity">
              <input
                type="number"
                min={1}
                value={stalledDays}
                onChange={(e) => setStalledDays(e.target.value)}
                className={fieldInput}
              />
            </Field>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className={buttonClass("primary", "md")}
      >
        {isPending ? "Saving…" : "Save automation"}
      </button>
    </div>
  );
}
