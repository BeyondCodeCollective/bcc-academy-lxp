"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  UserCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertTriangle,
  Check,
  Circle,
} from "lucide-react";
import {
  type AttendanceRecord,
  type StudentRow,
  type TrackLike,
  expectedSessionsFor,
  summarizeAllStudents,
  weeklyAttendanceRates,
} from "@/lib/attendance/compute";
import { computeCurrentWeek } from "@/lib/utils";
import { unitDisplayMap, numberedUnitCount } from "@/lib/programs/unit-display";

type AttendanceTabProps = {
  students: StudentRow[];
  tracks: TrackLike[];
  /** Used in the CSV filename + page heading. Defaults to "attendance". */
  scopeLabel?: string;
  /** When true: hides the header/title, defaults straight to mark view. */
  embedded?: boolean;
  /** Optional Roster/Attendance/Submissions switcher, shown when embedded. */
  viewSwitcher?: React.ReactNode;
  /** When true: keep the view toggle + controls but drop the title block —
   * the parent already renders a PageHeader, so showing both is a double header. */
  hideTitle?: boolean;
};

type View = "overview" | "mark";

const TONE_BY_RATE = {
  on: "bg-green-500",
  watch: "bg-amber-400",
  alert: "bg-red-400",
} as const;

function rateTone(rate: number): keyof typeof TONE_BY_RATE {
  if (rate >= 80) return "on";
  if (rate >= 50) return "watch";
  return "alert";
}

const STATUS_LABEL: Record<string, { label: string; bg: string; text: string }> = {
  "on-track": { label: "On track", bg: "bg-green-50", text: "text-green-700" },
  "at-risk": { label: "At risk", bg: "bg-amber-50", text: "text-amber-700" },
  disengaged: { label: "Disengaged", bg: "bg-red-50", text: "text-red-700" },
};

export function AttendanceTab({ students, tracks, scopeLabel, embedded, viewSwitcher, hideTitle }: AttendanceTabProps) {
  const startedTracks = useMemo(
    () => tracks.filter((t) => new Date() >= new Date(t.startDate)),
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


  const summaries = useMemo(
    () => summarizeAllStudents(students, tracks, records),
    [students, tracks, records]
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
      ...trackCols.map((n) => `${n} %`),
      "Overall %",
      "Sessions Attended",
      "Sessions Expected",
      "Consecutive Misses",
      "Status",
    ].join(",");
    const rows = summaries.map((s) => {
      const name =
        s.student.first_name && s.student.last_name
          ? `${s.student.first_name} ${s.student.last_name}`
          : s.student.email;
      const trackRates = tracks.map((t) => s.byTrack[t.slug]?.rate ?? "—");
      return [
        `"${name.replace(/"/g, '""')}"`,
        s.student.email,
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
          summaries={summaries}
          records={records}
          loading={loading}
          onJumpToMark={(slug) => {
            selectTrack(slug);
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
  return (
    <header className={`flex flex-col gap-3 sm:flex-row sm:items-end ${hideTitle ? "sm:justify-end" : "sm:justify-between"}`}>
      {!hideTitle && (
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            {scopeLabel || "Attendance"}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-ink tracking-tight">
            {view === "overview" ? "Who's showing up" : "Mark check-ins"}
          </h2>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <div
          role="tablist"
          aria-label="Attendance view"
          className="inline-flex items-center rounded-full bg-paper-tint-soft p-0.5 text-xs font-medium"
        >
          {(["overview", "mark"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                view === v
                  ? "bg-ink text-white"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {v === "overview" ? "Overview" : "Mark"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh attendance"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-paper-tint-soft hover:text-ink disabled:opacity-50 transition-colors"
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
          className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-elevated hover:text-ink disabled:opacity-40 transition-colors"
        >
          <Download size={12} />
          Export CSV
        </button>
      </div>
    </header>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────

function OverviewPanel({
  startedTracks,
  students,
  summaries,
  records,
  loading,
  onJumpToMark,
}: {
  startedTracks: TrackLike[];
  students: StudentRow[];
  summaries: ReturnType<typeof summarizeAllStudents>;
  records: AttendanceRecord[];
  loading: boolean;
  onJumpToMark: (slug: string) => void;
}) {
  // Overall rate across every (student × expected session) cell.
  const totals = useMemo(() => {
    let attended = 0;
    let expected = 0;
    for (const s of summaries) {
      attended += s.attended;
      expected += s.expected;
    }
    return {
      attended,
      expected,
      // null (not 100) when nothing's been expected yet — a "100% of 0 sessions"
      // claim is a leak, not a fact. The prose below omits the rate clause then.
      rate: expected > 0 ? Math.round((attended / expected) * 100) : null,
    };
  }, [summaries]);

  // The full risk list — no silent cap. The earlier .slice(0, 8) also made the
  // "{n} need a check-in" prose under-report (it counted the truncated list).
  const atRisk = useMemo(
    () =>
      summaries
        .filter((s) => s.status !== "on-track")
        .sort((a, b) => b.consecutiveMisses - a.consecutiveMisses || a.rate - b.rate),
    [summaries]
  );

  // Loading state intentionally renders nothing — the previous
  // "Loading attendance…" card sat at a different height than the
  // populated overview, causing a visible jump on the per-track Insights
  // view. The fetch is quick enough that no placeholder is better than a
  // flashing one.
  if (loading) {
    return null;
  }

  // Nothing-to-report state. The editorial summary literally read
  // "0 students across 0 active tracks. Overall attendance 100% across 0
  // expected sessions." for tracks that hadn't started yet (AI Literacy,
  // Network+, etc) — technically correct, completely useless. Replace
  // it with a clear empty state when there's no usable data: no tracks
  // started, no records anywhere, and no students to report on.
  const nothingToShow =
    startedTracks.length === 0 &&
    records.length === 0 &&
    summaries.every((s) => s.expected === 0);
  if (nothingToShow) {
    return (
      <div className="panel p-6 text-center">
        <p className="text-sm text-ink-soft max-w-[40ch] mx-auto">
          No attendance to show yet. This will fill in once a session
          starts and someone marks attendance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Editorial summary — facts in prose. */}
      <p className="text-base leading-relaxed text-ink-soft max-w-[65ch]">
        <span className="font-semibold tabular-nums text-ink">
          {students.length.toLocaleString()}
        </span>{" "}
        student{students.length === 1 ? "" : "s"} across{" "}
        <span className="font-semibold tabular-nums text-ink">
          {startedTracks.length.toLocaleString()}
        </span>{" "}
        active track{startedTracks.length === 1 ? "" : "s"}.{" "}
        {totals.rate !== null ? (
          <>
            Overall attendance{" "}
            <span className="font-semibold tabular-nums text-ink">{totals.rate}%</span>{" "}
            across{" "}
            <span className="font-semibold tabular-nums text-ink">
              {totals.expected.toLocaleString()}
            </span>{" "}
            expected session{totals.expected === 1 ? "" : "s"}.
          </>
        ) : (
          <>No sessions have taken place yet.</>
        )}
        {atRisk.length > 0 && (
          <>
            {" "}
            <span className="text-ink">{atRisk.length}</span>{" "}
            need{atRisk.length === 1 ? "s" : ""} a check-in.
          </>
        )}
      </p>

      {/* Per-track weekly trend — one row per track. Section is omitted
         entirely when no tracks have started; an empty card with a
         "weekly attendance" header read as broken/loading. The page-level
         "Attendance · {Track}" header already names this view, so the
         redundant inner h3 is gone too. */}
      {startedTracks.length > 0 && (
        <section className="panel p-4 sm:p-5">
          <div className="space-y-5">
            {startedTracks.map((track) => (
              <TrackTrendRow
                key={track.slug}
                track={track}
                students={students}
                records={records}
                onMark={() => onJumpToMark(track.slug)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Needs attention — only renders when there's actually someone on
         the risk list. The previous empty-state ("Nobody on the risk list
         right now. Worth a celebration.") added a third section that
         didn't say anything useful on a quiet day. */}
      {atRisk.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-ink-faint" />
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
              Needs attention
            </h3>
          </div>
          <ul className="divide-y divide-rule-soft border-t border-rule">
            {atRisk.map((s) => {
              const status = STATUS_LABEL[s.status];
              const name =
                s.student.first_name && s.student.last_name
                  ? `${s.student.first_name} ${s.student.last_name}`
                  : s.student.email;
              return (
                <li
                  key={s.student.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{name}</p>
                    <p className="text-xs text-ink-faint">
                      {s.attended}/{s.expected} sessions ·{" "}
                      {s.consecutiveMisses > 0
                        ? `${s.consecutiveMisses} in a row missed`
                        : "no recent streak"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.bg} ${status.text}`}
                  >
                    {status.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function TrackTrendRow({
  track,
  students,
  records,
  onMark,
}: {
  track: TrackLike;
  students: StudentRow[];
  records: AttendanceRecord[];
  onMark: () => void;
}) {
  const rates = useMemo(
    () => weeklyAttendanceRates(track, students, records),
    [track, students, records]
  );
  const overall =
    rates.length > 0
      ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
      : null;

  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <p className="text-sm font-medium text-ink truncate">{track.name}</p>
        <div className="flex items-center gap-3 shrink-0">
          {overall !== null && (
            <span className="text-xs tabular-nums text-ink-soft">
              {overall}% avg
            </span>
          )}
          <button
            type="button"
            onClick={onMark}
            className="text-xs font-medium text-ink-soft hover:text-ink transition-colors"
          >
            Mark →
          </button>
        </div>
      </div>
      {rates.length === 0 ? (
        <p className="text-xs text-ink-faint">No sessions yet.</p>
      ) : (
        <div className="flex items-end gap-1">
          {rates.map((rate, i) => {
            const tone = TONE_BY_RATE[rateTone(rate)];
            const pct = Math.max(0, Math.min(rate, 100));
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1 min-w-0"
              >
                <div className="relative w-full h-12 overflow-hidden rounded-sm bg-paper-tint-soft">
                  <div
                    className={`absolute inset-x-0 bottom-0 rounded-sm transition-all ${tone}`}
                    style={{ height: `${Math.max(pct, 4)}%` }}
                    title={`${track.unitLabel ?? "Week"} ${i + 1}: ${rate}%`}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-ink-faint">
                  W{i + 1}
                </span>
              </div>
            );
          })}
        </div>
      )}
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
  const trackPickerRef = useRef<HTMLDivElement>(null);

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
  const expectedThisTrack = expectedSessionsFor(activeTrack);
  const elapsedWeeks =
    expectedThisTrack.length > 0
      ? Math.max(...expectedThisTrack.map((s) => s.week))
      : 0;
  const unitDisplay = unitDisplayMap(activeTrack.weekSummaries ?? [], activeTrack.unitLabel ?? "Week");
  const numberedUnits = numberedUnitCount(activeTrack.weekSummaries ?? [], totalWeeks);
  const markUnit = unitDisplay.get(markWeek);
  // Extras (a kickoff) carry no number, so "Kickoff of 16" would be nonsense.
  const markUnitLabel = markUnit
    ? markUnit.number
      ? `${markUnit.text} of ${numberedUnits}`
      : markUnit.text
    : `Week ${markWeek} of ${totalWeeks}`;

  return (
    <div className="space-y-5">
      {/* Track picker — one button per track, scrollable horizontally on
         narrow screens. Replaces the hardcoded MASS|Tech+ toggle. */}
      <div
        ref={trackPickerRef}
        role="tablist"
        aria-label="Select track"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide"
      >
        {tracks.map((t) => {
          const isActive = t.slug === activeTrackSlug;
          const hasStarted = new Date() >= new Date(t.startDate);
          return (
            <button
              key={t.slug}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={!hasStarted}
              onClick={() => selectTrack(t.slug)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-ink text-white"
                  : hasStarted
                    ? "bg-paper-tint-soft text-ink-soft hover:bg-paper-tint hover:text-ink"
                    : "bg-paper-tint-soft text-ink-faint/60 cursor-not-allowed"
              }`}
              title={hasStarted ? t.name : `Starts ${new Date(t.startDate).toLocaleDateString()}`}
            >
              {t.shortName}
            </button>
          );
        })}
      </div>

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
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
            {activeTrack.shortName}
          </p>
          <p className="text-sm font-semibold text-ink">
            {markUnitLabel}
            {markWeek > elapsedWeeks && elapsedWeeks > 0 && (
              <span className="ml-2 text-xs font-normal text-ink-faint">
                · upcoming
              </span>
            )}
          </p>
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
}) {
  const sessionNumbers = Array.from({ length: sessionsPerWeek }, (_, i) => i + 1);

  return (
    <div className="overflow-hidden panel">
      {/* Header: per-session present count + "mark all" */}
      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_repeat(var(--sessions),auto)_auto] gap-x-3 items-center px-4 py-2.5 bg-paper-tint-soft border-b border-rule text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint"
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
                disabled={allPresent}
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
                      disabled={saving}
                      onClick={() =>
                        void onToggle(s.id, track.slug, week, sNum, !checked)
                      }
                      className={`relative inline-flex h-8 w-8 sm:justify-self-end items-center justify-center rounded-full border transition-colors ${
                        checked
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-rule bg-surface-elevated text-ink-faint hover:border-ink-soft hover:text-ink-soft"
                      } ${saving ? "opacity-60" : ""}`}
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
