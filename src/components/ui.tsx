import type { ReactNode } from "react";

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
  "w-full rounded-md border border-rule bg-neutral-50 px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-primary focus:outline-none";

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
 * as children.
 */
export function DataTable({
  columns,
  children,
}: {
  columns: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-rule">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rule bg-paper-tint-soft text-left">
            {columns.map((c) => (
              <th
                key={c}
                className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">{children}</tbody>
      </table>
    </div>
  );
}
