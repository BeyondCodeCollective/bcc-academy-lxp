"use client";

import { useState } from "react";
import { createCourseAction } from "../actions";
import type { CreateCourseResult } from "../actions";
import { toSlug } from "@/lib/programs/slug";
import { Field, fieldInput, buttonClass } from "@/components/ui";

const PHASE_OPTIONS = [
  { value: "foundation", label: "Foundation" },
  { value: "core",       label: "Core" },
  { value: "workshop",   label: "Workshop" },
  { value: "exit",       label: "Exit" },
  { value: "other",      label: "Other" },
];

// Programs that surface on the bccacademy.io hub. Must match COURSE_PROGRAM_SLUGS
// in ../actions.ts.
const PROGRAM_OPTIONS = [
  { value: "catalyst",            label: "Catalyst" },
  { value: "beyond-code-centers", label: "Beyond Code Centers" },
  { value: "atg",                 label: "Beyond the Game" },
];

export function CreateCourseForm({
  extraProgram,
}: {
  /** Admin-created organization (is_dynamic), which has no TS config and so
   *  never appears in PROGRAM_OPTIONS. Passed through from ?program=. */
  extraProgram?: { slug: string; name: string };
} = {}) {
  const programOptions = extraProgram
    ? [{ value: extraProgram.slug, label: extraProgram.name }, ...PROGRAM_OPTIONS]
    : PROGRAM_OPTIONS;
  const [name, setName] = useState("");
  const [instructor, setInstructor] = useState("");
  const [totalWeeks, setTotalWeeks] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("");
  const [phase, setPhase] = useState("core");
  const [program, setProgram] = useState(extraProgram?.slug ?? "catalyst");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<CreateCourseResult, { success: true }> | null>(null);
  const [copied, setCopied] = useState(false);

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
        phase,
        programSlug: program,
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

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-4">
          <p className="text-sm font-semibold text-green-800">✓ Course created</p>

          <div className="rounded-lg border border-green-200 bg-white p-4 space-y-3">
            <p className="font-mono text-sm text-green-700 break-all">{result.joinUrl}</p>
            <button
              type="button"
              onClick={handleCopy}
              className={`${buttonClass("primary", "md")} w-full`}
            >
              {copied ? "Copied!" : "Copy join link"}
            </button>
          </div>

          <p className="text-xs text-green-700">
            Share this link to start enrolling students.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            document.cookie = `program-override=${program}; path=/; max-age=86400`;
            window.location.href = `/dashboard/admin?tab=${result.slug}`;
          }}
          className={`${buttonClass("primary", "md")} w-full`}
        >
          Manage this course →
        </button>

        <a
          href="/dashboard/admin/programs"
          className={`${buttonClass("secondary", "md")} w-full`}
        >
          View all courses
        </a>

        <button
          type="button"
          onClick={() => {
            setResult(null);
            setError(null);
            setName("");
            setInstructor("");
            setTotalWeeks("");
            setSessionsPerWeek("");
            setCopied(false);
          }}
          className="w-full text-center text-sm text-ink-soft hover:text-ink-soft transition-colors py-1"
        >
          + Create another course
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Course name">
        <input
          id="name"
          type="text"
          required
          placeholder="e.g. Salesforce Admin"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldInput}
        />
        {slug && (
          <p className="mt-1.5 font-mono text-xs text-ink-soft">
            bccacademy.io/join/{program}?track=<span className="text-primary">{slug}</span>
          </p>
        )}
      </Field>

      <Field label="Program" hint="which program this course belongs to">
        <select
          id="program"
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          className={fieldInput}
        >
          {programOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Instructor">
        <input
          id="instructor"
          type="text"
          required
          placeholder="e.g. Marcus Williams"
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
            placeholder="12"
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
            placeholder="2"
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
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${buttonClass("primary", "md")} w-full`}
      >
        {pending ? "Creating…" : "Create Course"}
      </button>
    </form>
  );
}
