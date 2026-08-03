"use client";

// Program-altitude Attendance: one row per running course — enrolled, average
// turnout, who needs a check-in — each linking INTO that course's own
// analytics. The program tab compares courses; the numbers themselves live in
// the course (course-first hierarchy). Marking attendance happens inside the
// course too (Students → Attendance).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  type AttendanceRecord,
  type StudentRow,
  type TrackLike,
  expectedSessionsFor,
  summarizeAllStudents,
  weeklyAttendanceRates,
} from "@/lib/attendance/compute";
import { trackHasStarted } from "@/lib/utils";
import { SectionHeadline } from "@/components/stats/section-headline";
import { StatusChip } from "@/components/stats/status";
import { DataTable, Num } from "@/components/ui";

type Props = {
  students: StudentRow[];
  tracks: TrackLike[];
  enrollments: { student_id: string; track_slug: string }[];
};

export function ProgramAttendanceOverview({ students, tracks, enrollments }: Props) {
  const startedTracks = useMemo(() => tracks.filter((t) => trackHasStarted(t)), [tracks]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (startedTracks.length === 0) return;
        const results = await Promise.all(
          startedTracks.map((t) =>
            fetch(`/api/attendance?track=${encodeURIComponent(t.slug)}`)
              .then((r) => (r.ok ? r.json() : { records: [] }))
              .catch(() => ({ records: [] })),
          ),
        );
        if (live) {
          setRecords(results.flatMap((r: { records?: AttendanceRecord[] }) => r.records ?? []));
        }
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [startedTracks]);

  const enrolledByStudent = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of enrollments) {
      const set = m.get(e.student_id) ?? new Set<string>();
      set.add(e.track_slug);
      m.set(e.student_id, set);
    }
    return m;
  }, [enrollments]);

  const rows = useMemo(
    () => {
      // Same honesty rule as the matrix below: a course with no recorded
      // attendance shows nothing rather than a 0% that means "unrecorded"
      // (Google Meet-era cohorts). First real check-in brings it back.
      const trackHasRecords = new Set(records.map((r) => r.track));
      return startedTracks
        .filter((t) => trackHasRecords.has(t.slug))
        .map((track) => {
        const trackStudents = students.filter((s) =>
          enrolledByStudent.get(s.id)?.has(track.slug),
        );
        const rates = weeklyAttendanceRates(track, trackStudents, records);
        const avg =
          rates.length > 0
            ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
            : null;
        const atRisk = summarizeAllStudents(
          trackStudents,
          [track],
          records,
          undefined,
          enrolledByStudent,
        ).filter((s) => s.status !== "on-track").length;
        return { track, students: trackStudents.length, avg, atRisk };
      });
    },
    [startedTracks, students, records, enrolledByStudent],
  );

  const overallAvg = (() => {
    const withData = rows.filter((r) => r.avg !== null);
    if (withData.length === 0) return null;
    return Math.round(
      withData.reduce((a, r) => a + (r.avg as number), 0) / withData.length,
    );
  })();

  if (loading) return null;

  if (startedTracks.length === 0) {
    return (
      <div className="panel p-6 text-center">
        <p className="mx-auto max-w-[40ch] text-sm text-ink-soft">
          No attendance to show yet. This will fill in once a course starts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeadline
        eyebrow="Attendance"
        headline={
          overallAvg !== null
            ? `${overallAvg}% average turnout across ${rows.length} running course${rows.length === 1 ? "" : "s"}`
            : "Who's showing up"
        }
        sub="Open a course for its week-by-week turnout and to mark check-ins."
      />
      <DataTable
        columns={[
          "Course",
          { label: "Students", align: "right" },
          { label: "Avg attendance", align: "right" },
          { label: "Need a check-in", align: "right" },
        ]}
      >
        {rows.map(({ track, students: count, avg, atRisk }) => {
          // Every number here is a question with an answer one click away.
          // Leaving them as dead text makes the reader export a CSV to find
          // out who the 9 are.
          const base = `/dashboard/admin?tab=${encodeURIComponent(track.slug)}`;
          const roster = `${base}&view=students`;
          const attendance = `${base}&view=students&sub=attendance`;
          return (
          <tr key={track.slug} className="transition-colors hover:bg-paper-tint-soft">
            <td className="px-4 py-3">
              <Link
                href={`${base}&view=analytics`}
                className="text-sm font-medium text-ink underline-offset-2 hover:text-primary hover:underline"
              >
                {track.name}
              </Link>
            </td>
            <td className="px-4 py-3 text-right">
              <Link href={roster} className="inline-block underline-offset-2 hover:text-primary hover:underline" title={`Open the ${track.name} roster`}>
                <Num value={count} />
              </Link>
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-ink">
              <Link href={attendance} className="inline-block underline-offset-2 hover:text-primary hover:underline" title="Week-by-week turnout and check-ins">
                {avg !== null ? `${avg}%` : "—"}
              </Link>
            </td>
            <td className="px-4 py-3 text-right">
              <Link href={attendance} className="inline-block" title={atRisk > 0 ? `${atRisk} learner${atRisk === 1 ? "" : "s"} to follow up with` : "Nobody needs a check-in"}>
                {atRisk > 0 ? (
                  <StatusChip tone={atRisk >= Math.max(2, Math.ceil(count / 2)) ? "danger" : "warning"}>
                    {atRisk}
                  </StatusChip>
                ) : (
                  <Num value={0} />
                )}
              </Link>
            </td>
          </tr>
          );
        })}
      </DataTable>

      <AllSessionsMatrix
        tracks={startedTracks}
        students={students}
        records={records}
        enrolledByStudent={enrolledByStudent}
      />
    </div>
  );
}

/**
 * Every learner × every held session, all courses side by side — the
 * "is everyone looped in" grid. ✓ = attended; · = enrolled but absent;
 * — = not enrolled in that course. Totals close the loop both ways.
 */
function AllSessionsMatrix({
  tracks,
  students,
  records,
  enrolledByStudent,
}: {
  tracks: TrackLike[];
  students: StudentRow[];
  records: AttendanceRecord[];
  enrolledByStudent: Map<string, Set<string>>;
}) {
  const attended = useMemo(() => {
    const s = new Set<string>();
    for (const r of records) s.add(`${r.student_id}|${r.track}|${r.week_number}|${r.session_number}`);
    return s;
  }, [records]);

  const groups = useMemo(() => {
    // Courses with ZERO recorded attendance are omitted, not shown as 0% —
    // cohorts that ran off-platform (Google Meet era) have no records, and an
    // all-dot grid is a claim nobody attended, which isn't what happened.
    // Entering historical records later makes a course reappear on its own.
    const trackHasRecords = new Set(records.map((r) => r.track));
    return tracks
      .filter((t) => trackHasRecords.has(t.slug))
      .map((track) => ({ track, sessions: expectedSessionsFor(track) }))
      .filter((g) => g.sessions.length > 0)
      // Newest cohort first — the running class is the one being checked.
      .sort((a, b) => b.track.startDate.localeCompare(a.track.startDate));
  }, [tracks, records]);

  const learners = useMemo(
    () =>
      students
        .filter((st) => groups.some(({ track }) => enrolledByStudent.get(st.id)?.has(track.slug)))
        .sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`),
        ),
    [students, groups, enrolledByStudent],
  );

  if (groups.length === 0 || learners.length === 0) return null;

  return (
    <div className="space-y-3">
      <SectionHeadline
        eyebrow="All sessions"
        headline="Every learner, every session held"
        sub="Courses side by side. ✓ attended · missed — not enrolled in that course."
      />
      <div className="panel overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-4 py-2 text-left font-semibold text-ink">
                Learner
              </th>
              {groups.map(({ track, sessions }) => (
                <th
                  key={track.slug}
                  colSpan={sessions.length}
                  className="border-l border-rule px-2 py-2 text-center font-semibold text-ink"
                >
                  {track.shortName || track.name}
                </th>
              ))}
              <th className="border-l border-rule px-3 py-2 text-right font-semibold text-ink">
                Total
              </th>
            </tr>
            <tr className="text-ink-faint">
              <th className="sticky left-0 z-10 bg-white px-4 py-1" />
              {groups.map(({ track, sessions }) =>
                sessions.map((sess, i) => (
                  <th
                    key={`${track.slug}-${sess.week}-${sess.session}`}
                    className={`px-1.5 py-1 text-center font-normal tabular-nums ${i === 0 ? "border-l border-rule" : ""}`}
                    title={`${track.shortName || track.name} · ${track.unitLabel ?? "Week"} ${sess.week}${sess.session > 1 ? ` · session ${sess.session}` : ""}`}
                  >
                    {sess.week}
                    {sess.session > 1 ? `.${sess.session}` : ""}
                  </th>
                )),
              )}
              <th className="border-l border-rule" />
            </tr>
          </thead>
          <tbody>
            {learners.map((st) => {
              let att = 0;
              let exp = 0;
              return (
                <tr key={st.id} className="border-t border-rule-soft">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-1.5 font-medium text-ink">
                    {`${st.first_name ?? ""} ${st.last_name ?? ""}`.trim() || st.email}
                  </td>
                  {groups.map(({ track, sessions }) => {
                    const enrolled = enrolledByStudent.get(st.id)?.has(track.slug) ?? false;
                    return sessions.map((sess, i) => {
                      const went =
                        enrolled && attended.has(`${st.id}|${track.slug}|${sess.week}|${sess.session}`);
                      if (enrolled) {
                        exp += 1;
                        if (went) att += 1;
                      }
                      return (
                        <td
                          key={`${track.slug}-${sess.week}-${sess.session}`}
                          className={`px-1.5 py-1.5 text-center ${i === 0 ? "border-l border-rule" : ""} ${
                            !enrolled ? "text-ink-faint/50" : went ? "text-green-700" : "text-ink-faint"
                          }`}
                        >
                          {!enrolled ? "—" : went ? "✓" : "·"}
                        </td>
                      );
                    });
                  })}
                  <td className="border-l border-rule px-3 py-1.5 text-right tabular-nums text-ink">
                    {exp > 0 ? `${att}/${exp}` : "—"}
                  </td>
                </tr>
              );
            })}
            {/* Per-session turnout */}
            <tr className="border-t border-rule bg-paper-tint-soft text-ink-soft">
              <td className="sticky left-0 z-10 bg-paper-tint-soft px-4 py-1.5 font-semibold">
                Turnout
              </td>
              {groups.map(({ track, sessions }) =>
                sessions.map((sess, i) => {
                  const enrolledCount = learners.filter((st) =>
                    enrolledByStudent.get(st.id)?.has(track.slug),
                  ).length;
                  const went = learners.filter(
                    (st) =>
                      enrolledByStudent.get(st.id)?.has(track.slug) &&
                      attended.has(`${st.id}|${track.slug}|${sess.week}|${sess.session}`),
                  ).length;
                  return (
                    <td
                      key={`${track.slug}-${sess.week}-${sess.session}`}
                      className={`px-1.5 py-1.5 text-center tabular-nums ${i === 0 ? "border-l border-rule" : ""}`}
                      title={`${went} of ${enrolledCount} attended`}
                    >
                      {enrolledCount > 0 ? Math.round((went / enrolledCount) * 100) + "%" : "—"}
                    </td>
                  );
                }),
              )}
              <td className="border-l border-rule" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
