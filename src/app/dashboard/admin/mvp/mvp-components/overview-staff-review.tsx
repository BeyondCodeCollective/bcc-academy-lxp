import type { MvpDashboardData, MvpAttentionReason } from "@/lib/mvp/types";

// Labels describe only supported evidence; missed sessions are not assumed
// consecutive, and configured progress is not a universal module threshold.
const reasonLabels: Record<MvpAttentionReason, string> = {
  missed_sessions: "with two or more confirmed missed sessions",
  missing_required_submission: "with required work missing after the grace period",
  low_assessment: "below the configured assessment threshold",
  behind_expected_progress: "below the configured progress threshold after its deadline",
};

export function OverviewStaffReview({ data }: { data: MvpDashboardData["staffReview"] }) {
  const courses = data?.flaggedCourses ?? [];
  const programCount = new Set(courses.map(course => course.programId)).size;

  return <section className="panel min-w-0 p-5 sm:p-6" aria-label="Requires staff review">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-ink">Requires staff review</h2>
        {data && <p className="mt-2 text-sm text-ink-soft">
          {programCount} {programCount === 1 ? "program" : "programs"} · {courses.length} flagged {courses.length === 1 ? "course" : "courses"}
        </p>}
      </div>
      {courses.length > 0 && <span className="rounded-md bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Attention</span>}
    </header>
    {courses.length > 0 ? <ul className="mt-5 space-y-3">
      {courses.map(course => <li key={course.id} className="min-w-0 break-words rounded-lg border border-rule border-l-4 border-l-amber-500 bg-white p-4">
        <h3 className="text-sm font-semibold text-[#1448CC]">{course.programName}</h3>
        <p className="mt-1 text-xs text-ink-soft">{[course.cohortName, course.courseName ?? course.courseSlug].filter(Boolean).join(" · ")}</p>
        <p className="mt-3 text-sm font-medium text-ink">{course.verifiedLearnerCount} {course.verifiedLearnerCount === 1 ? "learner" : "learners"} flagged</p>
        <ul className="mt-2 space-y-2 text-sm text-ink">
          {course.reasons.map(item => <li key={item.reason}>
            {item.learnerCount} {item.learnerCount === 1 ? "learner" : "learners"} {reasonLabels[item.reason]}.
          </li>)}
        </ul>
        {!course.evaluationComplete && <span className="mt-3 inline-block rounded bg-black/5 px-2 py-1 text-xs text-ink-soft">Evaluation incomplete</span>}
      </li>)}
    </ul> : <p className="mt-5 text-sm text-ink-soft">{data ? "No verified flags in this selection." : "Staff review unavailable."}</p>}
    {data && data.incompleteCourseCount > 0 && <p className="mt-4 border-t border-rule pt-4 text-xs text-ink-soft">
      Evaluation incomplete for {data.incompleteCourseCount} {data.incompleteCourseCount === 1 ? "course" : "courses"}.
    </p>}
  </section>;
}
