import type { CoursesAnalytics } from "./actions-courses";
import { StatCard } from "@/components/stats/stat-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { METRIC_DEFS } from "@/lib/analytics/metric-defs";
import { COBALT_FAMILY } from "@/components/stats/palette";

// Courses & Progress — Circle's "Courses" analytics layout, in the BCC visual
// language: three headline cards, a completion-distribution donut, and the
// popular-courses + active-students tables. Presentational; fed by
// getCoursesAnalytics. Current-state metrics (enrollments, completions, rate)
// carry no period delta by design — we don't store the history to compute one.

// Distribution palette: an ordinal cobalt ramp (pale → strong) from the shared
// COBALT_FAMILY tokens, so more-complete buckets read as stronger cobalt and the
// whole scale reads as one hue — never the rainbow Circle uses. The "finished"
// bucket gets the brand electric green as a marker.
const DIST_COLORS: Record<string, string> = {
  "0%": COBALT_FAMILY[5], // pale cobalt
  "1–25%": COBALT_FAMILY[4], // slate
  "26–75%": COBALT_FAMILY[1], // cobalt light
  "76–99%": COBALT_FAMILY[0], // cobalt — primary
  "100%": "var(--highlight)", // electric green marker
};

export function CoursesDashboard({ data }: { data: CoursesAnalytics }) {
  const totalEnrolledPairs = data.distribution.reduce((n, d) => n + d.value, 0);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          value={data.totalEnrolled.toLocaleString()}
          label="Course enrollments"
          info={METRIC_DEFS.courseEnrollments}
        />
        <StatCard
          value={data.totalCompleted.toLocaleString()}
          label="Course completions"
          info={METRIC_DEFS.courseCompletions}
        />
        <StatCard
          value={`${data.overallCompletionRate}%`}
          label="Completion rate"
          info={METRIC_DEFS.completionRate}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutChart
          title="Completion distribution"
          segments={data.distribution.map((d) => ({
            label: d.label,
            value: d.value,
            color: DIST_COLORS[d.label] ?? COBALT_FAMILY[1],
          }))}
          centerValue={totalEnrolledPairs.toLocaleString()}
          centerLabel="Enrolled"
        />

        <div className="panel overflow-hidden p-5">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
            Popular courses
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="pb-2 pr-3 font-semibold">Course</th>
                  <th className="pb-2 px-2 text-right font-semibold">Enroll.</th>
                  <th className="pb-2 px-2 text-right font-semibold">Started</th>
                  <th className="pb-2 px-2 text-right font-semibold">Done</th>
                  <th className="pb-2 pl-2 text-right font-semibold">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.popularCourses.map((c) => (
                  <tr key={c.slug} className="border-t border-rule/70">
                    <td className="py-2 pr-3 text-ink">{c.name}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-ink">{c.enrolled}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-ink-soft">{c.started}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-ink-soft">{c.completed}</td>
                    <td className="py-2 pl-2 text-right tabular-nums text-ink">{c.completionRate}%</td>
                  </tr>
                ))}
                {data.popularCourses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-ink-faint">
                      No courses with enrollments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Active students
        </h2>
        <div className="overflow-x-auto rounded-lg border border-rule">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="px-3 py-2 font-semibold">Student</th>
                <th className="px-3 py-2 text-right font-semibold">Lessons</th>
                <th className="px-3 py-2 text-right font-semibold">Started</th>
                <th className="px-3 py-2 text-right font-semibold">Completed</th>
                <th className="px-3 py-2 text-right font-semibold">Completion</th>
                <th className="px-3 py-2 text-right font-semibold">Last active</th>
              </tr>
            </thead>
            <tbody>
              {data.activeStudents.map((s) => (
                <tr key={s.email} className="border-b border-rule/60 last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{s.name || s.email}</div>
                    {s.name && <div className="text-xs text-ink-faint">{s.email}</div>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">{s.lessons}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-soft">{s.started}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-soft">{s.completed}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">{s.completionPct}%</td>
                  <td className="px-3 py-2 text-right text-ink-soft">{s.lastActive ?? "—"}</td>
                </tr>
              ))}
              {data.activeStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-ink-faint">
                    No active students in this window yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] leading-relaxed text-ink-faint">
          Progress uses furthest week reached (attendance, submissions, reflections,
          or lessons watched) over course length. Learners marked complete count as 100%.
        </p>
      </section>
    </div>
  );
}
