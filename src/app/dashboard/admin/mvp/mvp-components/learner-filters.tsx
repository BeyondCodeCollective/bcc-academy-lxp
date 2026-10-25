"use client";

import { useEffect, useId, useReducer, useState } from "react";
import { Search } from "lucide-react";

export type LearnerFilters = {
  search: string;
  programId: string;
  courseSlug: string;
  cohortId: string;
  status: "all" | "on_track" | "needs_check_in" | "not_evaluated";
};
export type LearnerFilterOptions = {
  programs: { id: string; name: string }[];
  courses: { programId: string; slug: string; name: string }[];
  cohorts: { id: string; programId: string; courseSlug: string; name: string }[];
};
export const EMPTY_LEARNER_FILTERS: LearnerFilters = {
  search: "", programId: "", courseSlug: "", cohortId: "", status: "all",
};
type Change = { type: "clear" } | { type: "change"; field: keyof LearnerFilters; value: string };
export function changeLearnerFilters(state: LearnerFilters, action: Change): LearnerFilters {
  if (action.type === "clear") return { ...EMPTY_LEARNER_FILTERS };
  if (action.field === "programId") return { ...state, programId: action.value, courseSlug: "", cohortId: "" };
  if (action.field === "courseSlug") return { ...state, courseSlug: action.value, cohortId: "" };
  if (action.field === "status" && !["all", "on_track", "needs_check_in", "not_evaluated"].includes(action.value)) return state;
  return { ...state, [action.field]: action.value };
}

// Options must come from a future authorized server loader, never a global
// course registry. Client-side narrowing is UX, not a permission boundary.
// This frontend preview deliberately does not write URLs or shared storage.
export function LearnerFilterBar({ options }: { options?: LearnerFilterOptions }) {
  const id = useId();
  const [draft, dispatch] = useReducer(changeLearnerFilters, EMPTY_LEARNER_FILTERS);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(draft.search.trim()), 300);
    return () => clearTimeout(timer);
  }, [draft.search]);
  const courses = options?.courses.filter(course => course.programId === draft.programId) ?? [];
  const cohorts = options?.cohorts.filter(cohort => cohort.programId === draft.programId && cohort.courseSlug === draft.courseSlug) ?? [];
  const change = (field: keyof LearnerFilters, value: string) => {
    dispatch({ type: "change", field, value });
    setNotice("");
  };
  const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-lg border border-rule bg-white px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";
  const labelClass = "min-w-0 flex-1 basis-44 text-sm font-medium text-ink";
  const hasFilters = Object.entries(draft).some(([key, value]) => key === "status" ? value !== "all" : Boolean(value));
  return <section className="panel min-w-0 p-5 sm:p-6" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`} className="text-xl font-semibold text-ink">Search and filters</h2>
    <p id={`${id}-help`} className="mt-2 text-sm text-ink-soft">Search by name or email. These selections stay on the Learners page.</p>
    <form className="mt-5" aria-label="Learner filters" aria-describedby={`${id}-availability`} onSubmit={event => {
      event.preventDefault();
      setSearch(draft.search.trim());
      setNotice("Filter preview updated. Learner results are not connected yet.");
    }}>
      <label htmlFor={`${id}-search`} className="block text-sm font-medium text-ink">Search learners</label>
      <div className="relative mt-2">
        <Search aria-hidden="true" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
        <input id={`${id}-search`} type="search" autoComplete="off" maxLength={200} placeholder="Search by name or email…" value={draft.search}
          onChange={event => change("search", event.target.value)} aria-describedby={`${id}-help`}
          className={`${inputClass} mt-0 pl-10`} />
      </div>
      <div className="mt-5 flex flex-wrap gap-4">
        <label className={labelClass} htmlFor={`${id}-program`}>Program
          <select id={`${id}-program`} className={inputClass} value={draft.programId} disabled={!options?.programs.length} onChange={event => change("programId", event.target.value)}>
            <option value="">{options ? "All authorized programs" : "Program options not connected"}</option>
            {options?.programs.map(program => <option key={program.id} value={program.id}>{program.name}</option>)}
          </select>
        </label>
        <label className={labelClass} htmlFor={`${id}-course`}>Course / Track
          <select id={`${id}-course`} className={inputClass} value={draft.courseSlug} disabled={!draft.programId || !courses.length} onChange={event => change("courseSlug", event.target.value)}>
            <option value="">{draft.programId ? "All courses in this program" : "Choose a program first"}</option>
            {courses.map(course => <option key={course.slug} value={course.slug}>{course.name}</option>)}
          </select>
        </label>
        <label className={labelClass} htmlFor={`${id}-cohort`}>Current cohort
          <select id={`${id}-cohort`} className={inputClass} value={draft.cohortId} disabled={!draft.courseSlug || !cohorts.length} onChange={event => change("cohortId", event.target.value)}>
            <option value="">{draft.courseSlug ? "All current cohorts" : "Choose a course first"}</option>
            {cohorts.map(cohort => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
          </select>
        </label>
        <label className={labelClass} htmlFor={`${id}-status`}>Status
          <select id={`${id}-status`} className={inputClass} value={draft.status} onChange={event => change("status", event.target.value)}>
            <option value="all">All learners</option>
            <option value="on_track">On Track</option>
            <option value="needs_check_in">Needs Check-in</option>
            <option value="not_evaluated">Not evaluated</option>
          </select>
        </label>
      </div>
      <div className="mt-5 flex flex-col gap-4 border-t border-rule pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p id={`${id}-availability`} className="max-w-xl text-xs text-ink-soft">Layout preview: authorized program, course, and cohort options and learner results are not connected yet.</p>
        <div className="flex shrink-0 flex-wrap gap-3">
          <button type="button" disabled={!hasFilters} className="min-h-11 rounded-lg border border-rule px-4 py-2 text-sm font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50" onClick={() => {
            dispatch({ type: "clear" }); setSearch(""); setNotice("Learner selections cleared.");
          }}>Clear filters</button>
          <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Apply Filters</button>
        </div>
      </div>
      <p role="status" className="mt-3 text-xs text-ink-soft">{notice || (search ? "Search text ready. Results will be available when the directory is connected." : "")}</p>
    </form>
  </section>;
}
