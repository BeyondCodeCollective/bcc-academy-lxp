"use client";

import { useEffect, useMemo, useState } from "react";
import { Medal as Award, Check, Copy, ArrowSquareOut as ExternalLink, CircleNotch as Loader2, Envelope as Mail } from "@phosphor-icons/react";
import {
  getCertificateEligibility,
  getTrackCompletions,
  issueCertificate,
  issueCertificatesBulk,
  resendCertificateEmail,
  sendCertificateEmailsBulk,
  revokeCompletion,
  type TrackCompletionRow,
  type CertificateEligibility,
} from "./actions-misc";
import { buttonClass } from "@/components/ui";
import { UndoBar } from "@/components/undo-bar";

type StudentRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

// Per-track certificate issuing. Lists the roster with issued/not-issued
// state; per-student issue + bulk "issue to everyone" (the end-of-camp move).
// Issuing emails the family the public certificate link automatically.
export function CertificatesPanel({
  students,
  trackSlug,
  programSlug,
  viewSwitcher,
}: {
  students: StudentRow[];
  trackSlug: string;
  programSlug: string;
  viewSwitcher?: React.ReactNode;
}) {
  const [completions, setCompletions] = useState<TrackCompletionRow[] | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ studentId: string; name: string } | null>(null);
  const [eligibility, setEligibility] = useState<CertificateEligibility | null>(null);
  // Off by default: most issuing now is backfill for courses that already
  // ended, and an email can't be unsent. Turning it on is one click; undoing a
  // send to 58 families is impossible.
  const [sendEmail, setSendEmail] = useState(false);

  useEffect(() => {
    let alive = true;
    getTrackCompletions(trackSlug, programSlug)
      .then((rows) => { if (alive) setCompletions(rows); })
      .catch(() => { if (alive) setCompletions([]); });
    getCertificateEligibility(trackSlug, programSlug)
      .then((e) => { if (alive) setEligibility(e); })
      .catch(() => { if (alive) setEligibility({ sessionsHeld: 0, attended: {} }); });
    return () => { alive = false; };
  }, [trackSlug, programSlug]);

  const byStudent = useMemo(
    () => new Map((completions ?? []).map((c) => [c.student_id, c])),
    [completions],
  );
  const unissued = students.filter((s) => !byStudent.has(s.id));

  const setStudentBusy = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });

  const refresh = () =>
    getTrackCompletions(trackSlug, programSlug).then(setCompletions).catch(() => {});

  async function issueOne(studentId: string) {
    setStudentBusy(studentId, true);
    setNotice(null);
    try {
      const res = await issueCertificate(studentId, trackSlug, programSlug, {
        skipEmail: !sendEmail,
      });
      if (!res.success) setNotice(`Could not issue: ${res.error}`);
      else if (res.success && sendEmail && !res.emailed && !res.alreadyIssued)
        setNotice("Certificate issued — the email failed, use “Email again”.");
      await refresh();
    } finally {
      setStudentBusy(studentId, false);
    }
  }

  async function issueAll() {
    if (unissued.length === 0) return;
    const ok = window.confirm(
      `Issue certificates to ${unissued.length} student${unissued.length === 1 ? "" : "s"}? ` +
      (sendEmail
        ? "Each family gets an email with their certificate link."
        : "No emails will be sent — certificates are recorded only."),
    );
    if (!ok) return;
    setBulkRunning(true);
    setNotice(null);
    try {
      const res = await issueCertificatesBulk(
        unissued.map((s) => s.id),
        trackSlug,
        programSlug,
        { skipEmail: !sendEmail },
      );
      setNotice(
        `Issued ${res.issued}` +
        (sendEmail ? ` · emailed ${res.emailed}` : " · no emails sent") +
        (res.skipped ? ` · already had one: ${res.skipped}` : "") +
        (res.failed.length ? ` · FAILED: ${res.failed.length} (retry with Issue all)` : ""),
      );
      await refresh();
    } catch (e) {
      setNotice(`Bulk issue failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBulkRunning(false);
    }
  }

  // "Issue now, tell people later" — the send half. Goes to everyone holding a
  // certificate for this course, so it's also the retry when a batch of emails
  // failed the first time.
  async function emailAllIssued() {
    const holders = students.filter((s) => byStudent.has(s.id));
    if (holders.length === 0) return;
    const ok = window.confirm(
      `Email ${holders.length} famil${holders.length === 1 ? "y" : "ies"} their certificate link? ` +
      `This sends now and can't be undone.`,
    );
    if (!ok) return;
    setBulkRunning(true);
    setNotice(null);
    try {
      const res = await sendCertificateEmailsBulk(
        holders.map((s) => s.id),
        trackSlug,
        programSlug,
      );
      setNotice(
        `Emailed ${res.sent}` +
        (res.failed.length ? ` · FAILED: ${res.failed.length} (run again to retry)` : ""),
      );
    } catch (e) {
      setNotice(`Bulk email failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBulkRunning(false);
    }
  }

  async function resendOne(studentId: string) {
    setStudentBusy(studentId, true);
    setNotice(null);
    try {
      const res = await resendCertificateEmail(studentId, trackSlug, programSlug);
      setNotice(res.success ? "Email sent." : `Email failed: ${res.error}`);
    } finally {
      setStudentBusy(studentId, false);
    }
  }

  // Revoking is reversible — re-issuing restores the certificate — so it happens
  // immediately with an Undo instead of a blocking confirm. The re-issue on Undo
  // passes skipEmail: undoing a mistake must not mail the family twice.
  async function revokeOne(studentId: string, name: string) {
    setStudentBusy(studentId, true);
    setUndo(null);
    try {
      await revokeCompletion(studentId, trackSlug, programSlug);
      setUndo({ studentId, name });
      await refresh();
    } catch (e) {
      setNotice(`Could not revoke: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setStudentBusy(studentId, false);
    }
  }

  function copyLink(certificateId: string) {
    void navigator.clipboard
      .writeText(`${window.location.origin}/certificate/${certificateId}`)
      .then(() => {
        setCopiedId(certificateId);
        setTimeout(() => setCopiedId(null), 1600);
      });
  }

  const issuedCount = byStudent.size;

  // Attendance decides the order: for a short camp, the people who came every
  // day should be the first names you see, not whoever enrolled first.
  const sessionsHeld = eligibility?.sessionsHeld ?? 0;
  const attendedBy = (id: string) => eligibility?.attended[id] ?? 0;
  const rosterInOrder = useMemo(() => {
    if (sessionsHeld === 0) return students;
    return [...students].sort((a, b) => attendedBy(b.id) - attendedBy(a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, eligibility, sessionsHeld]);

  // Never say "0 eligible" when attendance was simply never logged — Tech+ and
  // MASS ran off-platform, and their learners genuinely finished. Unknown and
  // zero are different answers, and only one of them should give you pause.
  const fullAttendance = students.filter(
    (s) => sessionsHeld > 0 && attendedBy(s.id) === sessionsHeld,
  ).length;
  const eligibilityLine =
    eligibility === null
      ? null
      : sessionsHeld === 0
        ? "No attendance logged for this course — issue based on what you know."
        : `${fullAttendance} of ${students.length} attended all ${sessionsHeld} session${sessionsHeld === 1 ? "" : "s"}.`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {viewSwitcher}
          <p className="text-sm text-ink-soft">
            {completions === null
              ? "Loading…"
              : `${issuedCount} of ${students.length} issued`}
          </p>
          {eligibilityLine && (
            <p className="text-xs text-ink-faint">{eligibilityLine}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-ink-soft">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="h-3.5 w-3.5 accent-neutral-900"
            />
            Email families
          </label>
        <button
          onClick={issueAll}
          disabled={bulkRunning || completions === null || unissued.length === 0}
          className={buttonClass("dark", "sm")}
        >
          {bulkRunning ? (
            <><Loader2 size={13} className="animate-spin" /> Issuing…</>
          ) : (
            <><Award size={13} /> Issue all ({unissued.length})</>
          )}
        </button>
        {issuedCount > 0 && (
          <button
            onClick={emailAllIssued}
            disabled={bulkRunning}
            title="Send the certificate email to everyone who already has one"
            className={buttonClass("secondary", "sm")}
          >
            <Mail size={13} /> Email all ({issuedCount})
          </button>
        )}
        </div>
      </div>

      {notice && (
        <p className="panel px-4 py-2.5 text-sm text-ink" role="status">{notice}</p>
      )}

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule-soft text-left text-micro font-semibold uppercase tracking-[0.16em] text-ink-faint">
              <th className="px-4 py-3">Student</th>
              {sessionsHeld > 0 && <th className="px-4 py-3">Attended</th>}
              <th className="px-4 py-3">Certificate</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rosterInOrder.map((s) => {
              const completion = byStudent.get(s.id);
              const name = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.email;
              const isBusy = busy.has(s.id);
              return (
                <tr key={s.id} className="border-b border-rule-soft last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{name}</p>
                    <p className="text-xs text-ink-faint">{s.email}</p>
                  </td>
                  {sessionsHeld > 0 && (
                    <td className="px-4 py-3 tabular-nums text-ink-soft">
                      {attendedBy(s.id)}/{sessionsHeld}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {completion ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-micro font-semibold text-green-700">
                        <Check size={11} />
                        Issued{" "}
                        {new Date(completion.completed_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {isBusy ? (
                        <Loader2 size={14} className="animate-spin text-ink-faint" />
                      ) : completion ? (
                        <>
                          <a
                            href={`/certificate/${completion.certificate_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View certificate"
                            className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-paper-tint hover:text-ink"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            onClick={() => copyLink(completion.certificate_id)}
                            title="Copy public link"
                            className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-paper-tint hover:text-ink"
                          >
                            {copiedId === completion.certificate_id ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                          <button
                            onClick={() => resendOne(s.id)}
                            title="Email the certificate link again"
                            className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-paper-tint hover:text-ink"
                          >
                            <Mail size={14} />
                          </button>
                          <button
                            onClick={() => revokeOne(s.id, name)}
                            className="rounded-lg px-2 py-1 text-micro font-medium text-ink-faint transition-colors hover:bg-paper-tint hover:text-red-600"
                          >
                            Revoke
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => issueOne(s.id)}
                          className={buttonClass("secondary", "sm")}
                        >
                          <Award size={13} /> Issue
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-ink-faint">
                  No students enrolled in this course yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-faint">
        Issuing creates the student&apos;s public certificate page and emails the family the
        link. Re-issuing is safe — a student only ever has one certificate per course.
      </p>

      {undo && (
        <UndoBar
          message={`Revoked ${undo.name}'s certificate — their link stopped working.`}
          onUndo={async () => {
            const res = await issueCertificate(undo.studentId, trackSlug, programSlug, {
              skipEmail: true,
            });
            if (!res.success) throw new Error(res.error ?? "unknown error");
            await refresh();
          }}
          onDismiss={() => setUndo(null)}
        />
      )}
    </div>
  );
}
