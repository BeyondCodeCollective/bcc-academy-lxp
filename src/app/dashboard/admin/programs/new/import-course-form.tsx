"use client";

import { useState } from "react";
import {
  previewCourseImportAction,
  previewCourseFileImportAction,
  generateCourseDraftAction,
  createCourseFromDraftAction,
} from "../import-actions";
import type { CourseDraft } from "@/lib/course-import/parse";
import { toSlug } from "@/lib/programs/slug";
import { Field, fieldInput, buttonClass } from "@/components/ui";

// Must match COURSE_PROGRAM_SLUGS in ../import-actions.ts.
const PROGRAM_OPTIONS = [
  { value: "catalyst", label: "Catalyst" },
  { value: "beyond-code-centers", label: "Beyond Code Centers" },
  { value: "atg", label: "Beyond the Game" },
];

type Created = { slug: string; joinUrl: string; allowlisted: number };

export function ImportCourseForm({
  currentProgram,
  variant = "import",
}: {
  /** The program context the admin is standing in. Standalone programs (BGC,
   *  Forte, dynamic orgs) scope the picker to themselves; the hub programs
   *  keep the full hub list. */
  currentProgram?: { slug: string; name: string };
  /** "import" reads an existing source; "generate" invents a course from a
   *  plain-English description. Step 2 (review + create) is identical. */
  variant?: "import" | "generate";
} = {}) {
  const generating = variant === "generate";
  const hubSlugs = PROGRAM_OPTIONS.map((o) => o.value);
  const programOptions =
    currentProgram && !hubSlugs.includes(currentProgram.slug)
      ? [{ value: currentProgram.slug, label: currentProgram.name }]
      : PROGRAM_OPTIONS;
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [needsPaste, setNeedsPaste] = useState(false);
  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [useAttendees, setUseAttendees] = useState(true);
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>();
  const [program, setProgram] = useState(currentProgram?.slug ?? "catalyst");
  const [meetingLink, setMeetingLink] = useState("");
  // Raw newline-separated text behind the objectives textarea. Seeded from the
  // draft when one arrives; the draft itself keeps the cleaned array.
  const [objectivesText, setObjectivesText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsPaste(false);
    setPending(true);
    try {
      let res;
      if (generating) {
        res = await generateCourseDraftAction(input);
      } else if (file) {
        const fd = new FormData();
        fd.set("file", file);
        res = await previewCourseFileImportAction(fd);
      } else {
        res = await previewCourseImportAction(input);
      }
      if (res.success) {
        setDraft(res.draft);
        setObjectivesText((res.draft.objectives ?? []).join("\n"));
        setAttendees(res.attendeeEmails);
        setCoverImageUrl(res.coverImageUrl);
      } else {
        setError(res.error);
        setNeedsPaste(Boolean(res.needsPaste));
        // "Paste it instead" needs the textarea back, so drop the file.
        if (res.needsPaste) setFile(null);
      }
    } catch {
      setError("Something went wrong reading that. Try pasting the text instead.");
      setNeedsPaste(true);
      setFile(null);
    } finally {
      setPending(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setError(null);
    setPending(true);
    try {
      const res = await createCourseFromDraftAction({
        draft,
        programSlug: program,
        meetingLink,
        coverImageUrl,
        allowlistEmails: useAttendees ? attendees : [],
      });
      if (res.success) {
        setCreated(res);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function patch(changes: Partial<CourseDraft>) {
    setDraft((d) => (d ? { ...d, ...changes } : d));
  }

  function patchSession(i: number, changes: Partial<CourseDraft["sessions"][number]>) {
    setDraft((d) =>
      d
        ? { ...d, sessions: d.sessions.map((s, n) => (n === i ? { ...s, ...changes } : s)) }
        : d,
    );
  }

  const emptyLanding = { headline: "", subhead: "", eyebrow: "", bodySections: [] };

  function patchLanding(changes: Partial<CourseDraft["landing"]>) {
    setDraft((d) => (d ? { ...d, landing: { ...(d.landing ?? emptyLanding), ...changes } } : d));
  }

  function patchLandingSection(i: number, changes: Partial<{ heading: string; body: string }>) {
    setDraft((d) =>
      d
        ? {
            ...d,
            landing: {
              ...(d.landing ?? emptyLanding),
              bodySections: (d.landing?.bodySections ?? []).map((s, n) =>
                n === i ? { ...s, ...changes } : s,
              ),
            },
          }
        : d,
    );
  }

  if (created) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-4">
          <p className="text-sm font-semibold text-green-800">✓ Course created</p>
          <div className="rounded-lg border border-green-200 bg-white p-4 space-y-3">
            <p className="font-mono text-sm text-green-700 break-all">{created.joinUrl}</p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(created.joinUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={`${buttonClass("primary", "md")} w-full`}
            >
              {copied ? "Copied!" : "Copy join link"}
            </button>
          </div>
          {created.allowlisted > 0 && (
            <p className="text-xs text-green-700">
              {created.allowlisted} registrant{created.allowlisted === 1 ? "" : "s"} added to the allowlist.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            document.cookie = `program-override=${program}; path=/; max-age=86400`;
            window.location.href = `/dashboard/admin?tab=${created.slug}`;
          }}
          className={`${buttonClass("primary", "md")} w-full`}
        >
          Manage this course →
        </button>
      </div>
    );
  }

  // Step 1 — paste a link or the text.
  if (!draft) {
    return (
      <form onSubmit={handlePreview} className="space-y-5">
        <Field
          label={
            generating
              ? "Describe the program"
              : "Google Doc link, Eventbrite link, pasted text, or a file"
          }
          hint={
            generating
              ? "goal, audience, length, and schedule if you know it — the AI drafts the full course, then you review it before anything is created"
              : "the AI fills in the course, then you review it before anything is created"
          }
        >
          <textarea
            id="import-input"
            required={generating || !file}
            disabled={!generating && Boolean(file)}
            rows={generating ? 6 : needsPaste ? 12 : 4}
            placeholder={
              generating
                ? "6-week AI literacy course for city staff, evenings, complete beginners. Tuesdays 6pm ET starting September 15."
                : "https://docs.google.com/document/d/…\n\nor paste the event details here"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={`${fieldInput} font-mono text-xs disabled:opacity-50`}
          />
        </Field>

        {!generating && (
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-lg border border-ink/10 px-3 py-2 text-sm text-ink-soft transition-colors hover:border-ink/25 hover:text-ink">
              {file ? "Choose a different file" : "…or upload a file"}
              <input
                type="file"
                accept=".pdf,.docx,.pptx"
                className="sr-only"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError(null);
                  setNeedsPaste(false);
                  // Same input can be re-picked after clearing.
                  e.target.value = "";
                }}
              />
            </label>
            {file ? (
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <span className="truncate font-mono text-xs">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label="Remove file"
                  className="shrink-0 text-ink-soft transition-colors hover:text-ink"
                >
                  ✕
                </button>
              </span>
            ) : (
              <span className="text-xs text-ink-soft">PDF, Word, or PowerPoint · up to 15MB</span>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className={`${buttonClass("primary", "md")} w-full`}
        >
          {generating
            ? pending
              ? "Drafting…"
              : "Draft the program"
            : pending
              ? "Reading…"
              : "Read and fill in the course"}
        </button>
      </form>
    );
  }

  // Step 2 — review everything before writing.
  const slug = toSlug(draft.name);
  const missing = draft.missing ?? [];

  return (
    <form onSubmit={handleCreate} className="space-y-5">
      <div className="rounded-lg border border-ink/10 bg-surface-muted px-4 py-3">
        <p className="text-sm font-semibold">Review before creating</p>
        <p className="mt-1 text-xs text-ink-soft">
          Nothing has been saved yet. Read the learner-facing text as carefully as
          the dates — both go live exactly as they appear here.
        </p>
      </div>

      {missing.length > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          The source didn&apos;t state: {missing.join(", ")}. Fill these in — they were
          left blank rather than guessed.
        </p>
      )}

      {!draft.timezoneStated && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No timezone was stated in the source, so these times are assumed to be
          Eastern. Confirm them against wherever people registered.
        </p>
      )}

      <Field label="Course name">
        <input
          type="text"
          required
          value={draft.name}
          onChange={(e) => patch({ name: e.target.value })}
          className={fieldInput}
        />
        {slug && (
          <p className="mt-1.5 font-mono text-xs text-ink-soft">
            bccacademy.io/join/{program}?track=<span className="text-primary">{slug}</span>
          </p>
        )}
      </Field>

      {/* The teaching material, which the model writes and nobody could see.
          Everything in this block lands in track_overrides / session_content
          and renders on the learner's course and week pages — the description
          and objectives are INVENTED by the generator, whose system prompt
          asks it for "2-4 warm, concrete sentences" and "3-6 learning
          objectives". Until now step 2 showed only the name and the timetable,
          so an admin could click Create believing they had reviewed the
          course, having read the schedule and none of the teaching. */}
      <div className="rounded-lg border border-ink/10 px-4 py-4 space-y-5">
        <div>
          <p className="text-sm font-semibold text-ink">What learners will see</p>
          <p className="mt-1 text-xs text-ink-soft">
            {generating
              ? "Drafted by the model from your description. Read it before you create the course — this is the course, as far as a learner is concerned."
              : "Pulled from the source. Read it before you create the course — this is the course, as far as a learner is concerned."}
          </p>
        </div>

        <Field label="Short name" hint="course cards and navigation">
          <input
            type="text"
            value={draft.shortName ?? ""}
            onChange={(e) => patch({ shortName: e.target.value })}
            className={fieldInput}
          />
        </Field>

        <Field label="Description" hint="the course page">
          <textarea
            rows={4}
            value={draft.description ?? ""}
            onChange={(e) => patch({ description: e.target.value })}
            className={fieldInput}
          />
        </Field>

        <Field label="Learning objectives" hint="one per line, shown on week 1">
          <textarea
            rows={5}
            // The textarea owns the raw text so pressing Enter for a new line
            // doesn't fight a filter that strips empties; the draft only ever
            // holds the cleaned array.
            value={objectivesText}
            onChange={(e) => {
              setObjectivesText(e.target.value);
              patch({
                objectives: e.target.value
                  .split("\n")
                  .map((o) => o.trim())
                  .filter(Boolean),
              });
            }}
            className={fieldInput}
          />
        </Field>

        <Field label="Session 1 title">
          <input
            type="text"
            value={draft.sessionTitle ?? ""}
            onChange={(e) => patch({ sessionTitle: e.target.value })}
            className={fieldInput}
          />
        </Field>

        <Field label="Session 1 subtitle">
          <input
            type="text"
            value={draft.sessionSubtitle ?? ""}
            onChange={(e) => patch({ sessionSubtitle: e.target.value })}
            className={fieldInput}
          />
        </Field>
      </div>

      {/* The landing page draft. Copy only — the schedule is derived from the
          sessions at create time, and images/accent/links are added later in
          the landing editor. The page is created UNPUBLISHED, so nothing here
          is public until the admin publishes it. */}
      <div className="rounded-lg border border-ink/10 px-4 py-4 space-y-5">
        <div>
          <p className="text-sm font-semibold text-ink">Landing page</p>
          <p className="mt-1 text-xs text-ink-soft">
            Drafted from the same source. Created unpublished at /bcc/{slug || "…"} —
            add the hero image and publish from Manage Landing Pages.
          </p>
        </div>

        <Field label="Eyebrow" hint="tiny kicker above the headline — optional">
          <input
            type="text"
            value={draft.landing?.eyebrow ?? ""}
            onChange={(e) => patchLanding({ eyebrow: e.target.value })}
            className={fieldInput}
          />
        </Field>

        <Field label="Headline">
          <input
            type="text"
            value={draft.landing?.headline ?? ""}
            onChange={(e) => patchLanding({ headline: e.target.value })}
            className={fieldInput}
          />
        </Field>

        <Field label="Subhead">
          <input
            type="text"
            value={draft.landing?.subhead ?? ""}
            onChange={(e) => patchLanding({ subhead: e.target.value })}
            className={fieldInput}
          />
        </Field>

        {(draft.landing?.bodySections ?? []).map((section, i) => (
          <Field key={i} label={`Section ${i + 1}`}>
            <div className="space-y-2">
              <input
                type="text"
                value={section.heading}
                onChange={(e) => patchLandingSection(i, { heading: e.target.value })}
                placeholder="Heading"
                className={fieldInput}
              />
              <textarea
                rows={3}
                value={section.body}
                onChange={(e) => patchLandingSection(i, { body: e.target.value })}
                placeholder="Body"
                className={fieldInput}
              />
            </div>
          </Field>
        ))}
      </div>

      <Field label="Program">
        <select
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
          type="text"
          required
          value={draft.instructor}
          onChange={(e) => patch({ instructor: e.target.value })}
          className={fieldInput}
        />
      </Field>

      <Field label="Schedule (shown to learners)">
        <input
          type="text"
          value={draft.sessionTimes?.join(", ") ?? ""}
          onChange={(e) => patch({ sessionTimes: [e.target.value] })}
          className={fieldInput}
        />
      </Field>

      <Field
        label="Sessions"
        hint="these drive the calendar — a course with none never appears on it"
      >
        <div className="space-y-2">
          {draft.sessions.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-xs text-ink-soft">{s.week}</span>
              <input
                type="date"
                required
                value={s.date}
                onChange={(e) => patchSession(i, { date: e.target.value })}
                className={`${fieldInput} w-40`}
              />
              <input
                type="time"
                required
                value={s.time}
                onChange={(e) => patchSession(i, { time: e.target.value })}
                className={`${fieldInput} w-28`}
              />
              <input
                type="text"
                value={s.topic}
                onChange={(e) => patchSession(i, { topic: e.target.value })}
                className={`${fieldInput} flex-1`}
                placeholder="Topic"
              />
            </div>
          ))}
          <p className="text-xs text-ink-soft">All times Eastern.</p>
        </div>
      </Field>

      <Field label="Zoom link" hint="optional — can be added later in Manage Course">
        <input
          type="url"
          value={meetingLink}
          onChange={(e) => setMeetingLink(e.target.value)}
          placeholder="https://us02web.zoom.us/j/…"
          className={fieldInput}
        />
      </Field>

      {attendees.length > 0 && (
        <label className="flex items-start gap-2 rounded-lg border border-ink/10 px-4 py-3">
          <input
            type="checkbox"
            checked={useAttendees}
            onChange={(e) => setUseAttendees(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            Add {attendees.length} Eventbrite registrant
            {attendees.length === 1 ? "" : "s"} to the allowlist
            <span className="block text-xs text-ink-soft">
              Without this they can&apos;t sign in.
            </span>
          </span>
        </label>
      )}

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
        {pending ? "Creating…" : "Create course"}
      </button>

      <button
        type="button"
        onClick={() => {
          setDraft(null);
          setObjectivesText("");
          setFile(null);
          setError(null);
        }}
        className="w-full py-1 text-center text-sm text-ink-soft transition-colors hover:text-ink"
      >
        ← Start over
      </button>
    </form>
  );
}
