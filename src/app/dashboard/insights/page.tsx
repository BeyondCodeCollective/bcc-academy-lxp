import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { isEngaged, isActiveWithin } from "@/lib/analytics/engagement";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";
import { getProgram } from "@/lib/programs/server";
import { resolveProgramScope } from "@/lib/programs/scope";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { OutcomesDashboard } from "@/app/dashboard/admin/outcomes/outcomes-dashboard";
import { getInsightsBundle } from "@/lib/analytics/insights-cache";
import { StatCard } from "@/components/stats/stat-card";
import { COBALT_FAMILY } from "@/components/stats/palette";
import { formatRelativeDate, humanizeSlug } from "@/lib/utils";
import { microLabel } from "@/components/ui";

// Program context comes from a cookie/header (super-admin switcher), so the URL
// is identical across programs — the page must re-render per request or a cached
// render would show one program's data for all of them.
export const dynamic = "force-dynamic";

// Super-admin analytics dashboard. Cross-program metrics computed from
// students / attendance / submissions / reflections / alumni_enrollments.
// The sibling "Survey Insights" tab (under Admin) handles survey responses
// specifically; this is the broader operational view: who's enrolled, who's
// active this week, how engagement breaks down by track.
export default async function InsightsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  const role = ctx.student?.role ?? "";
  if (!canSwitchPrograms(role)) redirect("/dashboard");
  // Previewing as a student → no cross-program analytics.
  if (await isPreviewingAsStudent(role)) redirect("/dashboard");

  // Scope everything to the program in context (domain / super-admin switcher).
  // Catalyst aggregates its underlying programs; other programs scope to self.
  const program = await getProgram();
  const scope = await resolveProgramScope(program.slug);

  const {
    insights: {
      allStudents,
      studentTracks,
      alumni,
      recentSubmissions,
      recentReflections,
      activeAttendance,
      activeSubmissions,
      activeReflections,
      engagedAttendance,
      engagedSubmissions,
      engagedReflections,
      engagedVideo,
    },
    outcomes,
    progress,
    acquisition,
  } = await getInsightsBundle(scope);

  const namesById = new Map(
    allStudents.map((s) => [
      s.id,
      [s.first_name, s.last_name].filter(Boolean).join(" ").trim() || "Anonymous",
    ]),
  );

  // Merge submissions + reflections, sort by recency, take the top 10.
  type ActivityItem = {
    id: string;
    kind: "submission" | "reflection";
    student_name: string;
    track_slug: string;
    week_number: number;
    submitted_at: string;
  };
  const activity: ActivityItem[] = [
    ...recentSubmissions.map((s) => ({
      id: `s:${s.id}`,
      kind: "submission" as const,
      student_name: namesById.get(s.student_id) ?? "Unknown",
      track_slug: s.track_slug,
      week_number: s.week_number,
      submitted_at: s.submitted_at as string,
    })),
    ...recentReflections.map((r) => ({
      id: `r:${r.id}`,
      kind: "reflection" as const,
      student_name: namesById.get(r.student_id) ?? "Unknown",
      track_slug: r.track_slug,
      week_number: r.week_number,
      submitted_at: r.submitted_at as string,
    })),
  ]
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
    .slice(0, 10);

  const students = allStudents.filter((s) => s.role === "student");
  const totalStudents = students.length;
  // Gate every downstream count to real learners — enrollment/activity rows for
  // staff or QA accounts must never inflate active/per-track/phase totals.
  const studentIds = new Set(students.map((s) => s.id));

  // Active in last 7 days — computed from date-filtered narrow queries.
  // Previously scanned the ENTIRE attendance/submissions/reflections table
  // and filtered dates in JS. Now the database handles the date filter,
  // so only matching rows are transferred.
  const nowMs = Date.now();
  const activeIds = new Set<string>();
  for (const r of activeAttendance) if (studentIds.has(r.student_id)) activeIds.add(r.student_id);
  for (const r of activeSubmissions) if (studentIds.has(r.student_id)) activeIds.add(r.student_id);
  for (const r of activeReflections) if (studentIds.has(r.student_id)) activeIds.add(r.student_id);
  // Behavior beyond a graded event counts too: last_activity_at advances on
  // any dashboard visit (watching, reading, navigating). Login alone does not
  // — last_seen_at is stamped at signup, so folding it in made a freshly
  // enrolled cohort read 100% active and contradicted this tile's own hint.
  for (const s of students) {
    const act = s.last_activity_at ? new Date(s.last_activity_at).getTime() : undefined;
    if (isActiveWithin(act, 7, nowMs)) activeIds.add(s.id);
  }
  const activeCount = activeIds.size;

  // Engaged ever — canonical isEngaged: attendance OR video OR submission OR
  // reflection (video was previously omitted here).
  const engAttended = new Set(engagedAttendance.map((r) => r.student_id));
  const engSubmitted = new Set(engagedSubmissions.map((r) => r.student_id));
  const engReflected = new Set(engagedReflections.map((r) => r.student_id));
  const engWatched = new Set((engagedVideo as { user_id: string }[]).map((r) => r.user_id));
  const studentsEngaged = students.filter((s) =>
    isEngaged({
      attended: engAttended.has(s.id),
      submitted: engSubmitted.has(s.id),
      reflected: engReflected.has(s.id),
      watched: engWatched.has(s.id),
    }),
  ).length;
  const engagementPct =
    totalStudents > 0
      ? Math.round((studentsEngaged / totalStudents) * 100)
      : 0;

  // Alumni: dedupe across multiple enrollments by email. One person enrolled
  // in N historical tracks counts as one alum.
  const uniqueAlumni = new Set(
    alumni.map((a) => (a.email || "").toLowerCase()).filter(Boolean),
  );

  // Catalyst is the umbrella now, so "students by program" would always be
  // a single-segment donut. The meaningful axis is **phase** — Foundation
  // (e.g. MASS), Core (technical tracks), Workshops (single-event), Exit.
  const scopedTracks = program.tracks ?? [];
  const trackNameBySlug = new Map(
    scopedTracks.map((t) => [t.slug, t.shortName || t.name]),
  );
  const phaseBySlug = new Map(
    scopedTracks.map((t) => [t.slug, t.phase ?? "other"]),
  );

  // Per-track student counts (distinct students). Used for the track bar
  // chart and as the source for phase aggregation below.
  const trackStudentSet = new Set<string>();
  const trackPairs = new Map<string, Set<string>>();
  for (const r of studentTracks) {
    if (!r.student_id || !r.track_slug) continue;
    // Staff/QA enrollments must not count toward per-track or phase totals.
    if (!studentIds.has(r.student_id)) continue;
    const pair = `${r.student_id}::${r.track_slug}`;
    if (trackStudentSet.has(pair)) continue;
    trackStudentSet.add(pair);
    const set = trackPairs.get(r.track_slug) ?? new Set<string>();
    set.add(r.student_id);
    trackPairs.set(r.track_slug, set);
  }
  const trackData = Array.from(trackPairs.entries())
    .map(([slug, set]) => ({
      label: trackNameBySlug.get(slug) ?? slug,
      value: set.size,
    }))
    .sort((a, b) => b.value - a.value);

  // Phase rollup. Dedupe (student, phase) so a student in two core tracks
  // counts once toward Core, not twice.
  const PHASE_LABELS: Record<string, string> = {
    foundation: "Foundation",
    core: "Core",
    workshop: "Workshops",
    exit: "Exit",
  };
  const PHASE_ORDER = ["foundation", "core", "workshop", "exit"];
  const studentPhasePairs = new Set<string>();
  for (const r of studentTracks) {
    if (!r.student_id || !r.track_slug) continue;
    const phase = phaseBySlug.get(r.track_slug) ?? "other";
    studentPhasePairs.add(`${r.student_id}::${phase}`);
  }
  const phaseCounts = new Map<string, number>();
  for (const pair of studentPhasePairs) {
    const phase = pair.split("::")[1];
    phaseCounts.set(phase, (phaseCounts.get(phase) ?? 0) + 1);
  }
  const phaseData = Array.from(phaseCounts.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => {
      const ai = PHASE_ORDER.indexOf(a.key);
      const bi = PHASE_ORDER.indexOf(b.key);
      return (ai === -1 ? PHASE_ORDER.length : ai) - (bi === -1 ? PHASE_ORDER.length : bi);
    });

  // Phases are categorical — distinguished by cobalt lightness, not by hue.
  const phaseSegments = phaseData.map((d, i) => ({
    label: PHASE_LABELS[d.key] ?? d.key,
    value: d.value,
    color: COBALT_FAMILY[i % COBALT_FAMILY.length],
  }));
  // Only render the donut when it's actually informative (2+ phases). With
  // one segment it collapses to a thick ring that adds noise without insight.
  const showPhaseDonut = phaseSegments.length >= 2;

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Overview
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {program.slug === "catalyst"
              ? "Across all Catalyst programs."
              : `${program.name} — learning, completion, and engagement.`}
          </p>
        </div>
        <Link
          href="/dashboard/admin?tab=insights"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Surveys
          <ArrowRight size={11} weight="bold" />
        </Link>
      </header>

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          value={totalStudents.toLocaleString()}
          label="Students"
          hint="enrolled"
        />
        <StatCard
          value={activeCount.toLocaleString()}
          label="Active 7d"
          hint="attendance, submission, reflection, or any dashboard activity"
        />
        <StatCard
          value={`${engagementPct}%`}
          label="Engaged ever"
          hint={`${studentsEngaged.toLocaleString()} of ${totalStudents.toLocaleString()}`}
        />
        <StatCard
          value={uniqueAlumni.size.toLocaleString()}
          label="Alumni"
          hint="unique by email"
        />
      </div>

      {/* Learning outcomes, completion, and acquisition/risk — the analytics
         that turn this page from headcounts into the "are they learning,
         finishing, and engaged?" story. */}
      <OutcomesDashboard data={{ outcomes, progress, acquisition }} />

      {/* Composition row — phase donut + per-track counts side by side.
         Full-width, a lone donut put the ring far left and its numbers far
         right with a field of nothing between. */}
      <div className="grid gap-3 lg:grid-cols-2">
        {showPhaseDonut && (
          <DonutChart
            title="Students by phase"
            segments={phaseSegments}
            centerValue={totalStudents.toLocaleString()}
            centerLabel="students"
          />
        )}
        <HorizontalBarChart
          title="Students per track"
          data={trackData}
          barClass="bg-primary"
          unit="students"
          totalCaption={{
            value: trackPairs.size,
            label: `track${trackPairs.size === 1 ? "" : "s"}`,
          }}
        />
      </div>

      {/* Recent activity — the feed that used to live on the Admin Overview
         tab. Cross-program, latest 10 submissions + reflections. */}
      <section className="space-y-3">
        <p className={microLabel}>
          Recent activity
        </p>
        <div className="divide-y divide-neutral-100 overflow-hidden panel">
          {activity.length === 0 ? (
            <p className="p-4 text-sm text-ink-soft">
              No submissions or reflections yet.
            </p>
          ) : (
            activity.map((item) => {
              const ago = formatRelativeDate(item.submitted_at);
              const trackName =
                trackNameBySlug.get(item.track_slug) ?? humanizeSlug(item.track_slug);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {item.student_name}
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {item.kind === "submission"
                        ? "Submitted homework"
                        : "Added reflection"}{" "}
                      — {trackName} Week {item.week_number}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-faint">
                    {ago}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

