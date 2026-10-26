"use client";

import { useState } from "react";
import type { LandingSession, SignupQuestion } from "@/lib/landing-pages";
import { enrollInCourse } from "@/app/bcc/[slug]/enroll-action";
import { AGE_RANGES } from "@/lib/age-ranges";

/** Kept in one place so the landing form, the action, and the admin column
 *  all speak the same vocabulary. Free text would make this unreportable. */
export const HEARD_ABOUT_OPTIONS = [
  "Instagram or social media",
  "Email from Beyond Code Collective",
  "Friend or family",
  "Community organization",
  "School or university",
  "Employer or coworker",
  "Search engine",
  "Event or workshop",
  "Other",
] as const;

/**
 * Native course enrollment — pick a date (if the course has sessions), enter
 * name + email, and get enrolled with a magic access link. Replaces the
 * Eventbrite embed; talks to the enrollInCourse server action.
 */
export function CampEnrollForm({
  ink = "#1a1a1a",
  slug,
  sessions,
  questions = [],
  accent,
  ctaLabel,
  comingSoon = false,
  companion,
}: {
  ink?: string;
  slug: string;
  sessions: LandingSession[];
  /** Extra required multiple-choice questions, asked after the basics. */
  questions?: SignupQuestion[];
  accent: string;
  ctaLabel: string | null;
  /** Interest capture only — nothing to enroll in yet. */
  comingSoon?: boolean;
  /** A sibling interest-capture page (info sessions) offered as a second choice on the same form. */
  companion?: { slug: string; label: string };
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [zip, setZip] = useState("");
  const [heardAbout, setHeardAbout] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherDetails, setOtherDetails] = useState<Record<string, string>>({});
  const [wantProgram, setWantProgram] = useState(true);
  const [wantInfo, setWantInfo] = useState(false);
  const [infoOnly, setInfoOnly] = useState(false);
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [enrolled, setEnrolled] = useState(true);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    if (companion && !wantProgram && !wantInfo) {
      setError("Choose at least one option.");
      return;
    }
    setStatus("loading");
    setError("");

    const person = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      zipCode: zip.trim(),
      heardAbout,
      ageRange,
      origin: window.location.origin,
    };
    const programWanted = !companion || wantProgram;

    let result: Awaited<ReturnType<typeof enrollInCourse>> = { ok: true, enrolled: false };
    if (programWanted) {
      result = await enrollInCourse({
        slug,
        ...person,
        answers,
        otherDetails,
        sessionId: sessions.length > 0 ? sessionId : null,
      });
    }
    if (result.ok && companion && wantInfo) {
      const info = await enrollInCourse({ slug: companion.slug, ...person });
      if (!info.ok) result = info;
    }

    if (result.ok) {
      setEnrolled(result.enrolled);
      setInfoOnly(!programWanted);
      setStatus("sent");
    } else {
      setStatus("error");
      setError(result.error);
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl p-4" style={{ background: `${accent}0f` }}>
        <p className="text-sm font-semibold" style={{ color: `${ink}` }}>
          {enrolled && !infoOnly ? "You're in — check your email." : "You're on the list."}
        </p>
        <p className="mt-1 text-sm" style={{ color: `${ink}99` }}>
          {enrolled && !infoOnly ? (
            <>
              We sent a link to <strong>{email.trim()}</strong> to open your course.
            </>
          ) : (
            <>We&apos;ll email <strong>{email.trim()}</strong> the moment sessions open.</>
          )}
        </p>
      </div>
    );
  }

  const inputStyle =
    "w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      {companion && (
        <fieldset className="space-y-1.5 pb-1" disabled={status === "loading"}>
          <legend className="text-sm font-medium" style={{ color: ink }}>
            What would you like to do?
          </legend>
          <label className="flex items-center gap-2 text-sm" style={{ color: ink }}>
            <input type="checkbox" checked={wantProgram} onChange={(e) => setWantProgram(e.target.checked)} />
            {ctaLabel ?? "Sign up"}
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: ink }}>
            <input type="checkbox" checked={wantInfo} onChange={(e) => setWantInfo(e.target.checked)} />
            {companion.label}
          </label>
        </fieldset>
      )}
      {sessions.length > 0 && (
        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          aria-label="Choose a date"
          className={inputStyle}
          style={{ borderColor: `${ink}22`, color: `${ink}` }}
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      )}
      {/* Asked separately: one "Full name" box meant the surname was a guess at
         the first space, which turned "Ana M Mendoza-Santiago" into a first
         name of Ana and a surname of M Mendoza-Santiago. */}
      <input
        type="text"
        required
        autoComplete="given-name"
        placeholder="First name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        disabled={status === "loading"}
        className={inputStyle}
        style={{ borderColor: `${ink}22`, color: `${ink}` }}
      />
      <input
        type="text"
        required
        autoComplete="family-name"
        placeholder="Last name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        disabled={status === "loading"}
        className={inputStyle}
        style={{ borderColor: `${ink}22`, color: `${ink}` }}
      />
      <input
        type="email"
        required
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === "loading"}
        className={inputStyle}
        style={{ borderColor: `${ink}22`, color: `${ink}` }}
      />
      <input
        type="text"
        required
        inputMode="numeric"
        autoComplete="postal-code"
        pattern="\d{5}(-\d{4})?"
        title="5-digit ZIP code"
        placeholder="ZIP code"
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        disabled={status === "loading"}
        className={inputStyle}
        style={{ borderColor: `${ink}22`, color: `${ink}` }}
      />
      {/* Attribution, asked at the moment of intent rather than in a survey
         later. Required with an explicit opt-out so the answer means something
         instead of skewing to whoever bothered. */}
      <select
        required
        aria-label="How did you hear about us?"
        value={heardAbout}
        onChange={(e) => setHeardAbout(e.target.value)}
        disabled={status === "loading"}
        className={inputStyle}
        style={{ borderColor: `${ink}22`, color: heardAbout ? ink : `${ink}80` }}
      >
        <option value="" disabled>
          How did you hear about us?
        </option>
        {HEARD_ABOUT_OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <select
        required
        aria-label="Age range"
        value={ageRange}
        onChange={(e) => setAgeRange(e.target.value)}
        disabled={status === "loading"}
        className={inputStyle}
        style={{ borderColor: `${ink}22`, color: ageRange ? ink : `${ink}80` }}
      >
        <option value="" disabled>
          Age range
        </option>
        {AGE_RANGES.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {(!companion || wantProgram) &&
        questions.map((q) => (
        <fieldset key={q.id} className="space-y-1.5 pt-1" disabled={status === "loading"}>
          <legend className="text-sm font-medium" style={{ color: ink }}>
            {q.label}
            {q.hint && (
              <span className="group relative ml-1.5 inline-block align-middle">
                <span
                  tabIndex={0}
                  role="img"
                  aria-label={q.hint}
                  className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border text-[10px] font-semibold leading-none"
                  style={{ borderColor: `${ink}55`, color: `${ink}99` }}
                >
                  i
                </span>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 hidden w-48 -translate-x-1/2 rounded-md px-2.5 py-1.5 text-xs font-normal text-white group-hover:block group-focus-within:block"
                  style={{ background: ink }}
                >
                  {q.hint}
                </span>
              </span>
            )}
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {q.options.map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm" style={{ color: ink }}>
                <input
                  type="radio"
                  name={q.id}
                  value={o}
                  required
                  checked={answers[q.id] === o}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: o }))}
                />
                {o}
              </label>
            ))}
          </div>
          {answers[q.id] === "Other" && (
            <input
              type="text"
              required
              maxLength={200}
              placeholder="Please tell us more"
              value={otherDetails[q.id] ?? ""}
              onChange={(e) => setOtherDetails((d) => ({ ...d, [q.id]: e.target.value }))}
              className={inputStyle}
              style={{ borderColor: `${ink}22`, color: `${ink}` }}
            />
          )}
        </fieldset>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: accent }}
      >
        {status === "loading" ? (comingSoon ? "Sending…" : "Enrolling…") : (ctaLabel ?? "Enroll")}
      </button>
    </form>
  );
}
