"use client";

import { Fragment, useMemo, useState } from "react";
import { BookOpenText, CheckCircle, Circle, ClipboardText, UserCheck, WarningCircle } from "@phosphor-icons/react";
import type { EngagementLearner, WeekCell, WeekGrid as WeekGridData } from "./actions-analytics";
import { getWeekPicture, type WeekPicture } from "./actions-tracks";
import { HomeworkAnswer } from "./attendance-tab";
import { microLabel } from "@/components/ui";

// Week by week for one course, one row per learner, so an instructor sees in
// one place how each week's content is landing and who is slipping
// (Field Ready feedback, 2026-11-16). Falling-behind learners sort first.

const EMPTY: WeekCell = { here: false, opened: [], homework: 0 };

export function WeekGrid({
  grid,
  learners,
  track,
}: {
  grid: WeekGridData;
  learners: EngagementLearner[];
  track: string;
}) {
  const unit = grid.unitLabel;
  const latest = grid.weeks[grid.weeks.length - 1]?.week ?? 0;
  const behind = useMemo(() => new Set(grid.behind), [grid.behind]);
  const rows = useMemo(
    () =>
      learners
        .filter((l) => l.tracks.includes(track))
        .sort(
          (a, b) =>
            Number(behind.has(b.email)) - Number(behind.has(a.email)) ||
            (a.name || a.email).localeCompare(b.name || b.email),
        ),
    [learners, track, behind],
  );
  const nameOf = (email: string) => rows.find((r) => r.email === email)?.name || email;

  // One open drill-in at a time: a learner-week, or a whole week's viewers.
  const [openCell, setOpenCell] = useState<{ email: string; week: number } | null>(null);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [pictures, setPictures] = useState<Record<number, WeekPicture | "loading" | "error">>({});

  const loadPicture = (week: number) => {
    if (pictures[week]) return;
    setPictures((p) => ({ ...p, [week]: "loading" }));
    getWeekPicture(track, week)
      .then((data) => setPictures((p) => ({ ...p, [week]: data })))
      .catch(() => setPictures((p) => ({ ...p, [week]: "error" })));
  };

  const cellOf = (email: string, week: number) => grid.cells[email]?.[week] ?? EMPTY;
  const openedCount = (week: number) =>
    rows.filter((r) => cellOf(r.email, week).opened.length > 0).length;
  const behindCount = rows.filter((r) => behind.has(r.email)).length;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={microLabel}>{unit} by {unit.toLowerCase()}</h2>
        <p className="text-sm text-ink-soft">
          {behindCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-ink">
              <WarningCircle size={16} weight="fill" className="text-primary" aria-hidden />
              {behindCount} falling behind
            </span>
          ) : (
            "Nobody falling behind"
          )}
          <span className="text-ink-faint"> · nothing in {unit} {latest} yet</span>
        </p>
      </div>
      <Legend />

      <div className="panel overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule">
              <th scope="col" className="sticky left-0 z-10 bg-surface px-4 py-2.5 text-left text-micro font-semibold text-ink-faint">
                Learner
              </th>
              {grid.weeks.map((w) => {
                const open = openWeek === w.week;
                return (
                  <th key={w.week} scope="col" className="px-1.5 py-1.5 text-left font-normal">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => {
                        setOpenCell(null);
                        setOpenWeek(open ? null : w.week);
                      }}
                      className={`w-full min-w-[7.5rem] rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-paper-tint-soft ${open ? "bg-paper-tint-soft" : ""}`}
                    >
                      <span className="block text-micro font-semibold text-ink">{unit} {w.week}</span>
                      <span className="block text-micro text-ink-faint tabular-nums">
                        {w.materials.length > 0 ? `${openedCount(w.week)} of ${rows.length} opened` : "No materials"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {openWeek !== null && (
              <tr className="border-b border-rule bg-paper-tint-soft/60">
                <td colSpan={grid.weeks.length + 1} className="px-4 py-3">
                  {/* Pinned to the visible width: the table scrolls sideways on a phone. */}
                  <div className="sticky left-4 w-[min(72rem,calc(100vw-4rem))]">
                  <WeekViewers
                    week={grid.weeks.find((w) => w.week === openWeek)!}
                    unit={unit}
                    viewers={(i) =>
                      rows.filter((r) => cellOf(r.email, openWeek).opened.includes(i)).map((r) => r.name || r.email)
                    }
                    total={rows.length}
                  />
                  </div>
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const isBehind = behind.has(r.email);
              const expanded = openCell?.email === r.email ? openCell.week : null;
              return (
                <Fragment key={r.email}>
                  <tr className="border-b border-rule last:border-b-0">
                    <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-2 text-left font-normal">
                      <span className="flex items-center gap-1.5">
                        {isBehind && (
                          <WarningCircle size={14} weight="fill" className="shrink-0 text-primary" aria-label="Falling behind" />
                        )}
                        <span className={`max-w-[14rem] truncate ${isBehind ? "font-medium text-ink" : "text-ink"}`} title={r.email}>
                          {r.name || r.email}
                        </span>
                      </span>
                    </th>
                    {grid.weeks.map((w) => {
                      const c = cellOf(r.email, w.week);
                      const open = expanded === w.week;
                      const total = w.materials.length;
                      const label = `${r.name || r.email}, ${unit} ${w.week}: ${c.here ? "attended" : "did not attend"}, opened ${c.opened.length} of ${total} materials, ${c.homework > 0 ? "homework turned in" : w.homeworkExpected ? "no homework yet" : "no homework asked"}`;
                      return (
                        <td key={w.week} className="px-1.5 py-1">
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-label={label}
                            onClick={() => {
                              setOpenWeek(null);
                              setOpenCell(open ? null : { email: r.email, week: w.week });
                              if (!open && c.homework > 0) loadPicture(w.week);
                            }}
                            className={`flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 transition-colors hover:bg-paper-tint-soft ${open ? "bg-paper-tint-soft ring-1 ring-rule" : ""}`}
                          >
                            <UserCheck size={16} weight={c.here ? "fill" : "regular"} className={c.here ? "text-primary" : "text-ink-faint/50"} aria-hidden />
                            <span className={`inline-flex items-center gap-1 tabular-nums text-xs ${c.opened.length > 0 ? "text-ink" : "text-ink-faint/70"}`}>
                              <BookOpenText size={16} weight={c.opened.length > 0 ? "fill" : "regular"} className={c.opened.length > 0 ? "text-primary" : "text-ink-faint/50"} aria-hidden />
                              {total > 0 ? `${c.opened.length}/${total}` : "–"}
                            </span>
                            {(w.homeworkExpected || c.homework > 0) && (
                              <ClipboardText size={16} weight={c.homework > 0 ? "fill" : "regular"} className={c.homework > 0 ? "text-primary" : "text-ink-faint/50"} aria-hidden />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                  {expanded !== null && (
                    <tr className="border-b border-rule bg-paper-tint-soft/60">
                      <td colSpan={grid.weeks.length + 1} className="px-4 py-3">
                  {/* Pinned to the visible width: the table scrolls sideways on a phone. */}
                  <div className="sticky left-4 w-[min(72rem,calc(100vw-4rem))]">
                        <LearnerWeek
                          name={nameOf(r.email)}
                          unit={unit}
                          week={grid.weeks.find((w) => w.week === expanded)!}
                          cell={cellOf(r.email, expanded)}
                          picture={pictures[expanded]}
                          studentId={grid.ids[r.email]}
                        />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Legend() {
  const item = "inline-flex items-center gap-1";
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-micro text-ink-faint">
      <span className={item}><UserCheck size={14} weight="fill" className="text-primary" aria-hidden /> Attended</span>
      <span className={item}><BookOpenText size={14} weight="fill" className="text-primary" aria-hidden /> Materials opened</span>
      <span className={item}><ClipboardText size={14} weight="fill" className="text-primary" aria-hidden /> Homework in</span>
      <span>Select a cell or a column for details</span>
    </p>
  );
}

type Material = WeekGridData["weeks"][number]["materials"][number];
type Kind = "required" | "homework" | "optional";

const KINDS: { kind: Kind; title: string }[] = [
  { kind: "required", title: "Required" },
  { kind: "homework", title: "Homework" },
  { kind: "optional", title: "Optional" },
];

/** Material labels carry their role as a prefix ("optional: Skills in
 *  Gemini", "homework part one: Make a morning brief"), the same convention the
 *  learner week page reads. Split it off so the list can group by role and
 *  show the bare title. */
function classify(name: string): { kind: Kind; title: string; part?: string } {
  const clean = name.replace(/\s+,/g, ",").replace(/\s+/g, " ").trim();
  const hw = clean.match(/^homework\b\s*(part\s+[^:]+)?:\s*(.*)$/i);
  if (hw) {
    const part = hw[1]?.replace(/^part\s+/i, "");
    return { kind: "homework", title: hw[2] || clean, part: part ? `Part ${part}` : undefined };
  }
  const opt = clean.match(/^optional\s*:\s*(.*)$/i);
  if (opt) return { kind: "optional", title: opt[1] || clean };
  return { kind: "required", title: clean };
}

/** Group a week's materials by role, keeping curriculum order and each
 *  material's index (cells store opened materials by index). */
function grouped(materials: Material[]) {
  const items = materials.map((m, i) => ({ i, url: m.url, ...classify(m.name) }));
  return KINDS.map((k) => ({ ...k, items: items.filter((it) => it.kind === k.kind) })).filter(
    (g) => g.items.length > 0,
  );
}

/** One learner's week as a checklist: what they opened is checked, what they
 *  skipped is a hollow ring, split into required, homework and optional. */
function MaterialChecklist({
  materials,
  opened,
  compact = false,
}: {
  materials: Material[];
  opened: number[];
  compact?: boolean;
}) {
  const groups = grouped(materials);
  const text = compact ? "text-xs" : "text-sm";
  return (
    <div className={`grid gap-x-8 gap-y-4 ${groups.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
      {groups.map((g) => {
        const done = g.items.filter((it) => opened.includes(it.i)).length;
        return (
          <div key={g.kind} className="min-w-0">
            <p className="mb-1.5 flex items-baseline justify-between gap-3 border-b border-rule pb-1 text-micro font-semibold text-ink-faint">
              <span>{g.title}</span>
              <span className="tabular-nums font-medium">
                {done} of {g.items.length}
              </span>
            </p>
            <ul className={compact ? "space-y-1" : "space-y-1.5"}>
              {g.items.map((it) => {
                const seen = opened.includes(it.i);
                return (
                  <li key={it.url} className={`flex items-start gap-2 ${text}`}>
                    {seen ? (
                      <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-primary" aria-label="Opened" />
                    ) : (
                      <Circle size={16} className="mt-0.5 shrink-0 text-ink-faint/60" aria-label="Not opened" />
                    )}
                    <span className={`min-w-0 ${seen ? "text-ink" : "text-ink-soft"}`}>
                      {it.part && <span className="mr-1.5 text-micro font-semibold text-ink-faint">{it.part}</span>}
                      {it.title}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function WeekViewers({
  week,
  unit,
  viewers,
  total,
}: {
  week: WeekGridData["weeks"][number];
  unit: string;
  viewers: (materialIndex: number) => string[];
  total: number;
}) {
  if (week.materials.length === 0) {
    return <p className="text-sm text-ink-soft">{unit} {week.week} has no materials.</p>;
  }
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm font-medium text-ink">Who opened each {unit.toLowerCase()} {week.week} material</p>
      {grouped(week.materials).map((g) => (
        <div key={g.kind}>
          <p className="mb-1 border-b border-rule pb-1 text-micro font-semibold text-ink-faint">{g.title}</p>
          <ul className="divide-y divide-rule/60">
            {g.items.map((it) => {
              const names = viewers(it.i);
              const pct = total > 0 ? (names.length / total) * 100 : 0;
              return (
                <li key={it.url} className="grid gap-x-6 gap-y-1 py-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
                  <div className="min-w-0">
                    <p className="text-sm text-ink">
                      {it.part && <span className="mr-1.5 text-micro font-semibold text-ink-faint">{it.part}</span>}
                      {it.title}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-micro text-ink-soft">
                      {names.length > 0 ? names.map((n) => <span key={n}>{n}</span>) : <span className="text-ink-faint">Nobody yet</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:pt-1">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-rule" aria-hidden>
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-14 text-right text-micro tabular-nums text-ink-soft">
                      {names.length} of {total}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function LearnerWeek({
  name,
  unit,
  week,
  cell,
  picture,
  studentId,
}: {
  name: string;
  unit: string;
  week: WeekGridData["weeks"][number];
  cell: WeekCell;
  picture: WeekPicture | "loading" | "error" | undefined;
  studentId: string | undefined;
}) {
  const homework =
    picture && picture !== "loading" && picture !== "error"
      ? Object.entries(picture.homework).filter(([key]) => key.split("|")[0] === studentId)
      : [];
  const total = week.materials.length;
  const fact = "inline-flex items-center gap-1.5";
  const icon = (on: boolean) => (on ? "text-primary" : "text-ink-faint/60");
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink">
          {name} <span className="font-normal text-ink-faint">· {unit} {week.week}</span>
        </p>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
          <span className={fact}>
            <UserCheck size={16} weight={cell.here ? "fill" : "regular"} className={icon(cell.here)} aria-hidden />
            {cell.here ? "Attended" : "Did not attend"}
          </span>
          {total > 0 && (
            <span className={`${fact} tabular-nums`}>
              <BookOpenText size={16} weight={cell.opened.length > 0 ? "fill" : "regular"} className={icon(cell.opened.length > 0)} aria-hidden />
              Opened {cell.opened.length} of {total}
            </span>
          )}
          <span className={fact}>
            <ClipboardText size={16} weight={cell.homework > 0 ? "fill" : "regular"} className={icon(cell.homework > 0)} aria-hidden />
            {cell.homework > 0 ? "Homework turned in" : week.homeworkExpected ? "No homework yet" : "No homework asked"}
          </span>
        </p>
      </div>
      {total > 0 && <MaterialChecklist materials={week.materials} opened={cell.opened} />}
      {cell.homework > 0 &&
        (picture === "loading" || picture === undefined ? (
          <p className="text-sm text-ink-faint">Loading homework…</p>
        ) : picture === "error" ? (
          <p className="text-sm text-ink-soft">Could not load the homework here; open the Students tab to read it.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {homework.map(([key, hw]) => (
              <HomeworkAnswer key={key} hw={hw} label={`Session ${key.split("|")[1]} homework`} />
            ))}
          </div>
        ))}
    </div>
  );
}

/** Every material a learner opened and skipped, week by week, for the
 *  per-learner table's "Content opened" drill-down. Same checklist as a grid
 *  cell, laid out for one learner across the whole course. */
export function LearnerMaterials({ grid, email }: { grid: WeekGridData; email: string }) {
  const weeks = grid.weeks.filter((w) => w.materials.length > 0);
  if (weeks.length === 0) return <p className="text-xs text-ink-faint">This course has no materials yet.</p>;
  return (
    <div className="space-y-5">
      {weeks.map((w) => {
        const cell = grid.cells[email]?.[w.week] ?? EMPTY;
        return (
          <section key={w.week} className="space-y-2">
            <h3 className="text-xs font-semibold text-ink">
              {grid.unitLabel} {w.week}
              <span className="ml-1.5 font-normal tabular-nums text-ink-faint">
                opened {cell.opened.length} of {w.materials.length}
              </span>
            </h3>
            <MaterialChecklist materials={w.materials} opened={cell.opened} compact />
          </section>
        );
      })}
    </div>
  );
}
