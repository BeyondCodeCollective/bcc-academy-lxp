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
    () =>
      startedTracks.map((track) => {
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
      }),
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
        {rows.map(({ track, students: count, avg, atRisk }) => (
          <tr key={track.slug} className="transition-colors hover:bg-paper-tint-soft">
            <td className="px-4 py-3">
              <Link
                href={`/dashboard/admin?tab=${encodeURIComponent(track.slug)}&view=analytics`}
                className="text-sm font-medium text-ink underline-offset-2 hover:text-primary hover:underline"
              >
                {track.name}
              </Link>
            </td>
            <td className="px-4 py-3 text-right"><Num value={count} /></td>
            <td className="px-4 py-3 text-right tabular-nums text-ink">
              {avg !== null ? `${avg}%` : "—"}
            </td>
            <td className="px-4 py-3 text-right">
              {atRisk > 0 ? (
                <StatusChip tone={atRisk >= Math.max(2, Math.ceil(count / 2)) ? "danger" : "warning"}>
                  {atRisk}
                </StatusChip>
              ) : (
                <Num value={0} />
              )}
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
