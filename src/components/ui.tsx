import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "@phosphor-icons/react/dist/ssr";

/**
 * Content-composition primitives — the second layer of the design system
 * (after PageHeader / Section / CatalogCard). Build forms, tables, and content
 * blocks out of THESE so the "inside" of pages is as cohesive as the chrome.
 * Change a primitive here and every form/table/panel updates.
 */

/** Standard surface container — hairline rule, subtle radius, white, light shadow. */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`panel ${className}`.trim()}>{children}</div>;
}

/**
 * Standard input/textarea/select className. Apply to any form control for a
 * consistent field look with a skin-aware focus ring.
 */
export const fieldInput =
  "w-full rounded-md border border-rule bg-neutral-50 px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-primary";

/** Labeled form field — one label treatment across every form. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink-soft">
        {label}
        {hint && <span className="ml-1 font-normal text-ink-faint">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/**
 * ONE button style for the whole app. Use `buttonClass(variant, size)` on any
 * <button>/<Link>/<a> so buttons stop being hand-styled per place (the source
 * of the rounded-vs-straight inconsistency).
 */
type ButtonVariant = "primary" | "dark" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";
const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary/90",
  dark: "bg-ink text-white hover:bg-ink/90",
  secondary:
    "border border-rule bg-surface-elevated text-ink-soft hover:border-ink-faint hover:text-ink",
  ghost: "text-ink-soft hover:bg-paper-tint hover:text-ink",
};
const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]}`;
}

/**
 * Data-table shell — uppercase header row + hairline-divided body, matching the
 * Section eyebrow treatment. Pass <tr> rows (with <td className="px-4 py-3 …">)
 * as children. Columns are strings, or `{ label, align }` for numeric columns.
 */
export type DataTableColumn = string | { label: string; align?: "left" | "right" | "center" };

export function DataTable({
  columns,
  children,
}: {
  columns: DataTableColumn[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-rule">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rule bg-paper-tint-soft text-left">
            {columns.map((c) => {
              const col = typeof c === "string" ? { label: c, align: "left" as const } : c;
              return (
                <th
                  key={col.label}
                  className={`px-4 py-2.5 ${microLabel} ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
                  }`}
                >
                  {col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">{children}</tbody>
      </table>
    </div>
  );
}

/**
 * Stacked name + email cell — THE way a person renders inside a table row,
 * so rosters and activity tables read identically.
 */
export function PersonCell({ name, email }: { name: string | null; email: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-ink">{name || email}</p>
      {name && <p className="truncate text-xs text-ink-faint">{email}</p>}
    </div>
  );
}

/**
 * Muted count cell value — zeros render faint so a young cohort's table reads
 * as "not yet" instead of broken. Non-zero values are full-strength ink.
 */
export function Num({ value }: { value: number }) {
  return (
    <span className={`tabular-nums ${value === 0 ? "text-ink-faint/60" : "text-ink"}`}>
      {value.toLocaleString()}
    </span>
  );
}

/** The micro-label convention (card labels, table headers, section eyebrows).
 *  Uppercase + tracked is for LABELS only — headlines and body stay sentence
 *  case. Use this string anywhere a component wrapper doesn't already apply it. */
export const microLabel =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint";

/**
 * ONE segmented sub-nav — the pill control (gray track, white active pill).
 * Used for every second-level view switch: Analytics sub-tabs, course detail
 * sub-tabs, range presets. Links when `href` is set, buttons otherwise.
 */
export function SegmentedTabs({
  tabs,
  active,
  onSelect,
  ariaLabel,
}: {
  tabs: { id: string; label: string; href?: string }[];
  active: string;
  onSelect?: (id: string) => void;
  ariaLabel?: string;
}) {
  const itemClass = (isActive: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
      isActive ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
    }`;
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-paper-tint p-1" aria-label={ariaLabel}>
      {tabs.map((t) =>
        t.href ? (
          <Link
            key={t.id}
            href={t.href}
            aria-current={active === t.id ? "page" : undefined}
            className={itemClass(active === t.id)}
          >
            {t.label}
          </Link>
        ) : (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect?.(t.id)}
            aria-pressed={active === t.id}
            className={itemClass(active === t.id)}
          >
            {t.label}
          </button>
        ),
      )}
    </div>
  );
}

/** ONE back pattern for drill-in pages — a quiet arrow link to the parent. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-faint transition-colors hover:text-ink-soft"
    >
      <ArrowLeft size={11} weight="bold" aria-hidden />
      {label}
    </Link>
  );
}

/** Autosave/submit feedback — one treatment for every form's save state. */
export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  if (state === "saving") return <span className="text-[11px] text-ink-faint">Saving…</span>;
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-success-text">
        <Check size={11} aria-hidden /> Saved
      </span>
    );
  }
  return <span className="text-[11px] text-danger-text">Save failed</span>;
}
