"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, FileText, Loader2 } from "lucide-react";
import { getTrackProgress, type TrackProgress } from "./actions-progress";

type StudentRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

// Self-paced completion view. Self-paced courses have no class to attend, so
// "did they engage" means: did they watch each week's recording and turn in
// the work. Mirrors the attendance grid's shape (student × week) but each cell
// carries two signals — watched (eye) and uploaded (doc).
export function ProgressTab({
  students,
  trackSlug,
  totalWeeks,
  viewSwitcher,
}: {
  students: StudentRow[];
  trackSlug: string;
  totalWeeks: number;
  viewSwitcher?: React.ReactNode;
}) {
  const [data, setData] = useState<TrackProgress | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    getTrackProgress(trackSlug)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ watched: {}, submitted: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [trackSlug]);

  const weeks = useMemo(
    () => Array.from({ length: totalWeeks }, (_, i) => i + 1),
    [totalWeeks],
  );

  const name = (s: StudentRow) =>
    `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.email;

  return (
    <div className="space-y-4">
      {viewSwitcher && (
        <div className="flex flex-wrap items-center gap-2">{viewSwitcher}</div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-ink-faint">
        <span className="inline-flex items-center gap-1.5">
          <Eye size={12} className="text-green-600" /> Watched
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileText size={12} className="text-green-600" /> Uploaded work
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] border border-rule bg-paper-tint" /> Not yet
        </span>
      </div>

      {data === null ? (
        <div className="flex items-center gap-2 panel p-8 text-sm text-ink-soft">
          <Loader2 size={14} className="animate-spin" /> Loading progress…
        </div>
      ) : students.length === 0 ? (
        <div className="panel p-8 text-center text-sm text-ink-soft">
          No students enrolled yet.
        </div>
      ) : (
        <div className="overflow-x-auto panel">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule">
                <th className="sticky left-0 z-10 bg-paper px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Student
                </th>
                {weeks.map((w) => (
                  <th
                    key={w}
                    className="px-2 py-2.5 text-center text-[11px] font-semibold text-ink-faint tabular-nums"
                  >
                    {w}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const watched = new Set(data.watched[s.id] ?? []);
                const submitted = new Set(data.submitted[s.id] ?? []);
                return (
                  <tr key={s.id} className="border-b border-rule-soft last:border-0">
                    <td className="sticky left-0 z-10 bg-paper px-4 py-2.5">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {name(s)}
                      </p>
                      <p className="truncate text-[11px] text-ink-faint">{s.email}</p>
                    </td>
                    {weeks.map((w) => (
                      <td key={w} className="px-2 py-2.5 text-center">
                        <Cell watched={watched.has(w)} uploaded={submitted.has(w)} />
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right text-[12px] text-ink-soft whitespace-nowrap tabular-nums">
                      <span className="text-green-700">{watched.size}</span>
                      <span className="text-ink-faint"> · </span>
                      <span className="text-green-700">{submitted.size}</span>
                      <span className="text-ink-faint">/{totalWeeks}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// One week's two signals: a watched (eye) and an uploaded (doc) pip. Green when
// done, faint outline when not — so a glance down a column reads as engagement.
function Cell({ watched, uploaded }: { watched: boolean; uploaded: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={`${watched ? "Watched" : "Not watched"} · ${uploaded ? "Uploaded" : "No upload"}`}
    >
      <Eye
        size={13}
        className={watched ? "text-green-600" : "text-ink-faint/30"}
      />
      <FileText
        size={13}
        className={uploaded ? "text-green-600" : "text-ink-faint/30"}
      />
    </span>
  );
}
