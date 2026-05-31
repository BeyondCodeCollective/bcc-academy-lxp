"use client";

import { useState } from "react";
import { createCourseAction } from "../actions";
import type { CreateCourseResult } from "../actions";
import { toSlug } from "@/lib/programs/slug";

export function CreateCourseForm() {
  const [name, setName] = useState("");
  const [instructor, setInstructor] = useState("");
  const [totalWeeks, setTotalWeeks] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<CreateCourseResult, { success: true }> | null>(null);

  const slug = toSlug(name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await createCourseAction({
        name,
        instructor,
        totalWeeks: parseInt(totalWeeks, 10),
        sessionsPerWeek: parseInt(sessionsPerWeek, 10),
      });

      if (res.success) {
        setResult(res);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-semibold text-green-800">Course created</p>
          <div className="mt-3 flex items-center gap-3 rounded-md border border-green-200 bg-white px-4 py-3">
            <span className="flex-1 font-mono text-sm text-green-700">{result.joinUrl}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(result.joinUrl)}
              className="shrink-0 rounded bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-200 transition-colors"
            >
              Copy link
            </button>
          </div>
          <p className="mt-3 text-xs text-green-600">
            Share this link to start enrolling students. Switch to this course in the admin panel to manage it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setResult(null); setError(null); setName(""); setInstructor(""); setTotalWeeks(""); setSessionsPerWeek(""); }}
          className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          Create another course
        </button>
      </div>
    );
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
          placeholder="e.g. Salesforce Admin"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-[#E54D2E] focus:ring-1 focus:ring-[#E54D2E]"
        />
        {slug && (
          <p className="font-mono text-xs text-neutral-500">
            bccacademy.io/join/<span className="text-[#E54D2E]">{slug}</span>
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="instructor" className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Instructor
        </label>
        <input
          id="instructor"
          type="text"
          required
          placeholder="e.g. Marcus Williams"
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
            placeholder="12"
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
            placeholder="2"
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

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#E54D2E] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#F0613E] disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create Course"}
      </button>
    </form>
  );
}
