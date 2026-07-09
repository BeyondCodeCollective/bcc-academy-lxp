"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Renders the week prev/next links into the breadcrumb row (the #breadcrumb-actions
// slot) so the nav sits on one line with the breadcrumb instead of a separate
// block below. Lives in the page (not the layout) so prev/next stay fresh as the
// learner moves between weeks; the breadcrumb bar only provides the slot.
export function WeekNavPortal({
  trackSlug,
  weekNum,
  totalWeeks,
  unitLabel = "Week",
  prevLabel,
  nextLabel,
}: {
  trackSlug: string;
  weekNum: number;
  totalWeeks: number;
  unitLabel?: string;
  /** Display names for the adjacent units — an extra reads "Kickoff", not a number. */
  prevLabel?: string;
  nextLabel?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const prevWeek = weekNum > 1 ? weekNum - 1 : null;
  const nextWeek = weekNum < totalWeeks ? weekNum + 1 : null;
  if (!prevWeek && !nextWeek) return null;
  if (!mounted) return null;

  const target = document.getElementById("breadcrumb-actions");
  if (!target) return null;

  const cls =
    "inline-flex items-center gap-1 border border-rule px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-paper-tint-soft hover:text-ink transition-colors";

  return createPortal(
    <>
      {prevWeek && (
        <Link href={`/dashboard/track/${trackSlug}/${prevWeek}`} className={cls}>
          <ArrowLeft size={12} />
          {prevLabel ?? `${unitLabel} ${prevWeek}`}
        </Link>
      )}
      {nextWeek && (
        <Link href={`/dashboard/track/${trackSlug}/${nextWeek}`} className={cls}>
          {nextLabel ?? `${unitLabel} ${nextWeek}`}
          <ArrowLeft size={12} className="rotate-180" />
        </Link>
      )}
    </>,
    target,
  );
}
