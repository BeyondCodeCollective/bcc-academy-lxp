import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { formatCohortDate } from "@/lib/utils";
import { addDays } from "@/lib/ical";

export type AgendaRow = {
  /** ET calendar day, YYYY-MM-DD */
  date: string;
  /** "Session 3" | "Kickoff" | "MASS" — omitted for a bare event */
  label?: string;
  title: string;
  /** session page link; absent for a non-navigable item */
  href?: string;
  kind: "session" | "mass" | "office-hours" | "event";
  /** "6:30 PM ET" */
  time?: string;
};

// A filled cobalt dot reads as "your course"; a hollow ring as "around it"
// (MASS) or an aside (office hours) — one accent, two weights.
const DOT: Record<AgendaRow["kind"], string> = {
  session: "bg-primary",
  mass: "border-[1.5px] border-primary",
  "office-hours": "border-[1.5px] border-ink-faint",
  event: "border-[1.5px] border-ink-faint",
};

/** A full Mon–Fri clears before the next session → the cohort's break week. */
function breakBetween(prev: string, next: string): string | null {
  const dow = new Date(`${prev}T12:00:00Z`).getUTCDay();
  const daysToNextMonday = ((8 - dow) % 7) || 7;
  const monday = addDays(prev, daysToNextMonday);
  const friday = addDays(monday, 4);
  if (friday < next) {
    const from = formatCohortDate(monday, { month: "short", day: "numeric" }, "en-US");
    const to = formatCohortDate(friday, { day: "numeric" }, "en-US");
    return `${from}–${to}`;
  }
  return null;
}

/**
 * The whole schedule as one chronological, named list — the single thing that
 * replaced a session list and a month grid that showed the same dates twice.
 * Grouped by month, break week shown as a divider, and the session the panel
 * points at highlighted so "where am I" answers itself.
 */
export function CourseAgenda({
  rows,
  todayISO,
  focusDate,
}: {
  rows: AgendaRow[];
  todayISO: string;
  /** the live / next session, from the panel — gets the accent */
  focusDate?: string | null;
}) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return null;

  const items: React.ReactNode[] = [];
  let lastMonth = "";

  sorted.forEach((r, i) => {
    const month = r.date.slice(0, 7);
    if (month !== lastMonth) {
      lastMonth = month;
      items.push(
        <li
          key={`m-${month}`}
          className="px-1 pb-1 pt-5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-faint first:pt-1"
        >
          {formatCohortDate(r.date, { month: "long", year: "numeric" }, "en-US")}
        </li>,
      );
    }

    const prev = sorted[i - 1];
    if (prev) {
      const brk = breakBetween(prev.date, r.date);
      if (brk) {
        items.push(
          <li key={`b-${r.date}`} className="flex items-center gap-3 px-1 py-1.5 text-[11.5px] text-ink-faint">
            <span className="h-px flex-1 bg-rule" />
            no class {brk}
            <span className="h-px flex-1 bg-rule" />
          </li>,
        );
      }
    }

    const isPast = r.date < todayISO;
    const isFocus = !!focusDate && r.date === focusDate;
    const dateLabel = formatCohortDate(
      r.date,
      { weekday: "short", month: "short", day: "numeric" },
      "en-US",
    );

    const inner = (
      <>
        <span className="w-[86px] shrink-0 font-mono text-[11.5px] tabular-nums text-ink-faint">
          {dateLabel}
        </span>
        <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${DOT[r.kind]}`} aria-hidden />
        <span className={`min-w-0 flex-1 truncate text-[13.5px] ${isPast ? "text-ink-faint" : "text-ink"}`}>
          {r.label && (
            <span className={isFocus ? "font-semibold" : "text-ink-faint"}>{r.label} · </span>
          )}
          <span className={isFocus ? "font-semibold" : ""}>{r.title}</span>
        </span>
        {r.href && (
          <CaretRight size={13} className="shrink-0 text-ink-faint" aria-hidden />
        )}
      </>
    );

    items.push(
      <li key={`${r.date}-${r.kind}-${i}`}>
        {r.href ? (
          <Link
            href={r.href}
            className={`flex min-h-[44px] items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-paper-tint-soft ${
              isFocus ? "bg-primary/[0.06]" : ""
            }`}
          >
            {inner}
          </Link>
        ) : (
          <div className="flex min-h-[44px] items-center gap-3 px-2 py-2">{inner}</div>
        )}
      </li>,
    );
  });

  return (
    <section aria-label="Schedule" className="panel px-3 py-2 sm:px-4">
      <ol>{items}</ol>
    </section>
  );
}
