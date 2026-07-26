"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  UserCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Check,
  Circle,
} from "lucide-react";
import {
  type AttendanceRecord,
  type StudentRow,
  type TrackLike,
  summarizeAllStudents,
  unitHasArrived,
  weeklyAttendanceRates,
} from "@/lib/attendance/compute";
import { computeCurrentWeek, trackHasStarted, formatCohortDate } from "@/lib/utils";
import { unitDisplayMap } from "@/lib/programs/unit-display";
import { StatCard } from "@/components/stats/stat-card";
import { SectionHeadline } from "@/components/stats/section-headline";
import { ThresholdLegend, TONE_CHIP, TONE_DOT, type StatusTone } from "@/components/stats/status";
import { buttonClass, microLabel } from "@/components/ui";

type AttendanceTabProps = {
  students: StudentRow[];
  tracks: TrackLike[];
  /** Enrollment rows (student_id → track_slug). When passed, attendance is
   * scored per enrollment so a program-roster account with no enrollment (staff
   * ghost login, un-enrolled signup) doesn't surface as "missed" a track it was
   * never in. Omit for the embedded per-track view, whose students are already
   * enrollment-scoped upstream. */
  enrollments?: { student_id: string; track_slug: string }[];
  /** Used in the CSV filename + page heading. Defaults to "attendance". */
  scopeLabel?: string;
  /** When true: hides the header/title, defaults straight to mark view. */
  embedded?: boolean;
  /** Optional Roster/Attendance/Submissions switcher, shown when embedded. */
  viewSwitcher?: React.ReactNode;
  /** When true: keep the view toggle + controls but drop the title block —
   * the parent already renders a PageHeader, so showing both is a double header. */
  hideTitle?: boolean;
  /** Shared Analytics scope — pre-select this course in the overview. */
  course?: string;
};

type View = "overview" | "mark";

/** The unit's calendar date (YYYY-MM-DD) when the syllabus provides one. */
function unitDate(track: TrackLike, week: number): string | null {
  return (track.weekSummaries ?? []).find((s) => s.week === week)?.date ?? null;
}

// Threshold → semantic tone (shared TONE_CHIP/TONE_DOT classes render it).
function rateTone(rate: number): StatusTone {
  if (rate >= 80) return "success";
  if (rate >= 50) return "warning";
  return "danger";
}

const STATUS_LABEL: Record<string, { label: string; tone: StatusTone }> = {
  // Factual, non-judgmental labels — these describe attendance, not the person.
  // "Disengaged" read as an accusation on a visitor-facing screen.
  "on-track": { label: "On track", tone: "success" },
  "at-risk": { label: "Check in", tone: "warning" },
  disengaged: { label: "Low attendance", tone: "danger" },
};

export function AttendanceTab({ students, tracks, enrollments, scopeLabel, embedded, viewSwitcher, hideTitle, course }: AttendanceTabProps) {
  const startedTracks = useMemo(
    () => tracks.filter((t) => trackHasStarted(t)),
    [tracks]
  );
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View>(embedded ? "mark" : "overview");
  // Stores the user's explicit pick. `null` (the initial value) means
  // "fall back to the first started track." Switching tracks goes through
  // selectTrack() so we can snap the week navigator at the same time.
  const [explicitTrackSlug, setExplicitTrackSlug] = useState<string | null>(null);
  // markWeek defaults to the current week of the initial active track
  // (computed once via lazy initializer; subsequent track switches snap
  // via selectTrack()).
  const [markWeek, setMarkWeek] = useState<number>(() => {
    const initial = startedTracks[0] ?? tracks[0];
    if (!initial) return 1;
    const cw =
      initial.currentUnit ??
      computeCurrentWeek(
        initial.startDate,
        initial.totalWeeks,
        initial.lastSessionDayOffset
      );
    return Math.max(1, Math.min(cw, initial.totalWeeks));
  });
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const filenameSlug = (scopeLabel ?? "attendance")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Derive the effective active slug at render time. Falls through cleanly
  // when the user's pick goes stale (e.g. config reload removed it) without
  // needing a sync effect to "fix up" state.
  const activeTrackSlug =
    (explicitTrackSlug && tracks.some((t) => t.slug === explicitTrackSlug)
      ? explicitTrackSlug
      : startedTracks[0]?.slug ?? tracks[0]?.slug) ?? "";

  const activeTrack = useMemo(
    () => tracks.find((t) => t.slug === activeTrackSlug) ?? null,
    [tracks, activeTrackSlug]
  );

  // Picking a track also snaps the week navigator to that track's current
  // week — both state writes happen in the same event handler so React
  // batches them and we never need an effect to keep them in sync.
  const selectTrack = useCallback(
    (slug: string) => {
      setExplicitTrackSlug(slug);
      const t = tracks.find((x) => x.slug === slug);
      if (t) {
        const cw =
          t.currentUnit ??
          computeCurrentWeek(t.startDate, t.totalWeeks, t.lastSessionDayOffset);
        setMarkWeek(Math.max(1, Math.min(cw, t.totalWeeks)));
      }
    },
    [tracks]
  );

  const fetchRecords = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        if (tracks.length === 0) {
          setRecords([]);
          return;
        }
        const results = await Promise.all(
          tracks.map((t) =>
            fetch(`/api/attendance?track=${encodeURIComponent(t.slug)}`)
              .then((r) => (r.ok ? r.json() : { records: [] }))
              .catch(() => ({ records: [] }))
          )
        );
        const merged: AttendanceRecord[] = results.flatMap(
          (r: { records?: AttendanceRecord[] }) => r.records ?? []
        );
        setRecords(merged);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tracks]
  );

  // Initial / on-tracks-change data load. The lint rule guards against
  // cascading state updates inside effects, but loading async data IS the
  // textbook use of useEffect — fetchRecords flips loading flags and
  // populates records, which are downstream of the network response.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRecords();
  }, [fetchRecords]);


  // studentId → set of enrolled track slugs. Undefined when no enrollments were
  // passed (embedded per-track view), which keeps the original all-tracks
  // behavior for callers that pre-scope their student list.
  const enrolledByStudent = useMemo(() => {
    if (!enrollments) return undefined;
    const m = new Map<string, Set<string>>();
    for (const e of enrollments) {
      const set = m.get(e.student_id) ?? new Set<string>();
      set.add(e.track_slug);
      m.set(e.student_id, set);
    }
    return m;
  }, [enrollments]);

  const summaries = useMemo(
    () => summarizeAllStudents(students, tracks, records, undefined, enrolledByStudent),
    [students, tracks, records, enrolledByStudent]
  );

  // Boolean lookup: did student X attend session (slug, week, n)?
  // Built once per records change, O(1) lookups during render.
  const attended = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      set.add(`${r.student_id}|${r.track}|${r.week_number}|${r.session_number}`);
    }
    return set;
  }, [records]);

  function isAttended(studentId: string, trackSlug: string, week: number, sess: number) {
    return attended.has(`${studentId}|${trackSlug}|${week}|${sess}`);
  }

  async function toggleAttendance(
    studentId: string,
    trackSlug: string,
    week: number,
    sess: number,
    nextValue: boolean
  ) {
    const key = `${studentId}|${trackSlug}|${week}|${sess}`;
    setSavingKeys((prev) => new Set(prev).add(key));
    // Optimistic: mutate `records` immediately so the click is instant.
    setRecords((prev) => {
      if (nextValue) {
        const optimistic: AttendanceRecord = {
          id: `optimistic-${key}-${Date.now()}`,
          student_id: studentId,
          track: trackSlug,
          week_number: week,
          session_number: sess,
          checked_in_at: new Date().toISOString(),
          marked_by: null,
        };
        return [...prev, optimistic];
      }
      return prev.filter(
        (r) =>
          !(
            r.student_id === studentId &&
            r.track === trackSlug &&
            r.week_number === week &&
            r.session_number === sess
          )
      );
    });

    try {
      const res = await fetch("/api/attendance", {
        method: nextValue ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track: trackSlug,
          week_number: week,
          session_number: sess,
          student_id: studentId,
        }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
    } catch {
      // Rollback by refetching that track. Cheaper than maintaining a
      // separate per-call diff and corrects any drift from concurrent edits.
      await fetchRecords(true);
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function markAllPresent(trackSlug: string, week: number, sess: number) {
    // Find students who aren't already marked for this slot.
    const toMark = students.filter((s) => !isAttended(s.id, trackSlug, week, sess));
    if (toMark.length === 0) return;
    // Fire in parallel — the API upserts so duplicates are no-ops.
    await Promise.all(
      toMark.map((s) => toggleAttendance(s.id, trackSlug, week, sess, true))
    );
  }

  function exportCSV() {
    const trackCols = tracks.map((t) => t.shortName);
    const header = [
      "Name",
      "Email",
      "ZIP",
      "State",
      "Birthday",
      ...trackCols.map((n) => `${n} %`),
      "Overall %",
      "Sessions Attended",
      "Sessions Expected",
      "Consecutive Misses",
      "Status",
    ].join(",");
    const q = (v: string | number | null | undefined) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = summaries.map((s) => {
      const name =
        s.student.first_name && s.student.last_name
          ? `${s.student.first_name} ${s.student.last_name}`
          : s.student.email;
      const trackRates = tracks.map((t) => s.byTrack[t.slug]?.rate ?? "—");
      return [
        q(name),
        s.student.email,
        q(s.student.zip),
        q(s.student.state),
        q(s.student.date_of_birth),
        ...trackRates,
        s.rate,
        s.attended,
        s.expected,
        s.consecutiveMisses,
        STATUS_LABEL[s.status]?.label ?? s.status,
      ].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameSlug || "attendance"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (tracks.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-ink-soft">
          No tracks configured for this view. Attendance lights up once a track
          is added.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {embedded && viewSwitcher && (
        <div className="flex flex-wrap items-center gap-2">{viewSwitcher}</div>
      )}
      {!embedded && (
        <Header
          scopeLabel={scopeLabel}
          view={view}
          setView={setView}
          refreshing={refreshing}
          onRefresh={() => void fetchRecords(true)}
          onExport={exportCSV}
          hasData={summaries.length > 0}
          hideTitle={hideTitle}
        />
      )}

      {view === "overview" ? (
        <OverviewPanel
          startedTracks={startedTracks}
          students={students}
          enrolledByStudent={enrolledByStudent}
          summaries={summaries}
          records={records}
          loading={loading}
          initialCourse={course}
          onJumpToMark={(slug, week) => {
            selectTrack(slug);
            if (week) setMarkWeek(week);
            setView("mark");
          }}
        />
      ) : (
        <MarkPanel
          tracks={tracks}
          startedTracks={startedTracks}
          activeTrack={activeTrack}
          activeTrackSlug={activeTrackSlug}
          selectTrack={selectTrack}
          markWeek={markWeek}
          setMarkWeek={setMarkWeek}
          students={students}
          isAttended={isAttended}
          savingKeys={savingKeys}
          onToggle={toggleAttendance}
          onMarkAllPresent={markAllPresent}
          loading={loading}
        />
      )}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────

function Header({
  scopeLabel,
  view,
  setView,
  refreshing,
  onRefresh,
  onExport,
  hasData,
  hideTitle,
}: {
  scopeLabel?: string;
  view: View;
  setView: (v: View) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onExport: () => void;
  hasData: boolean;
  hideTitle?: boolean;
}) {
  // Attendance is auto-recorded from Zoom, so there's no "Take attendance"
  // action — you adjust a session by clicking its box. The only view switch
  // left is getting back from that editor to the report.
  const actions = (
    <>
      {view === "mark" && (
        <button
          type="button"
          onClick={() => setView("overview")}
          className={buttonClass("ghost", "sm")}
        >
          ← Back to report
        </button>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="Refresh attendance"
        className={buttonClass("ghost", "sm")}
      >
        <RefreshCw
          size={14}
          className={refreshing ? "animate-spin" : undefined}
        />
      </button>
      <button
        type="button"
        onClick={onExport}
        disabled={!hasData}
        className={buttonClass("secondary", "sm")}
      >
        <Download size={12} />
        Export CSV
      </button>
    </>
  );
  if (hideTitle) {
    return <div className="flex items-center justify-end gap-1.5">{actions}</div>;
  }
  return (
    <SectionHeadline
      eyebrow={scopeLabel || "Attendance"}
      headline={view === "overview" ? "Who's showing up" : "Mark check-ins"}
      actions={actions}
    />
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────

function OverviewPanel({
  startedTracks,
  students,
  enrolledByStudent,
  summaries,
  records,
  loading,
  onJumpToMark,
  initialCourse,
}: {
  startedTracks: TrackLike[];
  students: StudentRow[];
  enrolledByStudent?: Map<string, Set<string>>;
  summaries: ReturnType<typeof summarizeAllStudents>;
  records: AttendanceRecord[];
  loading: boolean;
  onJumpToMark: (slug: string, week?: number) => void;
  /** Shared Analytics scope — pre-select this course. */
  initialCourse?: string;
}) {
  // One course at a time. Default to the shared scope (if set), else the first
  // started track; the selector only lists tracks that actually take attendance.
  const [selectedSlug, setSelectedSlug] = useState<string>(initialCourse ?? "");
  // Names of who's behind stay hidden until the "Need a check-in" tile is
  // clicked — the page leads with numbers, not a wall of at-risk students.
  const [showCheckIn, setShowCheckIn] = useState(false);
  const track =
    startedTracks.find((t) => t.slug === selectedSlug) ?? startedTracks[0] ?? null;

  // Scope the roster (and thus the rate + risk list) to THIS course's enrolled
  // learners, so program accounts not in the track don't drag numbers down.
  const trackStudents = useMemo(
    () =>
      track && enrolledByStudent
        ? students.filter((s) => enrolledByStudent.get(s.id)?.has(track.slug))
        : students,
    [students, enrolledByStudent, track],
  );

  const rates = useMemo(
    () => (track ? weeklyAttendanceRates(track, trackStudents, records) : []),
    [track, trackStudents, records],
  );
  const avg =
    rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;

  // Risk list scoped to this course's roster (no silent cap).
  const atRisk = useMemo(
    () =>
      summaries
        .filter((s) => s.status !== "on-track")
        .filter(
          (s) =>
            !enrolledByStudent ||
            (track ? !!enrolledByStudent.get(s.student.id)?.has(track.slug) : true),
        )
        .sort((a, b) => b.consecutiveMisses - a.consecutiveMisses || a.rate - b.rate),
    [summaries, enrolledByStudent, track],
  );

  // Loading renders nothing — a placeholder at a different height caused a
  // visible jump on the per-track view.
  if (loading) return null;

  if (startedTracks.length === 0) {
    return (
      <div className="panel p-6 text-center">
        <p className="mx-auto max-w-[40ch] text-sm text-ink-soft">
          No attendance to show yet. This will fill in once a session starts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course selector — pick one; nothing is stacked or viewable all at once. */}
      {startedTracks.length > 1 && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            Course
          </span>
          <select
            value={track?.slug ?? ""}
            onChange={(e) => {
              setSelectedSlug(e.target.value);
              setShowCheckIn(false);
            }}
            className="min-w-[16rem] max-w-full rounded-lg border border-rule bg-white px-3 py-2 text-sm font-semibold text-ink focus:border-ink-faint focus:outline-none"
          >
            {startedTracks.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </label>
      )}

      {/* Headline numbers, big. "Need a check-in" is a button — click to reveal
         the names, which stay hidden by default. */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={avg !== null ? `${avg}%` : "—"} label="Avg attendance" />
        <StatCard value={trackStudents.length} label="Students" />
        <StatCard
          value={atRisk.length}
          label="Need a check-in"
          hint={atRisk.length > 0 ? (showCheckIn ? "Hide names" : "Show names") : undefined}
          onClick={() => setShowCheckIn((v) => !v)}
          ariaExpanded={showCheckIn}
          disabled={atRisk.length === 0}
        />
      </div>

      {/* Names — revealed only when the tile is clicked. */}
      {showCheckIn && atRisk.length > 0 && (
        <div className="rounded-xl border border-rule bg-paper-tint-soft p-4">
          <p className={`mb-2.5 ${microLabel}`}>
            Check in with
          </p>
          <div className="flex flex-wrap gap-2">
            {atRisk.map((s) => {
              const name =
                s.student.first_name && s.student.last_name
                  ? `${s.student.first_name} ${s.student.last_name}`
                  : s.student.email;
              const dot = TONE_DOT[STATUS_LABEL[s.status]?.tone ?? "warning"];
              return (
                <span
                  key={s.student.id}
                  title={`${s.attended}/${s.expected} sessions · ${
                    s.consecutiveMisses > 0
                      ? `${s.consecutiveMisses} in a row missed`
                      : "no recent streak"
                  }`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-white px-3 py-1.5 text-[13px] font-semibold text-ink"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly boxes — color + % agree; click a box to correct that session.
         Attendance is auto-recorded from Zoom, so this is a view + occasional fix. */}
      <section className="panel p-4 sm:p-5">
        <div className="mb-4">
          <ThresholdLegend
            items={[
              { tone: "success", label: "Good · 80%+" },
              { tone: "warning", label: "Watch · 50–79%" },
              { tone: "danger", label: "Low · under 50%" },
            ]}
          />
        </div>
        {rates.length === 0 ? (
          <p className="text-sm text-ink-faint">No sessions yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {rates.map((rate, i) => (
              <button
                key={i}
                type="button"
                onClick={() => track && onJumpToMark(track.slug, i + 1)}
                title={`Adjust ${track?.unitLabel ?? "Week"} ${i + 1} attendance`}
                className={`group min-w-[78px] flex-1 rounded-lg px-2.5 py-3 text-center transition-shadow hover:shadow-[inset_0_0_0_1.5px_currentColor] ${TONE_CHIP[rateTone(rate)]}`}
              >
                <div className="text-lg font-extrabold leading-none tabular-nums">{rate}%</div>
                <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold opacity-80">
                  {track?.unitLabel ?? "Week"} {i + 1}
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover:opacity-100">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

// ─── Mark panel ───────────────────────────────────────────────────────────

function MarkPanel({
  tracks,
  startedTracks,
  activeTrack,
  activeTrackSlug,
  selectTrack,
  markWeek,
  setMarkWeek,
  students,
  isAttended,
  savingKeys,
  onToggle,
  onMarkAllPresent,
  loading,
}: {
  tracks: TrackLike[];
  startedTracks: TrackLike[];
  activeTrack: TrackLike | null;
  activeTrackSlug: string;
  selectTrack: (s: string) => void;
  markWeek: number;
  setMarkWeek: (n: number) => void;
  students: StudentRow[];
  isAttended: (studentId: string, slug: string, week: number, sess: number) => boolean;
  savingKeys: Set<string>;
  onToggle: (
    studentId: string,
    slug: string,
    week: number,
    sess: number,
    nextValue: boolean
  ) => Promise<void>;
  onMarkAllPresent: (slug: string, week: number, sess: number) => Promise<void>;
  loading: boolean;
}) {
  // Return null while loading — a placeholder card sits at a different height
  // than the populated mark grid and causes a visible jump on mount.
  // The fetch is fast enough that appearing immediately is better UX.
  if (loading) return null;

  if (startedTracks.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-ink-soft">
          No tracks have started yet. Marking lights up on each track&apos;s start
          date.
        </p>
      </div>
    );
  }

  if (!activeTrack) return null;

  const totalWeeks = activeTrack.totalWeeks;
  // A session-modeled track has one session per unit; `sessionsPerWeek` there
  // is the weekly cadence, so using it would render two slots per session.
  const sessionsPerWeek =
    activeTrack.unitLabel === "Session" ? 1 : activeTrack.sessionsPerWeek;
  const unitDisplay = unitDisplayMap(activeTrack.weekSummaries ?? [], activeTrack.unitLabel ?? "Week");
  const arrived = unitHasArrived(activeTrack, markWeek);
  const markDate = unitDate(activeTrack, markWeek);

  return (
    <div className="space-y-5">
      {/* Track picker — a select, like every other scope filter (pills are
         reserved for navigation, so this can't read as yet another tab row). */}
      {tracks.length > 1 && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            Course
          </span>
          <select
            value={activeTrackSlug}
            onChange={(e) => selectTrack(e.target.value)}
            className="min-w-[16rem] max-w-full rounded-lg border border-rule bg-white px-3 py-2 text-sm font-semibold text-ink focus:border-ink-faint focus:outline-none"
          >
            {tracks.map((t) => {
              const hasStarted = trackHasStarted(t);
              return (
                <option key={t.slug} value={t.slug} disabled={!hasStarted}>
                  {t.name}
                  {hasStarted ? "" : ` · starts ${formatCohortDate(t.startDate, { month: "short", day: "numeric" })}`}
                </option>
              );
            })}
          </select>
        </label>
      )}

      {/* Week navigator */}
      <div className="flex items-center justify-between gap-3 border-y border-rule py-3">
        <button
          type="button"
          onClick={() => setMarkWeek(Math.max(1, markWeek - 1))}
          disabled={markWeek <= 1}
          aria-label="Previous week"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-paper-tint-soft hover:text-ink disabled:opacity-30 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            {activeTrack.shortName}
          </p>
          {/* Unit picker — a select, not chevrons alone: a 17-unit course
             (Security+) is unusable one week-step at a time. */}
          <select
            value={markWeek}
            onChange={(e) => setMarkWeek(Number(e.target.value))}
            aria-label="Select unit"
            className="mt-0.5 max-w-full cursor-pointer rounded-md border border-rule bg-surface-elevated px-2 py-1 text-sm font-semibold text-ink"
          >
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
              const u = unitDisplay.get(w);
              const text = u?.text ?? `Week ${w}`;
              const d = unitDate(activeTrack, w);
              const future = !unitHasArrived(activeTrack, w);
              return (
                <option key={w} value={w}>
                  {text}
                  {d ? ` · ${formatCohortDate(d, { month: "short", day: "numeric" })}` : ""}
                  {future ? " · upcoming" : ""}
                </option>
              );
            })}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setMarkWeek(Math.min(totalWeeks, markWeek + 1))}
          disabled={markWeek >= totalWeeks}
          aria-label="Next week"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-paper-tint-soft hover:text-ink disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Future units are view-only. Marking ahead of the calendar is how the
         Security+ launch data got phantom check-ins for sessions 2–6. */}
      {!arrived && (
        <p className="rounded-md bg-paper-tint-soft px-4 py-3 text-sm text-ink-soft">
          This {(activeTrack.unitLabel ?? "week").toLowerCase()} hasn&apos;t
          happened yet
          {markDate ? ` — it meets ${formatCohortDate(markDate)}` : ""}. Marking
          opens on the day.
        </p>
      )}

      {students.length === 0 ? (
        <p className="text-sm text-ink-soft text-center py-8">
          No students in this scope yet.
        </p>
      ) : (
        <SessionTable
          track={activeTrack}
          week={markWeek}
          sessionsPerWeek={sessionsPerWeek}
          students={students}
          isAttended={isAttended}
          savingKeys={savingKeys}
          onToggle={onToggle}
          onMarkAllPresent={onMarkAllPresent}
          locked={!arrived}
        />
      )}
    </div>
  );
}

function SessionTable({
  track,
  week,
  sessionsPerWeek,
  students,
  isAttended,
  savingKeys,
  onToggle,
  onMarkAllPresent,
  locked,
}: {
  track: TrackLike;
  week: number;
  sessionsPerWeek: number;
  students: StudentRow[];
  isAttended: (studentId: string, slug: string, week: number, sess: number) => boolean;
  savingKeys: Set<string>;
  onToggle: (
    studentId: string,
    slug: string,
    week: number,
    sess: number,
    nextValue: boolean
  ) => Promise<void>;
  onMarkAllPresent: (slug: string, week: number, sess: number) => Promise<void>;
  /** True when this unit's date hasn't arrived — grid is view-only. */
  locked?: boolean;
}) {
  const sessionNumbers = Array.from({ length: sessionsPerWeek }, (_, i) => i + 1);

  return (
    <div className="overflow-hidden panel">
      {/* Header: per-session present count + "mark all" */}
      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_repeat(var(--sessions),auto)_auto] gap-x-3 items-center px-4 py-2.5 bg-paper-tint-soft border-b border-rule text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint"
        style={{ ["--sessions" as string]: sessionsPerWeek }}>
        <div>Student</div>
        {sessionNumbers.map((s) => {
          const presentCount = students.filter((st) =>
            isAttended(st.id, track.slug, week, s)
          ).length;
          const allPresent = presentCount === students.length && students.length > 0;
          return (
            <div key={s} className="hidden sm:flex items-center gap-2 justify-end">
              <span className="tabular-nums normal-case font-normal text-ink-soft">
                {presentCount}/{students.length}
              </span>
              <button
                type="button"
                onClick={() => void onMarkAllPresent(track.slug, week, s)}
                disabled={allPresent || locked}
                className="rounded-full border border-rule px-2 py-0.5 text-[10px] font-medium text-ink-soft hover:bg-surface-elevated hover:text-ink disabled:opacity-40 transition-colors"
              >
                S{s} all
              </button>
            </div>
          );
        })}
        <div className="hidden sm:block text-right tabular-nums normal-case font-normal text-ink-soft">
          Rate
        </div>
      </div>

      <ul className="divide-y divide-rule-soft">
        {students.map((s) => {
          const name =
            s.first_name && s.last_name
              ? `${s.first_name} ${s.last_name}`
              : s.email;
          const attendedSessions = sessionNumbers.filter((n) =>
            isAttended(s.id, track.slug, week, n)
          ).length;
          return (
            <li
              key={s.id}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_repeat(var(--sessions),auto)_auto] gap-x-3 items-center px-4 py-3"
              style={{ ["--sessions" as string]: sessionsPerWeek }}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{name}</p>
                <p className="text-[11px] text-ink-faint truncate">{s.email}</p>
              </div>
              <div className="flex items-center gap-2 sm:contents">
                {sessionNumbers.map((sNum) => {
                  const checked = isAttended(s.id, track.slug, week, sNum);
                  const key = `${s.id}|${track.slug}|${week}|${sNum}`;
                  const saving = savingKeys.has(key);
                  return (
                    <button
                      key={sNum}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-label={`${name} — Session ${sNum}: ${checked ? "present" : "absent"}`}
                      disabled={saving || locked}
                      onClick={() =>
                        void onToggle(s.id, track.slug, week, sNum, !checked)
                      }
                      className={`relative inline-flex h-8 w-8 sm:justify-self-end items-center justify-center rounded-full border transition-colors ${
                        checked
                          ? "border-success bg-success text-white"
                          : "border-rule bg-surface-elevated text-ink-faint hover:border-ink-soft hover:text-ink-soft"
                      } ${saving ? "opacity-60" : ""} ${locked ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      {checked ? <Check size={14} strokeWidth={2.5} /> : <Circle size={12} />}
                      {sessionsPerWeek > 1 && (
                        <span className="absolute -bottom-3.5 text-[9px] text-ink-faint hidden sm:block">
                          S{sNum}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="hidden sm:block text-right tabular-nums text-[11px] text-ink-soft">
                {attendedSessions}/{sessionsPerWeek}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Re-export for backwards compatibility — anything currently importing the
// old static helper still resolves.
export { type StudentRow, type AttendanceRecord, type TrackLike };
// Silence unused import warning — kept for future quick-mark icon swaps.
void UserCheck;
