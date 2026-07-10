"use client";

import { useState } from "react";
import { updateCourseAction } from "../../actions";
import type { UpdateCourseResult } from "../../actions";
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
}: {
  programSlug: string;
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
  );
}
