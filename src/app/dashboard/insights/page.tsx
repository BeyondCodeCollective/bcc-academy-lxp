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
    programsRes,
  ] = await Promise.all([
    svc
      .from("students")
      .select("id, program_id, role, created_at")
      .eq("role", "student"),
    svc
      .from("attendance")
      .select("student_id, checked_in_at, track, program_id"),
    svc
      .from("submissions")
      .select("student_id, submitted_at, track_slug, program_id")
      .not("submitted_at", "is", null),
    svc
      .from("reflections")
      .select("student_id, submitted_at, track_slug, program_id")
      .not("submitted_at", "is", null),
    svc
      .from("student_tracks")
      .select("student_id, track_slug, program_id"),
    svc
      .from("alumni_enrollments")
      .select("email, track_slug, program_id"),
    svc.from("programs").select("id, slug, name"),
  ]);

  const students = studentsRes.data ?? [];
  const attendance = attendanceRes.data ?? [];
  const submissions = submissionsRes.data ?? [];
  const reflections = reflectionsRes.data ?? [];
  const studentTracks = studentTracksRes.data ?? [];
  const alumni = alumniRes.data ?? [];
  const programs = programsRes.data ?? [];

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

  // Per-program student counts. We use student_tracks not students.program_id
  // so admins enrolled in tracks across programs are counted where they
  // actually learn, not where their primary record happens to live.
  const programNameById = new Map(programs.map((p) => [p.id, p.name]));
  const allCatalystTracks = getAllPrograms().find((p) => p.slug === "catalyst")
    ?.tracks ?? [];
  const trackNameBySlug = new Map(
    allCatalystTracks.map((t) => [t.slug, t.shortName || t.name]),
  );

  // Distinct (student, program) pairs so co-enrolled students don't get
  // double-counted.
  const studentProgramSet = new Set<string>();
  for (const r of studentTracks) {
    if (r.student_id && r.program_id) {
      studentProgramSet.add(`${r.student_id}::${r.program_id}`);
    }
  }
  const programCounts = new Map<string, number>();
  for (const key of studentProgramSet) {
    const programId = key.split("::")[1];
    const name = programNameById.get(programId) ?? "Unknown program";
    programCounts.set(name, (programCounts.get(name) ?? 0) + 1);
  }
  const programData = Array.from(programCounts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Per-track student counts (distinct students). Catalyst-only since that's
  // where the actual track-level enrollment exists.
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

  // Donut palette pulls from the same matte editorial set used elsewhere.
  const DONUT_TONES = [
    "#E54D2E", // vermillion
    "#1F1B16", // ink
    "#2563EB", // editorial blue
    "#15803D", // forest
    "#B45309", // burnt amber
    "#7C3AED", // plum
  ];
  const donutSegments = programData.map((d, i) => ({
    label: d.label,
    value: d.value,
    color: DONUT_TONES[i % DONUT_TONES.length],
  }));

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

      {/* Per-program breakdown */}
      <DonutChart
        title="Students by program"
        segments={donutSegments}
        centerValue={studentProgramSet.size.toLocaleString()}
        centerLabel="enrollments"
      />

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
