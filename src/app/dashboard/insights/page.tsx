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

  const svc = createServiceClient();
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 86400 * 1000).toISOString();

  const [
    studentsRes,
    attendanceRes,
    submissionsRes,
    reflectionsRes,
    studentTracksRes,
    alumniRes,
  ] = await Promise.all([
    svc
      .from("students")
      .select("id, role")
      .eq("role", "student"),
    svc.from("attendance").select("student_id, checked_in_at"),
    svc
      .from("submissions")
      .select("student_id, submitted_at")
      .not("submitted_at", "is", null),
    svc
      .from("reflections")
      .select("student_id, submitted_at")
      .not("submitted_at", "is", null),
    svc.from("student_tracks").select("student_id, track_slug"),
    svc.from("alumni_enrollments").select("email"),
  ]);

  const students = studentsRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const submissions = submissionsRes.data ?? [];
  const reflections = reflectionsRes.data ?? [];
  const studentTracks = studentTracksRes.data ?? [];
  const alumni = alumniRes.data ?? [];

  const totalStudents = students.length;

  // Active in last 7 days: any attendance check-in OR submission OR reflection
  // within the window. Captures meaningful engagement, not just a session view.
  const activeIds = new Set<string>();
  for (const r of attendance) {
    if (r.checked_in_at && r.checked_in_at >= sevenDaysAgoIso) {
      activeIds.add(r.student_id);
    }
  }
  for (const r of submissions) {
    if (r.submitted_at && r.submitted_at >= sevenDaysAgoIso) {
      activeIds.add(r.student_id);
    }
  }
  for (const r of reflections) {
    if (r.submitted_at && r.submitted_at >= sevenDaysAgoIso) {
      activeIds.add(r.student_id);
    }
  }
  const activeCount = activeIds.size;

  // Engagement signal: students who have done at least one of attendance,
  // submission, or reflection over the lifetime of their cohort. A coarser
  // "% of students who've engaged at all" metric — useful as a top-line
  // companion to the weekly active count.
  const engagedIds = new Set<string>();
  for (const r of attendance) engagedIds.add(r.student_id);
  for (const r of submissions) engagedIds.add(r.student_id);
  for (const r of reflections) engagedIds.add(r.student_id);
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
