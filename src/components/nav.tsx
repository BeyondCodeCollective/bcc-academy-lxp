"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { computeCurrentWeek } from "@/lib/utils";

const UserMenu = dynamic(
  () => import("@/components/user-menu").then((m) => m.UserMenu),
  {
    loading: () => (
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-white/10" />
    ),
  },
);

const AdminProgramSwitcher = dynamic(
  () =>
    import("@/components/admin-program-switcher").then(
      (m) => m.AdminProgramSwitcher,
    ),
  {
    loading: () => (
      <div className="mx-3 h-12 animate-pulse rounded bg-white/10" />
    ),
  },
);

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

// Renders a small spinner inside its parent Link only while the route
// transition is pending. Removing the loading.tsx skeletons made nav clicks
// feel unresponsive — this restores immediate per-link feedback.
function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="ml-2 inline-block h-3 w-3 shrink-0 animate-spin rounded-full border border-white/30 border-t-white/80"
    />
  );
}

type ProgramOption = {
  slug: string;
  name: string;
  domain: string;
  dnsReady?: boolean;
};

type CurriculumTrack = {
  slug: string;
  shortName: string;
  startDate: string;
  totalWeeks: number;
  lastSessionDayOffset: number;
  weekSummaries: { week: number; topic: string; icon: string }[];
};

type NavVariant = "admin-sidebar" | "student-sidebar" | "lunch-learn-sidebar" | "topbar";

type LunchLearnRecording = {
  id: string;
  title: string;
  recorded_at: string;
};

export function Nav({
  isAdmin,
  canAccessStaff = false,
  logo,
  programName,
  showTutor = true,
  minimal = false,
  firstName,
  lastName,
  email,
  avatarUrl,
  canSwitch,
  programs,
  currentProgramSlug,
  variant = "admin-sidebar",
  curriculumTracks = [],
  adminTracks = [],
  lunchLearnRecordings = [],
}: {
  isAdmin: boolean;
  canAccessStaff?: boolean;
  logo: string;
  programName: string;
  showTutor?: boolean;
  minimal?: boolean;
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl: string | null;
  canSwitch: boolean;
  programs: ProgramOption[];
  currentProgramSlug: string;
  variant?: NavVariant;
  curriculumTracks?: CurriculumTrack[];
  adminTracks?: { slug: string; shortName: string }[];
  lunchLearnRecordings?: LunchLearnRecording[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "program";
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  const items: NavItem[] = [
    { href: "/dashboard", label: "Home", icon: "🏠" },
    // Catalog (every track in the program) is admin-only. Students get their
    // own track grid on /dashboard and the curriculum sidebar when they're
    // inside a track — they don't need a browsable catalog of programs
    // they aren't enrolled in.
    ...(isAdmin
      ? [{ href: "/dashboard/courses", label: "Courses", icon: "📖" }]
      : []),
    // Workshops are internal-only: admin panel access OR BGC/BCC staff email.
    // Students (current or prospective) don't see this; past workshops are
    // archival material for the org, not enrolled-learner content.
    ...(canAccessStaff
      ? [{ href: "/dashboard/workshops", label: "Workshops", icon: "🎉" }]
      : []),
    ...(showTutor
      ? [{ href: "/dashboard/tutor", label: "AI Tutor", icon: "💬" }]
      : []),
    ...(isAdmin
      ? [{ href: "/dashboard/admin", label: "Admin", icon: "🛡️" }]
      : []),
    ...(canSwitch
      ? [{ href: "/dashboard/insights", label: "Analytics", icon: "📊" }]
      : []),
  ];

  // Survey-specific responses live at /dashboard/admin?tab=insights and are
  // reachable from the Insights page header, so they're no longer a sidebar
  // item of their own. Admin still needs to NOT highlight when ?tab=insights
  // is the active tab (it would feel wrong for both to highlight).
  const isItemActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/dashboard/admin") {
      return pathname.startsWith("/dashboard/admin") && activeTab !== "insights";
    }
    return pathname.startsWith(href);
  };

  const renderItem = ({ href, label, icon }: NavItem) => {
    const active = isItemActive(href);
    return (
      <Link
        key={href}
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        onClick={() => setMobileOpen(false)}
        className={`flex min-h-[44px] items-center gap-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "border-l-2 border-primary bg-white/10 text-white pl-[10px] pr-3"
            : "border-l-2 border-transparent text-neutral-300 hover:bg-white/10 hover:text-white pl-[10px] pr-3"
        }`}
      >
        <span aria-hidden>{icon}</span>
        <span className="flex-1">{label}</span>
        <LinkPending />
      </Link>
    );
  };

  const helpActive = pathname.startsWith("/dashboard/help");

  const helpLink = (
    <Link
      href="/dashboard/help"
      onClick={() => setMobileOpen(false)}
      aria-label="Help"
      aria-current={helpActive ? "page" : undefined}
      className={`flex min-h-[40px] items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${
        helpActive
          ? "text-neutral-200"
          : "text-neutral-500 hover:text-neutral-300"
      }`}
    >
      <span aria-hidden>❓</span>
      <span className="flex-1">Help</span>
      <LinkPending />
    </Link>
  );

  const userMenuProps = {
    firstName,
    lastName,
    email,
    avatarUrl,
    canSwitch,
    programs,
    currentProgramSlug,
  };

  const sidebarFooter = (
    <div className="mt-auto flex flex-col gap-1">
      {helpLink}
      <div className="my-1 h-px bg-white/10" aria-hidden />
      <UserMenu variant="sidebar" {...userMenuProps} />
    </div>
  );

  // ── Curriculum weeks (student-sidebar) ──────────────────────────────────
  //
  // Only render the week list when the user is actually inside a track —
  // i.e. on /dashboard/track/<slug> or /dashboard/track/<slug>/<week>.
  // Showing it on /dashboard, /dashboard/courses, /dashboard/workshops, etc
  // surfaced a stale list of weeks from whichever track was last open and
  // read as "you're still in AI Literacy" even after the user navigated
  // away. Off-track pages now get the bare sidebar (Home / Courses /
  // Workshops) without the curriculum block.

  const onTrackPage = pathname.startsWith("/dashboard/track/");

  const curriculumNav = onTrackPage && curriculumTracks.length > 0 && (
    <div className="flex flex-col gap-4">
      {curriculumTracks.map((track) => {
        const now = new Date();
        const started = now >= new Date(track.startDate);
        const currentWeek = started
          ? computeCurrentWeek(track.startDate, track.totalWeeks, track.lastSessionDayOffset)
          : 0;

        return (
          <div key={track.slug}>
            {curriculumTracks.length > 1 && (
              <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
                {track.shortName}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {track.weekSummaries.map((ws) => {
                const weekHref = `/dashboard/track/${track.slug}/${ws.week}`;
                const isActive = pathname === weekHref;
                const isPast = started && ws.week < currentWeek;
                const isCurrent = started && ws.week === currentWeek;
                const isFuture = !started || ws.week > currentWeek;

                return (
                  <Link
                    key={ws.week}
                    href={weekHref}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-[36px] items-center gap-2.5 py-1.5 text-[13px] transition-colors ${
                      isActive
                        ? "border-l-2 border-primary bg-white/10 text-white pl-[10px] pr-3"
                        : isCurrent
                          ? "border-l-2 border-transparent text-white hover:bg-white/10 pl-[10px] pr-3"
                          : isFuture
                            ? "border-l-2 border-transparent text-neutral-600 hover:bg-white/5 hover:text-neutral-400 pl-[10px] pr-3"
                            : "border-l-2 border-transparent text-neutral-400 hover:bg-white/10 hover:text-neutral-200 pl-[10px] pr-3"
                    }`}
                  >
                    {isPast ? (
                      <span aria-hidden className="shrink-0 text-neutral-500">✓</span>
                    ) : (
                      <span className="w-[14px] shrink-0 text-center text-[11px] tabular-nums text-neutral-500">
                        {ws.week}
                      </span>
                    )}
                    <span className="truncate">{ws.topic}</span>
                    {isCurrent && (
                      <span className="ml-auto shrink-0 h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Lunch & Learn recordings (lunch-learn-sidebar) ──────────────────────

  const lunchLearnNav = lunchLearnRecordings.length > 0 && (
    <div className="flex flex-col gap-0.5">
      <p className="mb-1 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
        Recordings
      </p>
      {lunchLearnRecordings.map((r) => {
        const href = `/dashboard/lunch-learn/${r.id}`;
        const isActive = pathname === href;
        const date = new Date(r.recorded_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return (
          <Link
            key={r.id}
            href={href}
            onClick={() => setMobileOpen(false)}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-[36px] items-start gap-2.5 py-1.5 text-[13px] transition-colors ${
              isActive
                ? "border-l-2 border-primary bg-white/10 text-white pl-[10px] pr-3"
                : "border-l-2 border-transparent text-neutral-300 hover:bg-white/10 hover:text-white pl-[10px] pr-3"
            }`}
          >
            <span className="w-10 shrink-0 pt-0.5 text-[10px] tabular-nums text-neutral-500">
              {date}
            </span>
            <span className="line-clamp-2 flex-1">{r.title}</span>
          </Link>
        );
      })}
    </div>
  );

  // ── Admin nav (admin-sidebar, on admin pages) ───────────────────────────

  const onAdminPage = pathname.startsWith("/dashboard/admin");
  // Insights is cross-program — the PROGRAMS list in the sidebar shouldn't
  // appear there or it implies a per-track filter that doesn't apply.
  const onInsightsTab = activeTab === "insights";
  // Admin Home (the picker, no ?tab=) IS the canonical track selector for
  // that surface. Hiding the sidebar track switcher there avoids doubling
  // up; it reappears as soon as the admin clicks into a track tab.
  const onAdminHome =
    pathname === "/dashboard/admin" && !searchParams.get("tab");

  const adminNav = variant === "admin-sidebar" && onAdminPage && !onInsightsTab && !onAdminHome && adminTracks.length > 0 && (
    <div className="flex flex-col gap-1">
      <div className="my-1 h-px bg-white/10" aria-hidden />

      <p className="mt-1 mb-1 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
        Courses
      </p>

      <AdminProgramSwitcher
        tracks={adminTracks}
        activeTab={activeTab}
        showLunchLearn={canAccessStaff && isAdmin}
        onNavigate={() => setMobileOpen(false)}
      />
    </div>
  );

  // ── Top bar variant (unenrolled students) ───────────────────────────────

  if (variant === "topbar" && !minimal) {
    return (
      <>
        {/* Desktop top bar */}
        <header className="hidden md:flex sticky top-0 z-30 items-center justify-between gap-4 bg-ink px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt={programName} className="h-5" />
            </Link>
            <nav className="flex items-center gap-1" aria-label="Primary">
              {items.map(({ href, label }) => {
                const active = isItemActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-white/15 text-white"
                        : "text-neutral-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
              <Link
                href="/dashboard/help"
                className={`px-3 py-1.5 text-sm transition-colors ${
                  helpActive
                    ? "text-neutral-200"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Help
              </Link>
            </nav>
          </div>
          <UserMenu variant="topbar" {...userMenuProps} />
        </header>

        {/* Mobile top bar (same as sidebar variant) */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-2">
          <Link href="/dashboard" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={programName} className="h-4" />
          </Link>
          <div className="flex items-center gap-1">
            <UserMenu variant="topbar" {...userMenuProps} />
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span aria-hidden>☰</span>
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <div
          className={`md:hidden fixed inset-0 z-40 transition ${
            mobileOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
          aria-hidden={!mobileOpen}
        >
          <div
            onClick={() => setMobileOpen(false)}
            className={`absolute inset-0 bg-black/50 transition-opacity ${
              mobileOpen ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`absolute inset-y-0 left-0 w-72 max-w-[80%] bg-ink shadow-xl transition-transform ${
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
          >
            <div className="flex items-center justify-end px-2 pt-2">
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <span aria-hidden>✕</span>
              </button>
            </div>
            <div className="flex h-full flex-col gap-6 p-4">
              <nav aria-label="Primary" className="flex flex-col gap-1">
                {items.map(renderItem)}
              </nav>
              <div className="mt-auto">{helpLink}</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Minimal (survey pages) — just mobile top bar, no sidebar ────────────

  if (minimal) {
    return (
      <>
        <aside
          className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30 md:w-60 md:flex-col bg-ink"
          aria-label="Main navigation"
        >
          <div className="flex h-full flex-col gap-6 p-4">
            <Link href="/dashboard" className="flex items-center px-2 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt={programName} className="h-5" />
            </Link>
          </div>
        </aside>
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-2">
          <Link href="/dashboard" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={programName} className="h-4" />
          </Link>
        </div>
      </>
    );
  }

  // ── Sidebar variants (admin-sidebar + student-sidebar) ──────────────────

  const sidebarBody = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link
        href="/dashboard"
        className="flex items-center px-2 py-2"
        onClick={() => setMobileOpen(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt={programName} className="h-5" />
      </Link>

      <nav aria-label="Primary" className="flex flex-col gap-1">
        {items.map(renderItem)}
      </nav>

      {variant === "student-sidebar" && curriculumNav && (
        <div className="flex flex-col gap-1">
          <div className="my-1 h-px bg-white/10" aria-hidden />
          {curriculumNav}
        </div>
      )}

      {variant === "lunch-learn-sidebar" && lunchLearnNav && (
        <div className="flex flex-col gap-1">
          <div className="my-1 h-px bg-white/10" aria-hidden />
          {lunchLearnNav}
        </div>
      )}

      {adminNav}

      {sidebarFooter}
    </div>
  );

  const drawerBody = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link
        href="/dashboard"
        className="flex items-center px-2 py-2"
        onClick={() => setMobileOpen(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt={programName} className="h-5" />
      </Link>

      <nav aria-label="Primary" className="flex flex-col gap-1">
        {items.map(renderItem)}
      </nav>

      {variant === "student-sidebar" && curriculumNav && (
        <div className="flex flex-col gap-1">
          <div className="my-1 h-px bg-white/10" aria-hidden />
          {curriculumNav}
        </div>
      )}

      {variant === "lunch-learn-sidebar" && lunchLearnNav && (
        <div className="flex flex-col gap-1">
          <div className="my-1 h-px bg-white/10" aria-hidden />
          {lunchLearnNav}
        </div>
      )}

      {adminNav}

      <div className="mt-auto">{helpLink}</div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar (md+) — fixed to viewport */}
      <aside
        className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30 md:w-60 md:flex-col bg-ink overflow-y-auto"
        aria-label="Main navigation"
      >
        {sidebarBody}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-2">
        <Link href="/dashboard" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={programName} className="h-4" />
        </Link>
        <div className="flex items-center gap-1">
          <UserMenu variant="topbar" {...userMenuProps} />
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <span aria-hidden>☰</span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition ${
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute inset-y-0 left-0 w-72 max-w-[80%] bg-ink shadow-xl transition-transform ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-end px-2 pt-2">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span aria-hidden>✕</span>
            </button>
          </div>
          {drawerBody}
        </div>
      </div>
    </>
  );
}
