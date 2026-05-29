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
import { createServiceClient } from "@/lib/supabase/server";
import { getAllPrograms } from "@/lib/programs";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";

export const revalidate = 120;

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

  const svc = createServiceClient();
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 86400 * 1000).toISOString();

  // Data fetching split into three tiers:
  //
  // Tier 1 — light metadata (always fast, narrow selects):
  //   students (id+email+name), student_tracks (2 cols), alumni (1 col),
  //   recent activity (limit 10 each).
  //
  // Tier 2 — active-7d metrics (date-filtered, index-friendly):
  //   attendance/submissions/reflections filtered to last 7 days,
  //   fetching only student_id. Avoids the full-table scan.
  //
  // Tier 3 — engagement-ever (all time, narrow select):
  //   attendance/submissions/reflections for ALL time but only
  //   student_id (1 column each). Still a full scan but payload is
  //   ~40 bytes per row vs the 100+ bytes with timestamps before.
  //
  // Previously all 3 tables were fetched with full timestamp columns
  // and zero date filters, causing the page to pull every row ever
  // recorded into JS memory just to compute two numbers.

  const [
    allStudentsRes,
    studentTracksRes,
    alumniRes,
    recentSubmissionsRes,
    recentReflectionsRes,
    // Tier 2 — active within 7 days
    activeAttendanceRes,
    activeSubmissionsRes,
    activeReflectionsRes,
    // Tier 3 — engaged ever
    engagedAttendanceRes,
    engagedSubmissionsRes,
    engagedReflectionsRes,
  ] = await Promise.all([
    svc
      .from("students")
      .select("id, role, email, first_name, last_name")
      .not("role", "eq", "admin"),
    svc.from("student_tracks").select("student_id, track_slug"),
    svc.from("alumni_enrollments").select("email"),
    svc
      .from("submissions")
      .select("id, student_id, track_slug, week_number, submitted_at")
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(10),
    svc
      .from("reflections")
      .select("id, student_id, track_slug, week_number, submitted_at")
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(10),
    // Active-7d: date-filtered, only student_id
    svc
      .from("attendance")
      .select("student_id")
      .gte("checked_in_at", sevenDaysAgoIso),
    svc
      .from("submissions")
      .select("student_id")
      .not("submitted_at", "is", null)
      .gte("submitted_at", sevenDaysAgoIso),
    svc
      .from("reflections")
      .select("student_id")
      .not("submitted_at", "is", null)
      .gte("submitted_at", sevenDaysAgoIso),
    // Engaged-ever: ALL time, but only student_id (no timestamps)
    svc
      .from("attendance")
      .select("student_id"),
    svc
      .from("submissions")
      .select("student_id")
      .not("submitted_at", "is", null),
    svc
      .from("reflections")
      .select("student_id")
      .not("submitted_at", "is", null),
  ]);

  const allStudents = allStudentsRes.data ?? [];
  const studentTracks = studentTracksRes.data ?? [];
  const alumni = alumniRes.data ?? [];
  const recentSubmissions = recentSubmissionsRes.data ?? [];
  const recentReflections = recentReflectionsRes.data ?? [];
  // Narrow, date-filtered sets for active-7d computation
  const activeAttendance = activeAttendanceRes.data ?? [];
  const activeSubmissions = activeSubmissionsRes.data ?? [];
  const activeReflections = activeReflectionsRes.data ?? [];
  // Narrow, all-time sets for engagement-ever computation
  const engagedAttendance = engagedAttendanceRes.data ?? [];
  const engagedSubmissions = engagedSubmissionsRes.data ?? [];
  const engagedReflections = engagedReflectionsRes.data ?? [];

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
  const allCatalystTracks = getAllPrograms().find((p) => p.slug === "catalyst")
    ?.tracks ?? [];
  const trackNameBySlug = new Map(
    allCatalystTracks.map((t) => [t.slug, t.shortName || t.name]),
  );
  const phaseBySlug = new Map(
    allCatalystTracks.map((t) => [t.slug, t.phase ?? "other"]),
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
    "#E54D2E", // vermillion
    "#1F1B16", // ink
    "#2563EB", // editorial blue
    "#15803D", // forest
    "#B45309", // burnt amber
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
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            Insights
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Cross-program analytics for super-admins.
          </p>
        </div>
        <Link
          href="/dashboard/admin?tab=insights"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Survey Insights
          <ArrowRight size={11} weight="bold" />
        </Link>
      </header>

      {/* Lifetime headline — the "served since launch" story that used to
         live on the Admin Overview, now centralized here. */}
      <p className="text-2xl sm:text-[28px] leading-snug tracking-tight text-neutral-900 max-w-[55ch]">
        <span className="font-semibold tabular-nums">{lifetimeServed.toLocaleString()}</span>{" "}
        <span className="text-neutral-500">
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Recent activity
        </p>
        <div className="divide-y divide-neutral-100 border border-rule bg-surface-elevated">
          {activity.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">
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
                    <p className="truncate font-medium text-neutral-900">
                      {item.student_name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {item.kind === "submission"
                        ? "Submitted homework"
                        : "Added reflection"}{" "}
                      — {item.track_slug} Week {item.week_number}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">
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
    <div className="border border-rule bg-surface-elevated p-4">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
        <Icon size={11} weight="bold" aria-hidden />
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-neutral-900 tracking-tight">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-[10px] text-neutral-400 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}
