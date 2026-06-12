import type { ReactNode } from "react";

/**
 * Brand section label — the BCC [ACADEMY] bracket lockup at chip scale.
 * Black chip, electric-green brackets, white uppercase text. Use for
 * section eyebrows so the product chrome carries the brand motif.
 */
export function BracketLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 bg-true-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white ${className}`}
    >
      <span aria-hidden className="font-bold text-electric-green">[</span>
      {children}
      <span aria-hidden className="font-bold text-electric-green">]</span>
    </span>
  );
}
