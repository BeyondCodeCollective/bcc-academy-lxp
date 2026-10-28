"use client";

import { useEffect, useId, useRef } from "react";
import type { DirectoryLearner } from "./learner-directory";

// Metadata-only contract for a future authorized server loader. Never pass raw
// submission/reflection records, free-text review notes, or storage URLs here.
export type CourseEvidence = {
  attendance: null | { id: string; label: string; heldAt: string | null;
    outcome: "present" | "absent" | "excused" | "unknown";
    finalized: boolean; eligible: boolean; reviewedAt: string | null }[];
  milestones: null | { id: string; week: number;
    kind: "submission" | "reflection" | "marked_watched";
    recordedAt: string | null; dueAt: string | null; required: boolean }[];
  // Only server-evaluated flags belong here; lack of a record is not absence.
  flags: null | ({ kind: "verified_absences"; sessionIds: string[] } |
    { kind: "overdue_submission"; milestoneId: string; evaluatedAt: string })[];
};

function Timestamp({ value }: { value: string | null }) {
  if (!value || !Number.isFinite(Date.parse(value))) return <>Unavailable</>;
  const date = new Date(value);
  return <time dateTime={date.toISOString()}>{date.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</time>;
}

export function supportedFlagExplanations(evidence: CourseEvidence): string[] {
  return (evidence.flags ?? []).flatMap(flag => {
    if (flag.kind === "verified_absences") {
      const ids = [...new Set(flag.sessionIds)];
      const sessions = ids.map(id => evidence.attendance?.find(row => row.id === id));
      if (ids.length < 2 || sessions.some(row => !row || !row.finalized || !row.eligible || row.outcome !== "absent")) return [];
      return [`Verified absences: ${sessions.map(row => row!.label).join(", ")}.`];
    }
    if (flag.kind === "overdue_submission") {
      const row = evidence.milestones?.find(item => item.id === flag.milestoneId);
      if (!row || row.kind !== "submission" || !row.required || row.recordedAt || !row.dueAt || !(Date.parse(row.dueAt) < Date.parse(flag.evaluatedAt))) return [];
      return [`Required submission overdue: Week ${row.week}.`];
    }
    return [];
  });
}

export function LearnerEvidenceContent({ learner }: { learner: DirectoryLearner }) {
  return <div className="space-y-6">
    <p className="text-xs text-ink-soft">Only matching enrollments are shown. Times use Eastern Time. Private submission and reflection content is excluded.</p>
    {learner.enrollments.map(course => {
      const evidence = course.evidence;
      const reasons = evidence ? supportedFlagExplanations(evidence) : [];
      return <section key={`${course.programId}:${course.courseSlug}`} className="rounded-xl border border-rule p-4">
        <h3 className="text-lg font-semibold text-ink">{course.courseName}</h3>
        <p className="text-sm text-ink-soft">{course.programName}{course.cohort ? ` · ${course.cohort.name} (current cohort)` : ""}</p>
        <h4 className="mt-5 font-semibold">Flag explanations</h4>
        {reasons.length ? <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-amber-800">{reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : <p className="mt-2 text-sm text-ink-soft">{evidence?.flags?.length === 0 && course.status !== "needs_check_in" ? "No supported flags recorded. This does not establish that the learner is on track." : "Flag explanations unavailable or not evaluated."}</p>}
        <h4 className="mt-5 font-semibold">Attendance history</h4>
        <p className="mt-1 text-xs text-ink-soft">Unrecorded or unfinalized attendance is not a verified absence.</p>
        {evidence?.attendance == null ? <p className="mt-2 text-sm text-ink-soft">Attendance history unavailable.</p> : evidence.attendance.length === 0 ? <p className="mt-2 text-sm text-ink-soft">No session records in this scope.</p> : <ul className="mt-2 divide-y divide-rule">{evidence.attendance.map(session => <li key={session.id} className="py-3 text-sm">
          <p className="font-medium">{session.label}</p><p>Held: <Timestamp value={session.heldAt} /></p>
          <p>{!session.finalized ? "Not finalized" : ({ present: "Verified present", absent: "Verified absent", excused: "Excused", unknown: "Unrecorded / unknown" }[session.outcome] ?? "Unrecorded / unknown")}{!session.eligible ? " · Not eligible for attendance calculation" : ""}</p>
          <p className="text-xs text-ink-soft">Reviewed: <Timestamp value={session.reviewedAt} /></p>
        </li>)}</ul>}
        <h4 className="mt-5 font-semibold">Weekly milestone timestamps</h4>
        <p className="mt-1 text-xs text-ink-soft">Marked-watched is a recorded mark, not proof of viewing. Missing timestamps alone do not establish overdue work.</p>
        {evidence?.milestones == null ? <p className="mt-2 text-sm text-ink-soft">Milestone history unavailable.</p> : evidence.milestones.length === 0 ? <p className="mt-2 text-sm text-ink-soft">No milestone records in this scope.</p> : <ul className="mt-2 divide-y divide-rule">{evidence.milestones.map(item => <li key={item.id} className="py-3 text-sm">
          <p className="font-medium">Week {item.week} · {{ submission: "Submission", reflection: "Reflection", marked_watched: "Marked-watched video" }[item.kind]}</p>
          <p>{item.recordedAt ? <Timestamp value={item.recordedAt} /> : "No timestamp recorded"}</p>
          {item.dueAt && <p className="text-xs text-ink-soft">Due: <Timestamp value={item.dueAt} /></p>}
        </li>)}</ul>}
      </section>;
    })}
  </div>;
}

export function LearnerEvidenceDrawer({ learner, onClose }: { learner: DirectoryLearner; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current!;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    close.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);
  return <dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-person`} onCancel={event => { event.preventDefault(); onClose(); }}
    className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-2xl overflow-y-auto border-l border-rule bg-white p-0 text-ink shadow-2xl backdrop:bg-black/40">
    <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-rule bg-white p-5">
      <div><h2 id={`${id}-title`} className="text-xl font-semibold">Learner evidence</h2><p id={`${id}-person`} className="mt-1 break-words text-sm">{[learner.firstName, learner.lastName].filter(Boolean).join(" ") || "Name unavailable"}<span className="block break-all text-ink-soft">{learner.email || "Email unavailable"}</span></p></div>
      <button ref={close} type="button" onClick={onClose} className="min-h-11 rounded-lg border border-rule px-4 py-2 focus-visible:outline-2 focus-visible:outline-primary" aria-label="Close learner evidence">Close</button>
    </header>
    <div className="p-5"><LearnerEvidenceContent learner={learner} /></div>
  </dialog>;
}
