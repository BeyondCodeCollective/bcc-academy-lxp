"use client";

import { useState } from "react";
import { updateCourseAction } from "../../actions";
import type { UpdateCourseResult } from "../../actions";
import { buttonClass, fieldInput } from "@/components/ui";

const PHASE_OPTIONS = [
  { value: "foundation", label: "Foundation" },
  { value: "core",       label: "Core" },
  { value: "workshop",   label: "Workshop" },
  { value: "exit",       label: "Exit" },
  { value: "other",      label: "Other" },
];

export function EditCourseForm({
  trackSlug,
  initialName,
  initialInstructor,
  initialTotalWeeks,
  initialSessionsPerWeek,
  initialPhase,
}: {
  trackSlug: string;
  initialName: string;
  initialInstructor: string;
  initialTotalWeeks: number;
  initialSessionsPerWeek: number;
  initialPhase: string;
}) {
  const [name, setName] = useState(initialName);
  const [instructor, setInstructor] = useState(initialInstructor);
  const [totalWeeks, setTotalWeeks] = useState(String(initialTotalWeeks));
  const [sessionsPerWeek, setSessionsPerWeek] = useState(String(initialSessionsPerWeek));
  const [phase, setPhase] = useState(initialPhase);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const res: UpdateCourseResult = await updateCourseAction(trackSlug, {
        name,
        instructor,
        totalWeeks: parseInt(totalWeeks, 10),
        sessionsPerWeek: parseInt(sessionsPerWeek, 10),
        phase,
      });
      if (res.success) {
        setSaved(true);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Course Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldInput}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="instructor" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Instructor
        </label>
        <input
          id="instructor"
          type="text"
          required
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
          className={fieldInput}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="totalWeeks" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Length (weeks)
          </label>
          <input
            id="totalWeeks"
            type="number"
            required
            min={1}
            max={52}
            value={totalWeeks}
            onChange={(e) => setTotalWeeks(e.target.value)}
            className={fieldInput}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="sessionsPerWeek" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Sessions / Week
          </label>
          <input
            id="sessionsPerWeek"
            type="number"
            required
            min={1}
            max={7}
            value={sessionsPerWeek}
            onChange={(e) => setSessionsPerWeek(e.target.value)}
            className={fieldInput}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phase" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Group
        </label>
        <select
          id="phase"
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          className={fieldInput}
        >
          {PHASE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {saved && (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ Changes saved
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className={`${buttonClass("primary", "md")} flex-1`}
        >
          {pending ? "Saving…" : "Save Changes"}
        </button>
        <a
          href="/dashboard/admin/programs"
          className={`${buttonClass("secondary", "md")} flex-1`}
        >
          Back to Courses
        </a>
      </div>
    </form>
  );
}
