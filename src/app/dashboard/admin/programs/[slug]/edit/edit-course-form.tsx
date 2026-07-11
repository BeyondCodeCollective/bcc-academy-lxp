"use client";

import { useState } from "react";
import { updateCourseAction, applyWeeklyScheduleAction } from "../../actions";
import type { UpdateCourseResult, ApplyScheduleResult } from "../../actions";
import { Field, buttonClass, fieldInput } from "@/components/ui";

const PHASE_OPTIONS = [
  { value: "foundation", label: "Foundation" },
  { value: "core",       label: "Core" },
  { value: "workshop",   label: "Workshop" },
  { value: "exit",       label: "Exit" },
  { value: "other",      label: "Other" },
];

export function EditCourseForm({
  programSlug,
  trackSlug,
  initialName,
  initialInstructor,
  initialTotalWeeks,
  initialSessionsPerWeek,
  initialPhase,
  initialFirstDate = "",
  initialTime = "",
  initialDuration = "",
}: {
  programSlug: string;
  trackSlug: string;
  initialName: string;
  initialInstructor: string;
  initialTotalWeeks: number;
  initialSessionsPerWeek: number;
  initialPhase: string;
  /** First dated unit, YYYY-MM-DD. Empty = no schedule set yet. */
  initialFirstDate?: string;
  /** "HH:MM" ET wall clock from the first dated unit. */
  initialTime?: string;
  initialDuration?: string;
}) {
  const [name, setName] = useState(initialName);
  const [instructor, setInstructor] = useState(initialInstructor);
  const [totalWeeks, setTotalWeeks] = useState(String(initialTotalWeeks));
  const [sessionsPerWeek, setSessionsPerWeek] = useState(String(initialSessionsPerWeek));
  const [phase, setPhase] = useState(initialPhase);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Schedule section — separate save so a schedule mistake can't block a
  // name edit and vice versa.
  const [firstDate, setFirstDate] = useState(initialFirstDate);
  const [time, setTime] = useState(initialTime);
  const [duration, setDuration] = useState(initialDuration);
  const [schedPending, setSchedPending] = useState(false);
  const [schedError, setSchedError] = useState<string | null>(null);
  const [schedSaved, setSchedSaved] = useState<string | null>(null);

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSchedError(null);
    setSchedSaved(null);
    setSchedPending(true);
    try {
      const res: ApplyScheduleResult = await applyWeeklyScheduleAction(programSlug, trackSlug, {
        firstDate,
        time,
        durationMinutes: parseInt(duration, 10),
      });
      if (res.success) setSchedSaved(res.summary);
      else setSchedError(res.error);
    } catch {
      setSchedError("Something went wrong. Please try again.");
    } finally {
      setSchedPending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const res: UpdateCourseResult = await updateCourseAction(programSlug, trackSlug, {
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
    <div className="space-y-8">
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Course name">
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldInput}
        />
      </Field>

      <Field label="Instructor">
        <input
          id="instructor"
          type="text"
          required
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
          className={fieldInput}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Length (weeks)">
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
        </Field>
        <Field label="Sessions / week">
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
        </Field>
      </div>

      <Field label="Group">
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
      </Field>

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

    {/* Session schedule — the answer to "where do I set when this course
       meets". One weekly slot stamps a date + ET time + duration onto every
       unit, which is what drives the course calendar, the .ics feed, and the
       "Today / Live now · Join" panel. */}
    <form onSubmit={handleSchedule} className="space-y-4 border-t border-rule pt-6">
      <div>
        <h2 className="text-sm font-semibold text-ink">Session schedule</h2>
        <p className="mt-1 text-xs text-ink-faint">
          When this course meets. Sessions repeat weekly from the first date —
          every unit gets its date and time, shown on the course calendar and
          used for the live Join button. Times are Eastern (ET).
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="First session">
          <input
            id="firstDate"
            type="date"
            required
            value={firstDate}
            onChange={(e) => setFirstDate(e.target.value)}
            className={fieldInput}
          />
        </Field>
        <Field label="Start time (ET)">
          <input
            id="time"
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={fieldInput}
          />
        </Field>
        <Field label="Length (minutes)">
          <input
            id="duration"
            type="number"
            required
            min={5}
            max={600}
            step={5}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={fieldInput}
          />
        </Field>
      </div>

      {schedError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {schedError}
        </p>
      )}
      {schedSaved && (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ Schedule set — {schedSaved}
        </p>
      )}

      <button
        type="submit"
        disabled={schedPending}
        className={buttonClass("dark", "md")}
      >
        {schedPending ? "Applying…" : "Apply schedule"}
      </button>
    </form>
    </div>
  );
}
