"use client";

import { useEffect, useState } from "react";
import type { LearnerFilters } from "./learner-filters";
import { startLearnerRequest } from "./learner-request";
import { LearnerAttendanceHistory } from "./learner-attendance-history";
import { LearnerMilestoneHistory } from "./learner-milestone-history";
import { LearnerFlagEvidence } from "./learner-flag-evidence";
import { currentEvidenceResult, type EvidenceResponse } from "./learner-evidence-response";

export function LearnerEvidenceRequestState({ state, onRetry }: {
  state: "loading" | "error" | "unavailable"; onRetry: () => void;
}) {
  return <section aria-label="Evidence request status" aria-busy={state === "loading"} className="rounded-lg border border-rule p-4">
    <div role={state === "error" ? "alert" : "status"} aria-atomic="true">
      <h3 className="font-semibold text-ink">{{ loading: "Loading authorized evidence…", error: "Unable to load evidence", unavailable: "Evidence unavailable" }[state]}</h3>
      <p className="mt-2 text-sm text-ink-soft">{{
        loading: "Checking access and loading fresh evidence for the selected learner. You can close the drawer or move to another selected learner while this loads.",
        error: "The request could not be completed. Check your connection and access, then try again. No previous evidence is being shown.",
        unavailable: "Evidence is not available for this learner in the current scope. Access or matching enrollments may have changed. This does not establish that there are no records or that the learner is on track.",
      }[state]}</p>
    </div>
    {state !== "loading" && <>
      <button type="button" className="mt-4 min-h-11 rounded-lg border border-rule px-4 py-2 text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-primary" onClick={onRetry}>Retry loading evidence</button>
      <p className="mt-2 text-xs text-ink-soft">Retry rechecks access using the same learner and filters. You can also close this drawer to refresh the directory or change filters.</p>
    </>}
  </section>;
}

// Mounted only by an open drawer. Each open/retry reads fresh evidence; closing
// or changing scope cancels delivery of late responses, not the server work.
export function ConnectedLearnerEvidence({ learnerId, filters }: { learnerId: string; filters: LearnerFilters }) {
  // Own the reset boundary: callers cannot accidentally retain resolved evidence
  // or retry state across selection/scope changes, including A → B → A.
  return <LearnerEvidenceRequest key={JSON.stringify([learnerId, filters])} learnerId={learnerId} filters={filters} />;
}

function LearnerEvidenceRequest({ learnerId, filters }: { learnerId: string; filters: LearnerFilters }) {
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
  if (!result || result.state !== "ready") return <LearnerEvidenceRequestState state={result?.state ?? "loading"} onRetry={() => setRetry(value => value + 1)} />;
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
