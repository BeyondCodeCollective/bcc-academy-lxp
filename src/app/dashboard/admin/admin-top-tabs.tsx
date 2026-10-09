"use client";

import { LinkPending } from "@/components/link-pending";
import Link from "next/link";
import { SegmentedTabs } from "@/components/ui";
import { Users as UsersIcon, ChartLineUp as ChartLineUpIcon, GraduationCap as GraduationCapIcon } from "@phosphor-icons/react";

// ── Top-level admin tabs ──────────────────────────────────────────────────
// Four honest tabs — exactly one is always active, so the bar reads as real
// navigation instead of a row of quiet links. Attendance / Survey insights /
// Engagement group under Analytics as segmented sub-views ("how are we
// doing" is one kind of work). Old ?tab= URLs all keep working.

export function AdminTopTabs({
  current,
  sub,
  showInsights,
  actions,
  isManager = true,
}: {
  current: "courses" | "students" | "student-work" | "analytics" | "mvp";
  sub?: "attendance" | "insights" | "analytics" | "course-progress";
  showInsights: boolean;
  /** Right-aligned on the tab row (e.g. the Manage menu on Courses). */
  actions?: React.ReactNode;
  /** Instructors get a single surface — their course tab already holds its
   *  own Students / Attendance / Progress / Work views, so the cross-course
   *  People, Student work, and Analytics tabs render for managers only. */
  isManager?: boolean;
}) {
  const allTabs = [
    { id: "courses", label: "Courses", href: "/dashboard/admin", Icon: GraduationCapIcon },
    // "People", not "All people" — a tab names a place, not a filter. (Same
    // term Canvas uses for its roster tab; the view holds staff too, so
    // "Students" would be inaccurate.)
    { id: "students", label: "People", href: "/dashboard/admin?tab=students", Icon: UsersIcon },
    // "Student work" is off the top nav for now (user call, 2026-07-26) — a
    // course's work lives inside the course (Students → Submissions). The
    // ?tab=student-work URL still renders for anyone who has it bookmarked.
    // A tab is named for what it holds. Instructors get attendance only
    // (insights/engagement are admin capabilities), so calling their tab
    // "Analytics" over-promised and its single segment button read as broken.
    {
      id: "analytics",
      label: showInsights ? "Analytics" : "Attendance",
      href: "/dashboard/admin?tab=attendance",
      Icon: ChartLineUpIcon,
    },
    { id: "mvp", label: "MVP Dashboard", href: "/dashboard/admin/mvp", Icon: ChartLineUpIcon },
  ] as const;
  // Preview the unfinished MVP locally without exposing its navigation in
  // production. The destination still enforces its server-side access checks.
  const tabs = allTabs.filter((tab) =>
    (!isManager ? tab.id === "courses" : true) &&
    (tab.id !== "mvp" || process.env.NODE_ENV === "development"),
  );
  const segments = [
    { id: "attendance", label: "Attendance", href: "/dashboard/admin?tab=attendance", show: true },
    // "Surveys" — it's the survey-response view. Calling it Insights collided
    // with the Overview page and implied a second, different analytics level.
    { id: "insights", label: "Surveys", href: "/dashboard/admin?tab=insights", show: showInsights },
    { id: "analytics", label: "Engagement", href: "/dashboard/admin?tab=analytics", show: showInsights },
    { id: "course-progress", label: "Progress", href: "/dashboard/admin?tab=course-progress", show: showInsights },
  ];
  // One segment is not a choice — hide the picker until there are at least two.
  const visibleSegments = segments.filter((t) => t.show);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-1 border-b border-rule">
        {actions && <span className="order-last ml-auto pb-1.5">{actions}</span>}
        {tabs.map(({ id, label, href, Icon }) => (
          <Link
            key={id}
            href={href}
            aria-current={current === id ? "page" : undefined}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors ${
              current === id
                ? "border-primary font-semibold text-primary"
                : "border-transparent font-medium text-ink-soft hover:border-ink-faint hover:text-ink"
            }`}
          >
            <Icon size={14} weight="bold" aria-hidden />
            {label}
            <LinkPending />
          </Link>
        ))}
      </div>
      {/* Course-first: no course scope up here. The program tabs COMPARE
         courses; a course's own numbers live inside the course (its Analytics
         sub-tab), reached by clicking the course in any table below. */}
      {current === "analytics" && visibleSegments.length > 1 && (
        <SegmentedTabs ariaLabel="Analytics view" tabs={visibleSegments} active={sub ?? ""} />
      )}
    </div>
  );
}
