import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Lightning,
  GraduationCap,
  Pulse,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";
import { getProgram } from "@/lib/programs/server";
import { resolveProgramScope } from "@/lib/programs/scope";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { fetchAllInsightsData } from "@/lib/insights-data";
import { OutcomesDashboard } from "@/app/dashboard/admin/outcomes/outcomes-dashboard";
import { fetchOutcomesData } from "@/lib/analytics/outcomes";
import { fetchProgressData } from "@/lib/analytics/progress";
import { fetchAcquisitionData } from "@/lib/analytics/acquisition";

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

  const [
    {
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
    },
    outcomes,
    progress,
    acquisition,
  ] = await Promise.all([
    fetchAllInsightsData(scope),
    fetchOutcomesData(scope),
    fetchProgressData(scope),
    fetchAcquisitionData(scope),
  ]);

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

  // Active in last 7 days — computed from date-filtered narrow queries.
  // Previously scanned the ENTIRE attendance/submissions/reflections table
  // and filtered dates in JS. Now the database handles the date filter,
  // so only matching rows are transferred.
  const activeIds = new Set<string>();
  for (const r of activeAttendance) activeIds.add(r.student_id);
  for (const r of activeSubmissions) activeIds.add(r.student_id);
  for (const r of activeReflections) activeIds.add(r.student_id);
  const activeCount = activeIds.size;

  // Engagement signal: students who have done at least one activity over
  // the lifetime of their cohort. Computed from all-time student_id-only
  // queries — still a full scan but ~60% less data per row vs the old
  // approach that also fetched timestamps for every row.
  const engagedIds = new Set<string>();
  for (const r of engagedAttendance) engagedIds.add(r.student_id);
  for (const r of engagedSubmissions) engagedIds.add(r.student_id);
  for (const r of engagedReflections) engagedIds.add(r.student_id);
  const studentIds = new Set(students.map((s) => s.id));
  const studentsEngaged = Array.from(engagedIds).filter((id) =>
    studentIds.has(id),
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

  // Donut palette pulls from the same matte editorial set used elsewhere.
  const DONUT_TONES = [
    "#1D59FF", // vermillion
    "#1F1B16", // ink
    "#2563EB", // editorial blue
    "#15803D", // forest
    "#012966", // dark cobalt
    "#7C3AED", // plum
  ];
  const phaseSegments = phaseData.map((d, i) => ({
    label: PHASE_LABELS[d.key] ?? d.key,
    value: d.value,
    color: DONUT_TONES[i % DONUT_TONES.length],
  }));
  // Only render the donut when it's actually informative (2+ phases). With
  // one segment it collapses to a thick ring that adds noise without insight.
  const showPhaseDonut = phaseSegments.length >= 2;

  // Lifetime served — every human BCC has touched through the LXP or
  // historical alumni imports. Dedupes by lowercased email so someone
  // who appears in both rosters counts once. This is the headline number
  // for board demos and the marketing page; the per-metric strip above
  // splits it into active + alumni for operational clarity.
  const liveEmails = new Set(
    students
      .map((s) => s.email ?? null)
      .filter((e): e is string => !!e)
      .map((e) => e.toLowerCase()),
  );
  const alumniEmails = new Set(
    alumni
      .map((a) => (a.email || "").toLowerCase())
      .filter(Boolean),
  );
  const lifetimeServed = new Set([...liveEmails, ...alumniEmails]).size;

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 sm:px-5 py-8 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Analytics
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
          Survey Insights
          <ArrowRight size={11} weight="bold" />
        </Link>
      </header>

      {/* Lifetime headline — the "served since launch" story that used to
         live on the Admin Overview, now centralized here. */}
      <p className="text-2xl sm:text-[28px] leading-snug tracking-tight text-ink max-w-[55ch]">
        <span className="font-semibold tabular-nums">{lifetimeServed.toLocaleString()}</span>{" "}
        <span className="text-ink-soft">
          people served since launch — {totalStudents.toLocaleString()} active
          in the LXP, {uniqueAlumni.size.toLocaleString()} historical alumni.
        </span>
      </p>

      {/* Metric strip */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          icon={Users}
          label="Students"
          value={totalStudents.toLocaleString()}
          hint="enrolled, role=student"
        />
        <Metric
          icon={Lightning}
          label="Active 7d"
          value={activeCount.toLocaleString()}
          hint="attendance, submission, or reflection"
        />
        <Metric
          icon={Pulse}
          label="Engaged ever"
          value={`${engagementPct}%`}
          hint={`${studentsEngaged.toLocaleString()} of ${totalStudents.toLocaleString()}`}
        />
        <Metric
          icon={GraduationCap}
          label="Alumni"
          value={uniqueAlumni.size.toLocaleString()}
          hint="unique by email"
        />
      </dl>

      {/* Learning outcomes, completion, and acquisition/risk — the analytics
         that turn this page from headcounts into the "are they learning,
         finishing, and engaged?" story. */}
      <OutcomesDashboard data={{ outcomes, progress, acquisition }} />

      {/* Phase breakdown — only when the donut would actually segment. */}
      {showPhaseDonut && (
        <DonutChart
          title="Students by phase"
          segments={phaseSegments}
          centerValue={totalStudents.toLocaleString()}
          centerLabel="students"
        />
      )}

      {/* Per-track student counts */}
      <HorizontalBarChart
        title="Students per track"
        data={trackData}
        barClass="bg-[#1F1B16]"
        unit="students"
        totalCaption={{
          value: trackPairs.size,
          label: `track${trackPairs.size === 1 ? "" : "s"}`,
        }}
      />

      {/* Recent activity — the feed that used to live on the Admin Overview
         tab. Cross-program, latest 10 submissions + reflections. */}
      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Recent activity
        </p>
        <div className="divide-y divide-neutral-100 overflow-hidden panel">
          {activity.length === 0 ? (
            <p className="p-4 text-sm text-ink-soft">
              No submissions or reflections yet.
            </p>
          ) : (
            activity.map((item) => {
              const submittedAt = new Date(item.submitted_at);
              const diffMs = Date.now() - submittedAt.getTime();
              const diffHrs = Math.round(diffMs / (1000 * 60 * 60));
              const ago =
                diffHrs < 1
                  ? "just now"
                  : diffHrs < 24
                    ? `${diffHrs}h ago`
                    : `${Math.round(diffHrs / 24)}d ago`;
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
                      — {item.track_slug} Week {item.week_number}
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

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ size?: number; weight?: "bold"; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="panel p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        <Icon size={11} weight="bold" aria-hidden />
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-ink tracking-tight">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-[10px] text-ink-faint leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}
