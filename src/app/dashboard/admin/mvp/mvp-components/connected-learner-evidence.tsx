"use client";

import { useEffect, useState } from "react";
import type { LearnerFilters } from "./learner-filters";
import { startLearnerRequest } from "./learner-request";
import { LearnerAttendanceHistory } from "./learner-attendance-history";
import { LearnerMilestoneHistory } from "./learner-milestone-history";
import { LearnerFlagEvidence } from "./learner-flag-evidence";
import { currentEvidenceResult, type EvidenceResponse } from "./learner-evidence-response";

// Mounted only by an open drawer. Each open/retry reads fresh evidence; closing
// or changing scope cancels delivery of late responses, not the server work.
export function ConnectedLearnerEvidence({ learnerId, filters }: { learnerId: string; filters: LearnerFilters }) {
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([learnerId, filters, retry]);
  const [response, setResponse] = useState<EvidenceResponse | null>(null);
  useEffect(() => {
    const [id, scope] = JSON.parse(key) as [string, LearnerFilters, number];
    return startLearnerRequest(async () => {
      const { loadMvpLearnerEvidence } = await import("../learner-evidence-actions");
      return loadMvpLearnerEvidence(id, scope);
    },
      result => setResponse({ key, result }),
      () => setResponse({ key, result: { state: "error" } }));
  }, [key]);
  const result = currentEvidenceResult(response, key, learnerId, filters);
  if (!result) return <p role="status" aria-busy="true">Loading authorized evidence…</p>;
  if (result.state !== "ready" || result.evidence.id !== learnerId) return <div>
    <p role={result.state === "error" ? "alert" : "status"}>{result.state === "error" ? "Unable to load evidence. Check your connection and access." : "Evidence unavailable in the current scope."}</p>
    <button type="button" className="mt-4 min-h-11 rounded-lg border border-rule px-4 py-2" onClick={() => setRetry(value => value + 1)}>Retry loading evidence</button>
  </div>;
  return <div className="space-y-4">
    <p role="status" className="text-sm text-ink-soft">Authorized evidence loaded. Private submission and reflection content is excluded.</p>
    {result.evidence.enrollments.map(course => <section key={JSON.stringify([course.programId, course.courseSlug])} className="rounded-xl border border-rule p-4">
      <h3 className="font-semibold">{course.courseName} · {course.programName}</h3>
      <p>{{ not_evaluated: "Not evaluated", needs_check_in: "Needs Check-In", on_track: "On Track" }[course.status]}</p>
      <LearnerAttendanceHistory sessions={course.attendanceSessions} unavailableReason={course.attendanceUnavailableReason} />
      <LearnerMilestoneHistory weeks={course.weeklyMilestones} />
      <LearnerFlagEvidence checkIn={course.checkIn} />
    </section>)}
  </div>;
}
