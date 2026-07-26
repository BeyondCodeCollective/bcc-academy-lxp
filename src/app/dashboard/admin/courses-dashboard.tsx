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
          hint={data.totalCompleted === 0 ? "None yet — cohorts still mid-course" : undefined}
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
            color: DIST_COLORS[d.label] ?? COBALT_RAMP[2],
          }))}
          centerValue={totalEnrolledPairs.toLocaleString()}
          centerLabel="Enrolled"
        />

        <div className="panel overflow-hidden p-5">
          <p className={`mb-4 ${microLabel}`}>
            Popular courses
          </p>
          <DataTable
            columns={[
              "Course",
              { label: "Enroll.", align: "right" },
              { label: "Started", align: "right" },
              { label: "Done", align: "right" },
              { label: "Rate", align: "right" },
            ]}
          >
            {data.popularCourses.map((c) => (
              <tr key={c.slug}>
                <td className="px-4 py-2.5 text-ink">{c.name}</td>
                <td className="px-4 py-2.5 text-right"><Num value={c.enrolled} /></td>
                <td className="px-4 py-2.5 text-right"><Num value={c.started} /></td>
                <td className="px-4 py-2.5 text-right"><Num value={c.completed} /></td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink">{c.completionRate}%</td>
              </tr>
            ))}
            {data.popularCourses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-faint">
                  No courses with enrollments yet.
                </td>
              </tr>
            )}
          </DataTable>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className={microLabel}>
          Active students
        </h2>
        <DataTable
          columns={[
            "Student",
            { label: "Lessons", align: "right" },
            { label: "Started", align: "right" },
            { label: "Completed", align: "right" },
            { label: "Completion", align: "right" },
            { label: "Last active", align: "right" },
          ]}
        >
          {data.activeStudents.map((s) => (
            <tr key={s.email}>
              <td className="px-4 py-2.5">
                <PersonCell name={s.name || null} email={s.email} />
              </td>
              <td className="px-4 py-2.5 text-right"><Num value={s.lessons} /></td>
              <td className="px-4 py-2.5 text-right"><Num value={s.started} /></td>
              <td className="px-4 py-2.5 text-right"><Num value={s.completed} /></td>
              <td className="px-4 py-2.5 text-right tabular-nums text-ink">{s.completionPct}%</td>
              <td className="px-4 py-2.5 text-right text-ink-soft">{formatShortDate(s.lastActive)}</td>
            </tr>
          ))}
          {data.activeStudents.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-ink-faint">
                No active students in this window yet.
              </td>
            </tr>
          )}
        </DataTable>
        <p className="text-[11px] leading-relaxed text-ink-faint">
          Progress uses furthest week reached (attendance, submissions, reflections,
          or lessons watched) over course length. Learners marked complete count as 100%.
        </p>
      </section>
    </div>
  );
}
