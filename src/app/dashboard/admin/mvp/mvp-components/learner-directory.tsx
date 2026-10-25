"use client";

import { useId, useState } from "react";
import type { LearnerFilters } from "./learner-filters";
import { LearnerEvidenceDrawer, type CourseEvidence } from "./learner-evidence";

export type DirectoryEnrollment = {
  programId: string; programName: string; courseSlug: string; courseName: string;
  cohort: { id: string; name: string } | null;
  attendance: { present: number; eligibleHeld: number } | null;
  lastActivity: { at: string | null; state: "recorded" | "none_recorded" | "unavailable" };
  status: "on_track" | "needs_check_in" | "not_evaluated";
  evidence?: CourseEvidence;
};
export type DirectoryLearner = {
  id: string; firstName: string | null; lastName: string | null; email: string | null;
  enrollments: DirectoryEnrollment[];
};
const statusLabels = { on_track: "On Track", needs_check_in: "Needs Check-in", not_evaluated: "Not evaluated" };

// Operates ONLY on a complete, already-authorized data slice. This is not an
// authorization layer or a substitute for server pagination of large rosters.
// Conflicting duplicate facts fail closed rather than selecting a random value.
export function selectDirectoryLearners(rows: DirectoryLearner[], filters: LearnerFilters): DirectoryLearner[] {
  const people = new Map<string, DirectoryLearner>();
  for (const row of rows) {
    const previous = people.get(row.id);
    if (previous && (previous.firstName !== row.firstName || previous.lastName !== row.lastName || previous.email !== row.email)) throw new Error("Conflicting learner profile records.");
    const enrollments = new Map<string, DirectoryEnrollment>();
    for (const enrollment of [...(previous?.enrollments ?? []), ...row.enrollments]) {
      const key = JSON.stringify([enrollment.programId, enrollment.courseSlug]);
      const existing = enrollments.get(key);
      if (existing && JSON.stringify(existing) !== JSON.stringify(enrollment)) throw new Error("Conflicting learner enrollment records.");
      enrollments.set(key, enrollment);
    }
    people.set(row.id, { ...row, enrollments: [...enrollments.values()] });
  }
  const search = filters.search.trim().toLocaleLowerCase("en-US");
  return [...people.values()].flatMap(row => {
    const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
    if (search && ![name, row.email ?? ""].some(value => value.toLocaleLowerCase("en-US").includes(search))) return [];
    const enrollments = row.enrollments.filter(e => (!filters.programId || e.programId === filters.programId) &&
      (!filters.courseSlug || e.courseSlug === filters.courseSlug) && (!filters.cohortId || e.cohort?.id === filters.cohortId) &&
      (filters.status === "all" || e.status === filters.status));
    return enrollments.length ? [{ ...row, enrollments }] : [];
  }).sort((a, b) => ([a.lastName, a.firstName].filter(Boolean).join(" ")).localeCompare([b.lastName, b.firstName].filter(Boolean).join(" "), "en-US") || a.id.localeCompare(b.id));
}
export function directoryPage<T>(rows: T[], page: number, size: number) {
  const pageSize = [10, 25, 50].includes(size) ? size : 25;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(pages, Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1));
  const offset = (current - 1) * pageSize;
  return { rows: rows.slice(offset, offset + pageSize), page: current, pages, start: rows.length ? offset + 1 : 0, end: Math.min(offset + pageSize, rows.length) };
}
function attendanceLabel(value: DirectoryEnrollment["attendance"]) {
  if (!value || !Number.isSafeInteger(value.present) || !Number.isSafeInteger(value.eligibleHeld) || value.present < 0 || value.eligibleHeld < value.present) return "Unavailable";
  return value.eligibleHeld === 0 ? "No eligible held sessions" : `${value.present}/${value.eligibleHeld} eligible held sessions`;
}
function Activity({ activity }: { activity: DirectoryEnrollment["lastActivity"] }) {
  if (activity.state === "none_recorded") return <>No recorded activity</>;
  if (activity.state !== "recorded" || !activity.at || !Number.isFinite(Date.parse(activity.at))) return <>Unavailable</>;
  const date = new Date(activity.at);
  return <time dateTime={date.toISOString()}>{date.toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</time>;
}

export function LearnerDirectory({ filters, learners, onViewEvidence }: {
  filters: LearnerFilters;
  learners?: DirectoryLearner[];
  onViewEvidence?: (learner: DirectoryLearner) => void;
}) {
  const id = useId();
  const [paging, setPaging] = useState({ scope: "", page: 1, size: 25 });
  const [selection, setSelection] = useState<{ id: string; scope: string } | null>(null);
  let matching: DirectoryLearner[] = [];
  let invalid = false;
  try { matching = selectDirectoryLearners(learners ?? [], filters); } catch { invalid = true; }
  // Never retain a later page when the filters or authorized result set changes.
  const scope = JSON.stringify([filters, matching.map(row => row.id)]);
  const page = directoryPage(matching, paging.scope === scope ? paging.page : 1, paging.size);
  const ready = learners !== undefined && !invalid;
  const selected = ready && selection?.scope === scope ? matching.find(row => row.id === selection.id) : undefined;
  const buttonClass = "min-h-11 rounded-lg border border-rule px-3 py-2 text-sm font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";
  return <section className="panel mt-6 min-w-0 p-5 sm:p-6" aria-labelledby={`${id}-heading`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id={`${id}-heading`} className="text-xl font-semibold text-ink">Learner directory</h2>
        <p className="mt-2 text-sm text-ink-soft">One row per learner · matching current enrollments only</p></div>
      <p role="status" className="text-sm text-ink-soft">{ready ? `${matching.length} matching ${matching.length === 1 ? "learner" : "learners"}` : "Learner count unavailable"}</p>
    </div>
    <div className="mt-5 overflow-x-auto rounded-lg border border-rule" tabIndex={0} role="region" aria-label="Scrollable learner directory">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <caption className="sr-only">Learners and their matching course-specific evidence. Activity times use Eastern Time.</caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-soft"><tr>
          {["Name & Email", "Matching enrollments", "Current cohort", "Verified attendance", "Last recorded course activity", "Status", "Action"].map(label => <th key={label} scope="col" className="px-4 py-4 font-semibold">{label}</th>)}
        </tr></thead>
        <tbody>{!ready || !matching.length ? <tr><td colSpan={7} className="px-4 py-12 text-center text-ink-soft">{invalid ? "Learner records are inconsistent. Results are unavailable." : learners === undefined ? "The learner directory is not connected yet. No sample learners are displayed." : "No learners match the applied filters."}</td></tr>
          : page.rows.map(learner => <tr key={learner.id} className="border-t border-rule align-top">
            <th scope="row" className="px-4 py-5 font-medium text-ink"><span className="block">{[learner.firstName, learner.lastName].filter(Boolean).join(" ") || "Name unavailable"}</span><span className="mt-1 block break-all text-xs font-normal text-ink-soft">{learner.email || "Email unavailable"}</span></th>
            <td className="px-4 py-5"><ul className="space-y-4">{learner.enrollments.map(e => <li key={`${e.programId}:${e.courseSlug}`}><span className="block font-medium">{e.courseName}</span><span className="text-xs text-ink-soft">{e.programName}</span></li>)}</ul></td>
            <td className="px-4 py-5"><ul className="space-y-4">{learner.enrollments.filter(e => e.cohort).map(e => <li key={`${e.programId}:${e.courseSlug}`}><span className="block text-xs text-ink-soft">{e.courseName}</span>{e.cohort!.name}</li>)}</ul></td>
            <td className="px-4 py-5"><ul className="space-y-4">{learner.enrollments.map(e => <li key={`${e.programId}:${e.courseSlug}`}><span className="block text-xs text-ink-soft">{e.courseName}</span>{attendanceLabel(e.attendance)}</li>)}</ul></td>
            <td className="px-4 py-5"><ul className="space-y-4">{learner.enrollments.map(e => <li key={`${e.programId}:${e.courseSlug}`}><span className="block text-xs text-ink-soft">{e.courseName}</span><Activity activity={e.lastActivity} /></li>)}</ul></td>
            <td className="px-4 py-5"><ul className="space-y-4">{learner.enrollments.map(e => <li key={`${e.programId}:${e.courseSlug}`}><span className="mb-1 block text-xs text-ink-soft">{e.courseName}</span><span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${e.status === "needs_check_in" ? "bg-amber-50 text-amber-800" : e.status === "on_track" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-ink-soft"}`}>{statusLabels[e.status] ?? "Not evaluated"}</span></li>)}</ul></td>
            <td className="px-4 py-5"><button type="button" className={`${buttonClass} whitespace-nowrap text-primary`} onClick={() => { setSelection({ id: learner.id, scope }); onViewEvidence?.(learner); }} aria-haspopup="dialog" aria-label={`View evidence for ${[learner.firstName, learner.lastName].filter(Boolean).join(" ") || "learner"}`}>View Evidence</button></td>
          </tr>)}</tbody>
      </table>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <label className="flex items-center gap-2 text-sm text-ink-soft" htmlFor={`${id}-size`}>Rows per page<select id={`${id}-size`} className={`${buttonClass} bg-white`} value={paging.size} onChange={event => setPaging({ scope, page: 1, size: Number(event.target.value) })}>{[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}</select></label>
      <div className="flex flex-wrap items-center gap-3"><span className="text-xs text-ink-soft">{ready ? `Showing ${page.start}–${page.end} of ${matching.length}` : "Results unavailable"}</span>
        <button type="button" className={buttonClass} disabled={!ready || page.page === 1} onClick={() => setPaging({ ...paging, scope, page: page.page - 1 })}>Previous</button>
        <span className="text-xs text-ink-soft">Page {page.page} of {page.pages}</span>
        <button type="button" className={buttonClass} disabled={!ready || page.page === page.pages} onClick={() => setPaging({ ...paging, scope, page: page.page + 1 })}>Next</button>
      </div>
    </div>
    {selected && <LearnerEvidenceDrawer key={`${scope}:${selected.id}`} learner={selected} onClose={() => setSelection(null)} />}
  </section>;
}
