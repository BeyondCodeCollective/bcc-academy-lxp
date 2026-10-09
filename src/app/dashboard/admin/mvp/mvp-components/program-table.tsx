"use client";

import { useId, useState } from "react";
import type { MvpProgramRow } from "@/lib/mvp/types";

// The dashboard supplies already-filtered, authorized program rows.
// Details buttons appear when a program-detail handler is connected.
type ProgramTableProps = {
  programs: MvpProgramRow[];
  onSelectProgram?: (program: MvpProgramRow) => void;
};

type SortKey =
  | "programName"
  | "status"
  | "startDate"
  | "endDate"
  | "totalParticipants"
  | "started"
  | "attendanceQualified"
  | "active"
  | "completed"
  | "attendanceRate"
  | "completionRate"
  | "learnersNeedingCheckIn";

type SortDirection = "asc" | "desc";

// Table labels describe the stored values without inventing health thresholds.
const STATUS_LABELS: Record<MvpProgramRow["status"], string> = {
  starting_soon: "Starting soon",
  active: "Active",
  completed: "Completed",
  unknown: "Not available",
};

const COLUMNS: Array<{
  key: SortKey;
  label: string;
  numeric?: boolean;
}> = [
  { key: "programName", label: "Program / course / cohort" },
  { key: "status", label: "Status" },
  { key: "startDate", label: "Start date" },
  { key: "endDate", label: "End date" },
  { key: "totalParticipants", label: "Participants", numeric: true },
  { key: "started", label: "Started", numeric: true },
  { key: "attendanceQualified", label: "Meets 80% attendance", numeric: true },
  { key: "active", label: "Active learners", numeric: true },
  { key: "completed", label: "Completed", numeric: true },
  { key: "attendanceRate", label: "Attendance", numeric: true },
  { key: "completionRate", label: "Completion", numeric: true },
  {
    key: "learnersNeedingCheckIn",
    label: "Needs check-in",
    numeric: true,
  },
];

// Sorting changes only presentation order. The original data is preserved,
// and missing values stay at the bottom in either sorting direction.
export function ProgramTable({
  programs,
  onSelectProgram,
}: ProgramTableProps) {
  const id = useId();
  const [sortKey, setSortKey] = useState<SortKey>("programName");
  const [direction, setDirection] = useState<SortDirection>("asc");

  const sortedPrograms = [...programs].sort((a, b) => {
    const first = getSortValue(a, sortKey);
    const second = getSortValue(b, sortKey);

    if (first === null && second === null) return 0;
    if (first === null) return 1;
    if (second === null) return -1;

    const comparison =
      typeof first === "number" && typeof second === "number"
        ? first - second
        : String(first).localeCompare(String(second), "en", {
            numeric: true,
            sensitivity: "base",
          });

    return direction === "asc" ? comparison : -comparison;
  });

  function changeSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setDirection("asc");
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-4">
      <header>
        <h2
          id={`${id}-heading`}
          className="text-xl font-semibold text-ink"
        >
          Program performance
        </h2>

      </header>

      <div
        role="region"
        aria-labelledby={`${id}-heading`}
        tabIndex={0}
        className="overflow-x-auto rounded-xl border border-rule bg-white
                   focus-visible:outline focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <table
          className="w-full border-collapse text-left text-sm"
        >
          <caption className="sr-only">
            Program participation, attendance, completion, and check-in counts
            for the applied dashboard filters.
          </caption>

          <thead className="border-b border-rule bg-gray-50">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    sortKey === column.key
                      ? direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={`px-4 py-3 font-semibold text-ink ${
                    column.numeric ? "text-right" : "text-left"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => changeSort(column.key)}
                    className="inline-flex items-center gap-2 rounded
                               focus-visible:outline focus-visible:outline-2
                               focus-visible:outline-offset-2
                               focus-visible:outline-primary"
                  >
                    {column.label}

                    <span aria-hidden="true">
                      {sortKey === column.key
                        ? direction === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                </th>
              ))}

              {onSelectProgram && (
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Program details</span>
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {sortedPrograms.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length + (onSelectProgram ? 1 : 0)}
                  className="px-4 py-10 text-center text-ink-soft"
                >
                  No program offerings match the applied filters.
                </td>
              </tr>
            ) : (
              sortedPrograms.map((program) => (
                <tr
                  key={program.id}
                  className="border-b border-rule last:border-b-0
                             hover:bg-gray-50"
                >
                  <th
                    scope="row"
                    className="min-w-56 px-4 py-4 text-left font-normal"
                  >
                    <p className="font-medium text-ink">
                      {program.programName}
                    </p>

                    {program.courseName && (
                      <p className="mt-1 text-xs text-ink-soft">
                        {program.courseName}
                      </p>
                    )}

                    {program.cohortName && (
                      <p className="mt-1 text-xs text-ink-soft">
                        {program.cohortName}
                      </p>
                    )}
                  </th>

                  <td className="whitespace-nowrap px-4 py-4 text-ink">
                    {STATUS_LABELS[program.status]}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-ink-soft">
                    {program.startDate ?? "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-ink-soft">
                    {program.endDate ?? "—"}
                  </td>

                  <NumberCell value={program.totalParticipants} />
                  <NumberCell value={program.started} />
                  <NumberCell value={program.attendanceQualified ?? null} />
                  <NumberCell value={program.active} />
                  <NumberCell value={program.completed} />
                  <NumberCell value={program.attendanceRate} percentage />
                  <NumberCell value={program.completionRate} percentage />
                  <NumberCell value={program.learnersNeedingCheckIn} />

                  {onSelectProgram && (
                    <td className="whitespace-nowrap px-4 py-4">
                      <button
                        type="button"
                        onClick={() => onSelectProgram(program)}
                        aria-label={`View details for ${[
                          program.programName,
                          program.courseName,
                          program.cohortName,
                        ]
                          .filter(Boolean)
                          .join(", ")}`}
                        className="rounded text-sm font-medium text-primary
                                   hover:underline focus-visible:outline
                                   focus-visible:outline-2
                                   focus-visible:outline-offset-2
                                   focus-visible:outline-primary"
                      >
                        View details
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Status sorts by its displayed label. Unknown status sorts as missing.
// ISO date strings sort chronologically without timezone conversion.
function getSortValue(
  program: MvpProgramRow,
  key: SortKey,
): string | number | null {
  if (key === "status") {
    return program.status === "unknown"
      ? null
      : STATUS_LABELS[program.status];
  }

  return program[key] ?? null;
}

// Percentages use the shared 0–100 convention. Zero remains visible,
// while unavailable measurements receive an accessible missing-value label.
function NumberCell({
  value,
  percentage = false,
}: {
  value: number | null;
  percentage?: boolean;
}) {
  return (
    <td className="px-4 py-4 text-right tabular-nums text-ink">
      {value === null ? (
        <span aria-label="Not available">—</span>
      ) : (
        <>
          {new Intl.NumberFormat("en-US", {
            maximumFractionDigits: percentage ? 1 : 0,
          }).format(value)}
          {percentage ? "%" : ""}
        </>
      )}
    </td>
  );
}
