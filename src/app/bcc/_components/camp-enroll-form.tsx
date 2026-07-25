"use client";

import { useState } from "react";
import type { LandingSession } from "@/lib/landing-pages";
import { enrollInCourse } from "@/app/bcc/[slug]/enroll-action";

/**
 * Native course enrollment — pick a date (if the course has sessions), enter
 * name + email, and get enrolled with a magic access link. Replaces the
 * Eventbrite embed; talks to the enrollInCourse server action.
 */
export function CampEnrollForm({
  slug,
  sessions,
  accent,
  ctaLabel,
}: {
  slug: string;
  sessions: LandingSession[];
  accent: string;
  ctaLabel: string | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [enrolled, setEnrolled] = useState(true);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError("");

    const result = await enrollInCourse({
      slug,
      name,
      email: email.trim(),
      sessionId: sessions.length > 0 ? sessionId : null,
      origin: window.location.origin,
    });

    if (result.ok) {
      setEnrolled(result.enrolled);
      setStatus("sent");
    } else {
      setStatus("error");
      setError(result.error);
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl p-4" style={{ background: `${accent}0f` }}>
        <p className="text-sm font-semibold" style={{ color: "#1a1a1a" }}>
          {enrolled ? "You're in — check your email." : "You're on the list."}
        </p>
        <p className="mt-1 text-sm" style={{ color: "#1a1a1a99" }}>
          {enrolled ? (
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
      {sessions.length > 0 && (
        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          aria-label="Choose a date"
          className={inputStyle}
          style={{ borderColor: "#1a1a1a22", color: "#1a1a1a" }}
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      )}
      <input
        type="text"
        required
        placeholder="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={status === "loading"}
        className={inputStyle}
        style={{ borderColor: "#1a1a1a22", color: "#1a1a1a" }}
      />
      <input
        type="email"
        required
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === "loading"}
        className={inputStyle}
        style={{ borderColor: "#1a1a1a22", color: "#1a1a1a" }}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: accent }}
      >
        {status === "loading" ? "Enrolling…" : (ctaLabel ?? "Enroll")}
      </button>
    </form>
  );
}
