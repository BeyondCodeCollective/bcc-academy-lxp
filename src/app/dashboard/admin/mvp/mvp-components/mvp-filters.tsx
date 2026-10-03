"use client";

import { useId } from "react";
import type {
  MvpFilters as MvpFilterValues,
  MvpFilterOptions,
  MvpLearnerFilter,
} from "@/lib/mvp/types";

// The dashboard owns filter state. Options must already be restricted
// to programs and courses the signed-in administrator may access.
type MvpFiltersProps = {
  filters: MvpFilterValues;
  options: MvpFilterOptions;
  onChange: (filters: MvpFilterValues) => void;
  disabled?: boolean;
  programOnly?: boolean;
};

// Learner choices match the framework's participation and check-in views.
// These are filter choices, not mutually exclusive learner milestones.
const LEARNER_OPTIONS: Array<{
  value: MvpLearnerFilter;
  label: string;
}> = [
  { value: "all", label: "All learner statuses" },
  { value: "enrolled", label: "Enrolled before start" },
  { value: "started", label: "Started" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "needs_check_in", label: "Needs a check-in" },
];

// Controlled filter inputs report selections to the dashboard.
// The parent applies these selections to its data queries and exports.
export function MvpFilters({
  filters,
  options,
  onChange,
  disabled = false,
  programOnly = false,
}: MvpFiltersProps) {
  const id = useId();

  const courses = filters.programId
    ? options.courses.filter(
        (course) => course.programId === filters.programId,
      )
    : [];

  const cities = [...new Set([...options.cities, ...(filters.city ? [filters.city] : [])])].sort((a, b) =>
    a.localeCompare(b),
  );

  const invalidDateRange = Boolean(
    filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate,
  );

  const hasFilters =
    filters.programId !== null ||
    filters.courseSlug !== null ||
    filters.city !== null ||
    filters.learnerStatus !== "all" ||
    filters.startDate !== null ||
    filters.endDate !== null;

  const inputClass =
    "mt-1 block w-full rounded-lg border border-rule bg-white " +
    "px-3 py-2 text-sm text-ink " +
    "focus-visible:outline focus-visible:outline-2 " +
    "focus-visible:outline-offset-2 focus-visible:outline-primary " +
    "disabled:cursor-not-allowed disabled:opacity-50";

  // Changing a program clears its dependent course selection.
  // Other filter changes preserve the user's remaining selections.
  function updateFilter<K extends keyof MvpFilterValues>(
    key: K,
    value: MvpFilterValues[K],
  ) {
    onChange({ ...filters, [key]: value });
  }

  function clearFilters() {
    onChange({
      programId: null,
      courseSlug: null,
      city: null,
      learnerStatus: "all",
      startDate: null,
      endDate: null,
    });
  }

  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 space-y-5 rounded-xl border border-rule bg-white p-5"
    >
      <legend className="px-1 text-sm font-semibold text-ink">
        Filters
      </legend>

      <div>
        <label
          htmlFor={`${id}-program`}
          className="text-sm font-medium text-ink"
        >
          Program
        </label>

        <select
          id={`${id}-program`}
          value={filters.programId ?? ""}
          className={inputClass}
          onChange={(event) =>
            onChange({
              ...filters,
              programId: event.target.value || null,
              courseSlug: null,
            })
          }
        >
          <option value="">All accessible programs</option>

          {options.programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`${id}-course`}
          className="text-sm font-medium text-ink"
        >
          Course
        </label>

        <select
          id={`${id}-course`}
          value={filters.courseSlug ?? ""}
          disabled={!filters.programId || courses.length === 0}
          aria-describedby={`${id}-course-help`}
          className={inputClass}
          onChange={(event) =>
            updateFilter("courseSlug", event.target.value || null)
          }
        >
          <option value="">
            {!filters.programId
              ? "Choose a program first"
              : courses.length === 0
                ? "No available courses"
                : "All courses in this program"}
          </option>

          {courses.map((course) => (
            <option
              key={`${course.programId}-${course.slug}`}
              value={course.slug}
            >
              {course.name}
            </option>
          ))}
        </select>

        <p
          id={`${id}-course-help`}
          className="mt-1 text-xs text-ink-soft"
        >
          Course choices depend on the selected program.
        </p>
      </div>

      <div>
        <label
          htmlFor={`${id}-city`}
          className="text-sm font-medium text-ink"
        >
          Learner location
        </label>

        <select
          id={`${id}-city`}
          value={filters.city ?? ""}
          className={inputClass}
          onChange={(event) =>
            updateFilter("city", event.target.value || null)
          }
        >
          <option value="">All learner locations</option>

          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-soft">
          Uses profile location text, not verified city boundaries. Exact matches after trimming spaces.
          All locations includes learners with missing locations; a selected location excludes them.
        </p>
      </div>

      <div>
        <label
          htmlFor={`${id}-learner-status`}
          className="text-sm font-medium text-ink"
        >
          Learner status
        </label>

        <select
          id={`${id}-learner-status`}
          disabled={programOnly}
          value={filters.learnerStatus}
          className={inputClass}
          onChange={(event) => {
            const selected = LEARNER_OPTIONS.find(
              (option) => option.value === event.target.value,
            );

            if (selected) {
              updateFilter("learnerStatus", selected.value);
            }
          }}
        >
          {LEARNER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div>
          <label
            htmlFor={`${id}-start-date`}
            className="text-sm font-medium text-ink"
          >
            Start date
          </label>

          <input
            id={`${id}-start-date`}
            disabled={programOnly}
            type="date"
            value={filters.startDate ?? ""}
            max={filters.endDate ?? undefined}
            aria-invalid={invalidDateRange}
            aria-describedby={`${id}-date-help`}
            className={inputClass}
            onChange={(event) =>
              updateFilter("startDate", event.target.value || null)
            }
          />
        </div>

        <div>
          <label
            htmlFor={`${id}-end-date`}
            className="text-sm font-medium text-ink"
          >
            End date
          </label>

          <input
            id={`${id}-end-date`}
            disabled={programOnly}
            type="date"
            value={filters.endDate ?? ""}
            min={filters.startDate ?? undefined}
            aria-invalid={invalidDateRange}
            aria-describedby={`${id}-date-help`}
            className={inputClass}
            onChange={(event) =>
              updateFilter("endDate", event.target.value || null)
            }
          />
        </div>

        <p
          id={`${id}-date-help`}
          aria-live="polite"
          className={`text-xs ${
            invalidDateRange ? "text-red-700" : "text-ink-soft"
          }`}
        >
          {invalidDateRange
            ? "End date must be on or after start date."
            : "Leave both dates blank to include all available history."}
        </p>
      </div>

      <button
        type="button"
        disabled={!hasFilters}
        onClick={clearFilters}
        className="w-full rounded-lg border border-rule px-3 py-2
                   text-sm font-medium text-ink hover:bg-gray-50
                   focus-visible:outline focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-primary
                   disabled:cursor-not-allowed disabled:opacity-50"
      >
        Clear filters
      </button>
    </fieldset>
  );
}
