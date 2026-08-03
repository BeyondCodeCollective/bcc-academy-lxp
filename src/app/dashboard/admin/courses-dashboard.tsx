import Link from "next/link";
import type { CoursesAnalytics } from "./actions-courses";
import { StatCard } from "@/components/stats/stat-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { METRIC_DEFS } from "@/lib/analytics/metric-defs";
import { COBALT_RAMP } from "@/components/stats/palette";
import { DataTable, microLabel, Num, PersonCell } from "@/components/ui";
import { formatShortDate } from "@/lib/utils";

// Courses & Progress — Circle's "Courses" analytics layout, in the BCC visual
// language: three headline cards, a completion-distribution donut, and the
// popular-courses + active-students tables. Presentational; fed by
// getCoursesAnalytics. Current-state metrics (enrollments, completions, rate)
// carry no period delta by design — we don't store the history to compute one.

// Distribution palette: the shared sequential cobalt ramp, so more-complete
// buckets read as stronger cobalt and this donut matches every other
// distribution in the app. The "finished" bucket gets the brand electric
// green as a marker.
const DIST_COLORS: Record<string, string> = {
  "0%": COBALT_RAMP[0],
  "1–25%": COBALT_RAMP[1],
  "26–75%": COBALT_RAMP[2],
  "76–99%": COBALT_RAMP[4],
  "100%": "var(--highlight)", // electric green marker
};

export function CoursesDashboard({ data }: { data: CoursesAnalytics }) {
  const totalEnrolledPairs = data.distribution.reduce((n, d) => n + d.value, 0);
  // Course format decides the column, not "did any single person watch one
  // thing" — a lone replay view used to force a wall of zeros onto a live
  // cohort. Videos watched is a VOD metric; it shows only where VOD courses run.
  const showVideosColumn =
    data.hasSelfPacedCourse && data.activeStudents.some((s) => s.lessons > 0);

  return (
    <div className="space-y-8">
      <section className={`grid grid-cols-1 gap-3 ${data.totalFinished > 0 ? "sm:grid-cols-3" : ""}`}>
        {/* Each figure is a question; the link is its answer. Enrollments →
           the people. Completions → the courses where certificates get
           issued, since completion is only ever recorded by issuing one. */}
        <StatCard
          value={data.totalEnrolled.toLocaleString()}
          label="Course enrollments"
          info={METRIC_DEFS.courseEnrollments}
          href="/dashboard/admin?tab=students"
        />
        {/* Finishing is a claim about the END of a course — while nobody has
           finished, a pair of zeros says nothing a mid-course cohort can act
           on, so the cards wait until the first learner gets there. */}
        {data.totalFinished > 0 && (
        <StatCard
          value={data.totalFinished.toLocaleString()}
          label="Finished the course"
          info={METRIC_DEFS.courseFinished}
          // One definition of "done" on this page: reached the end of the
          // content. Certificates are the follow-up act — surface the gap
          // between the two as the action it is, never as a contradiction
          // ("0 completions" above a table full of 100% rows).
          hint={
            data.totalFinished > 0 && data.certificatesIssued < data.totalFinished
              ? `${data.certificatesIssued} certificate${data.certificatesIssued === 1 ? "" : "s"} issued so far — issue the rest from the course's Students tab`
              : data.certificatesIssued > 0
                ? `${data.certificatesIssued} certificate${data.certificatesIssued === 1 ? "" : "s"} issued`
                : undefined
          }
        />
        )}
        {data.totalFinished > 0 && (
        <StatCard
          value={`${data.finishedRate}%`}
          label="Finish rate"
          info={METRIC_DEFS.finishedRate}
        />
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutChart
          title="Progress distribution"
          segments={data.distribution.map((d) => ({
            label: d.label,
            value: d.value,
            color: DIST_COLORS[d.label] ?? COBALT_RAMP[2],
          }))}
          centerValue={totalEnrolledPairs.toLocaleString()}
          centerLabel="Enrolled"
        />

        <div className="panel overflow-hidden p-5">
          <p className={`mb-2 ${microLabel}`}>
            Popular courses
          </p>
          {/* A list, not a table — a bordered table nested inside a bordered
             card reads as a box-in-a-box, and five columns in a half-width
             card squeezed course names onto four lines. */}
          <ul className="divide-y divide-rule-soft">
            {data.popularCourses.map((c) => (
              <li key={c.slug} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  {/* Course-first: the course's own numbers live in the course —
                     the name is the way down to them. */}
                  <Link
                    href={`/dashboard/admin?tab=${encodeURIComponent(c.slug)}&view=analytics`}
                    className="text-sm font-medium text-ink underline-offset-2 hover:text-primary hover:underline"
                  >
                    {c.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {c.enrolled} enrolled · {c.started} started · {c.finished} finished
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                  {c.finishedRate}%
                </span>
              </li>
            ))}
            {data.popularCourses.length === 0 && (
              <li className="py-6 text-center text-sm text-ink-faint">
                No courses with enrollments yet.
              </li>
            )}
          </ul>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className={microLabel}>
          Active students
        </h2>
        {/* "Videos watched" only exists for pre-recorded content; most cohorts
           run live sessions, so an all-zero column reads as broken — hide it
           unless someone has actually watched something. */}
        {/* One number per learner: how far through their course(s) they are.
           The old Started/Completed count columns restated the cards in a
           second vocabulary ("Completed 0" beside "Completion 100%") and were
           the single most confusing thing on the page. */}
        <DataTable
          columns={[
            "Student",
            ...(showVideosColumn ? [{ label: "Videos watched", align: "right" as const }] : []),
            { label: "Keeping up", align: "right" },
            { label: "Last active", align: "right" },
          ]}
        >
          {data.activeStudents.map((s) => (
            <tr key={s.email}>
              <td className="px-4 py-2.5">
                <PersonCell name={s.name || null} email={s.email} />
              </td>
              {showVideosColumn && (
                <td className="px-4 py-2.5 text-right"><Num value={s.lessons} /></td>
              )}
              <td className="px-4 py-2.5 text-right tabular-nums text-ink">{s.completionPct}%</td>
              <td className="px-4 py-2.5 text-right text-ink-soft">{formatShortDate(s.lastActive)}</td>
            </tr>
          ))}
          {data.activeStudents.length === 0 && (
            <tr>
              <td colSpan={showVideosColumn ? 4 : 3} className="px-4 py-8 text-center text-ink-faint">
                No active students in this window yet.
              </td>
            </tr>
          )}
        </DataTable>
        <p className="text-micro leading-relaxed text-ink-faint">
          Keeping up compares how far each learner has reached (attendance,
          submissions, reflections, or watched videos) against sessions held so
          far — 100% means fully caught up, whatever week the course is in.
          Certificates are issued separately, from the course&apos;s Students tab.
        </p>
      </section>
    </div>
  );
}
