"use client";

import { useState } from "react";
import { updateCourseAction } from "../../actions";
import type { UpdateCourseResult } from "../../actions";

export function EditCourseForm({
  trackSlug,
  initialName,
  initialInstructor,
  initialTotalWeeks,
  initialSessionsPerWeek,
}: {
  trackSlug: string;
  initialName: string;
  initialInstructor: string;
  initialTotalWeeks: number;
  initialSessionsPerWeek: number;
}) {
  const [name, setName] = useState(initialName);
  const [instructor, setInstructor] = useState(initialInstructor);
  const [totalWeeks, setTotalWeeks] = useState(String(initialTotalWeeks));
  const [sessionsPerWeek, setSessionsPerWeek] = useState(String(initialSessionsPerWeek));
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
        <label htmlFor="name" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Course Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-[#E54D2E] focus:ring-1 focus:ring-[#E54D2E]"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="instructor" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Instructor
        </label>
        <input
          id="instructor"
          type="text"
          required
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-[#E54D2E] focus:ring-1 focus:ring-[#E54D2E]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="totalWeeks" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
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
            className="w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-[#E54D2E] focus:ring-1 focus:ring-[#E54D2E]"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="sessionsPerWeek" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
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
            className="w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-[#E54D2E] focus:ring-1 focus:ring-[#E54D2E]"
          />
        </div>
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
          className="flex-1 rounded-lg bg-[#E54D2E] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#F0613E] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Changes"}
        </button>
        <a
          href="/dashboard/admin/programs"
          className="flex-1 flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          Back to Courses
        </a>
      </div>
    </form>
  );
}
