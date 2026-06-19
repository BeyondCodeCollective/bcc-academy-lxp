"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react";

type Crumb = { label: string; href?: string };

// Top-level learner sections → display label.
const SECTION_LABELS: Record<string, string> = {
  courses: "Courses",
  workshops: "Workshops",
  "lunch-learn": "Lunch & Learns",
  tutor: "AI Tutor",
  resources: "Resources",
  help: "Help",
  guide: "Guide",
  start: "Get started",
  assessment: "Pathway",
  insights: "Analytics",
};

const ADMIN_SECTION_LABELS: Record<string, string> = {
  programs: "Programs",
  landing: "Landing pages",
  invites: "Invites",
  allowlist: "Allowlist",
  features: "Features",
  assessments: "Assessments",
  surveys: "Surveys",
  insights: "Survey Insights",
};

function humanize(seg: string): string {
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Build the breadcrumb trail from the current path. `labels` resolves dynamic
 * segments (course/week/workshop/recording/survey/landing/program) to real
 * names; anything missing falls back to a humanized slug. The last crumb is the
 * current page (rendered without a link).
 */
export function buildTrail(
  pathname: string,
  labels: Record<string, string>,
  isAdmin = false,
): Crumb[] {
  const path = pathname.replace(/\/+$/, "");
  if (!path.startsWith("/dashboard") || path === "/dashboard") return [];

  // For admins, Home IS the admin hub; students/previewing land on /dashboard.
  const home: Crumb = { label: "Home", href: isAdmin ? "/dashboard/admin" : "/dashboard" };
  const seg = path.split("/").filter(Boolean); // ["dashboard", ...]
  const rest = seg.slice(1);
  const nameFor = (href: string) => labels[href];

  // ── Admin ──────────────────────────────────────────────────────────────
  // For admins, /dashboard/admin IS home (/dashboard redirects back here), so
  // there's no "Home" crumb — Admin is the root. On the admin home itself this
  // leaves a single item, which the bar hides.
  if (rest[0] === "admin") {
    const out: Crumb[] = [{ label: "Admin", href: "/dashboard/admin" }];
    if (rest.length === 1) return out;
    const section = rest[1];
    const sectionHref = `/dashboard/admin/${section}`;
    const sectionLabel = ADMIN_SECTION_LABELS[section] ?? humanize(section);
    if (rest.length === 2) return [...out, { label: sectionLabel }];
    out.push({ label: sectionLabel, href: sectionHref });
    const leaf = rest[rest.length - 1];
    if (leaf === "new") out.push({ label: "New" });
    else if (leaf === "edit") out.push({ label: nameFor(path) ?? "Edit" });
    else if (leaf === "all") out.push({ label: "All" });
    else out.push({ label: nameFor(path) ?? humanize(leaf) });
    return out;
  }

  const top = rest[0];

  // ── Course (track + legacy mass/techplus week routes) ────────────────────
  // No "Courses" crumb — the catalog page was removed. For learners the course
  // IS their home (a single-course student's /dashboard redirects to it), so
  // showing both "Home" and the course is redundant — start the trail at the
  // course. Admins keep Home (the admin hub is a genuinely different place).
  if (top === "track" || top === "mass" || top === "techplus") {
    const out: Crumb[] = isAdmin ? [home] : [];
    const slug = top === "track" ? rest[1] : top;
    const courseHref = `/dashboard/track/${slug}`;
    const courseLabel = nameFor(courseHref) ?? humanize(slug);
    const weekSeg = top === "track" ? rest[2] : rest[1];
    if (!weekSeg) return [...out, { label: courseLabel }];
    const weekHref = top === "track" ? path : `/dashboard/${top}/${weekSeg}`;
    const weekLabel = nameFor(weekHref) ?? `Week ${weekSeg}`;
    // A /dashboard/track/{slug} overview always exists, so always link the
    // course crumb — it's the learner's way back to the course (their home).
    // Legacy mass/techplus only have an overview when we have a resolved name.
    out.push({
      label: courseLabel,
      href: top === "track" || nameFor(courseHref) ? courseHref : undefined,
    });
    return [...out, { label: weekLabel }];
  }

  // ── Generic learner sections ─────────────────────────────────────────────
  const sectionLabel = SECTION_LABELS[top] ?? humanize(top);
  if (rest.length === 1) return [home, { label: sectionLabel }];
  const sectionHref = `/dashboard/${top}`;
  const leaf = rest[rest.length - 1];
  const leafLabel =
    nameFor(path) ??
    (leaf === "results" ? "Results" : leaf === "admin" ? "Manage" : humanize(leaf));
  return [home, { label: sectionLabel, href: sectionHref }, { label: leafLabel }];
}

export function Breadcrumbs({
  labels = {},
  isAdmin = false,
}: {
  labels?: Record<string, string>;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const trail = buildTrail(pathname, labels, isAdmin);
  if (trail.length < 2) return null; // nothing meaningful to show (e.g. Home)

  return (
    <nav
      aria-label="Breadcrumb"
      className="mx-auto w-full max-w-2xl md:max-w-5xl px-4 pt-5 sm:px-5"
    >
      <ol className="flex flex-wrap items-center gap-1 text-[12px] text-ink-faint">
        {trail.map((c, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <CaretRight size={11} weight="bold" className="text-ink-faint/60" aria-hidden />}
              {c.href && !isLast ? (
                <Link href={c.href} className="transition-colors hover:text-ink">
                  {c.label}
                </Link>
              ) : (
                <span className={isLast ? "font-medium text-ink-soft" : undefined}>{c.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
