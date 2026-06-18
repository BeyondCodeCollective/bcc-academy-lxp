"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { buttonClass, fieldInput } from "@/components/ui";
import { addStudentAction, assignStudentTrack } from "./actions";
import { getAllowedEmails, replaceAllowedEmails } from "./allowlist/actions";
import { sendCohortInvites } from "./invites/actions";
import type { Student } from "@/lib/types";

type StudentRow = Pick<
  Student,
  "id" | "first_name" | "last_name" | "email" | "role" | "cohort_id" | "last_seen_at"
>;

type Track = { slug: string; name: string; shortName: string };

type Props = {
  tracks: Track[];
  programSlug: string;
  onStudentAdded: (s: StudentRow) => void;
  onClose: () => void;
};

// The single "Add people" surface: one panel, two ways to add someone.
//  • Invite by email — allowlist a list of emails for a course + send one-click
//    invites (bulk; the person sets up their own account by clicking).
//  • Add directly — create the account immediately (a known instructor/admin).
// Replaces both the standalone Add People page and the roster's old Add person
// form so there's exactly one entry point.
export function AddPeoplePanel({ tracks, programSlug, onStudentAdded, onClose }: Props) {
  const [mode, setMode] = useState<"invite" | "direct">("invite");

  return (
    <div className="panel space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1">
          <ModeTab active={mode === "invite"} onClick={() => setMode("invite")}>
            Invite by email
          </ModeTab>
          <ModeTab active={mode === "direct"} onClick={() => setMode("direct")}>
            Add directly
          </ModeTab>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[12px] text-ink-faint transition-colors hover:text-ink"
        >
          Close
        </button>
      </div>

      {mode === "invite" ? (
        <InviteByEmail tracks={tracks} />
      ) : (
        <AddDirectly
          tracks={tracks}
          programSlug={programSlug}
          onStudentAdded={onStudentAdded}
        />
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
        active ? "bg-ink text-white" : "text-ink-soft hover:bg-paper-tint"
      }`}
    >
      {children}
    </button>
  );
}

// ── Invite by email ─────────────────────────────────────────────────────────

function InviteByEmail({ tracks }: { tracks: Track[] }) {
  const [course, setCourse] = useState(tracks[0]?.slug ?? "");
  const [emails, setEmails] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!course || !emails.trim()) return;
    setResult(null);
    setError(null);
    startTransition(async () => {
      try {
        // Append to the course's allowlist (merge with current), then invite.
        const current = await getAllowedEmails(course);
        const merged = [...(current.emails ?? []), ...emails.split(/[\n,]/)]
          .map((e) => e.trim())
          .filter(Boolean)
          .join("\n");
        await replaceAllowedEmails(course, merged);
        const sent = await sendCohortInvites(course);
        if (sent.ok) {
          setResult(`Allowlisted + invited. ${sent.sent} sent${sent.failed ? `, ${sent.failed} failed` : ""}.`);
          setEmails("");
        } else {
          setError(sent.error ?? "Failed to send invites.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add people.");
      }
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-ink-soft">
        Allowlist these emails for a course and send each a one-click login link.
      </p>
      <Field label="Course">
        <select value={course} onChange={(e) => setCourse(e.target.value)} className={fieldInput}>
          {tracks.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.shortName || t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Emails (one per line, or comma-separated)">
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          rows={5}
          placeholder="alice@example.com&#10;bob@example.com"
          className={fieldInput}
        />
      </Field>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !emails.trim() || !course}
          className={buttonClass("dark", "sm")}
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : null}
          {pending ? "Sending…" : "Allowlist + send invites"}
        </button>
        {result && <span className="text-[12px] text-ink-soft">{result}</span>}
        {error && <span className="text-[12px] text-red-600">{error}</span>}
      </div>
    </div>
  );
}

// ── Add directly ────────────────────────────────────────────────────────────

function AddDirectly({
  tracks,
  programSlug,
  onStudentAdded,
}: {
  tracks: Track[];
  programSlug: string;
  onStudentAdded: (s: StudentRow) => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"student" | "instructor" | "admin">("student");
  const [course, setCourse] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setDone(false);
    startTransition(async () => {
      try {
        const result = await addStudentAction({
          email: email.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role,
          cohort_id: null,
        });
        const student = result.student as StudentRow;
        if (course) await assignStudentTrack(student.id, course, programSlug);
        onStudentAdded(student);
        setEmail("");
        setFirstName("");
        setLastName("");
        setRole("student");
        setCourse("");
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add person.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-[12px] text-ink-soft">
        Create an account now — no invite link needed. Good for an instructor,
        admin, or someone you&apos;re adding by hand.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="First name">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={fieldInput} />
        </Field>
        <Field label="Last name">
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={fieldInput} />
        </Field>
      </div>
      <Field label="Email">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldInput} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className={fieldInput}>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label="Course (optional)">
          <select value={course} onChange={(e) => setCourse(e.target.value)} className={fieldInput}>
            <option value="">No course yet</option>
            {tracks.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.shortName || t.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending || !email.trim()} className={buttonClass("dark", "sm")}>
          {pending ? <Loader2 size={12} className="animate-spin" /> : null}
          {pending ? "Adding…" : "Add person"}
        </button>
        {done && <span className="text-[12px] text-ink-soft">Added ✓</span>}
        {error && <span className="text-[12px] text-red-600">{error}</span>}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-ink-faint">
        {label}
      </span>
      {children}
    </label>
  );
}
