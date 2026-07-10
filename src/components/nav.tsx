"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  House,
  ChatsCircle,
  ChartBar,
  Question,
  List,
  X,
  Check,
  Confetti,
  BookOpen,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import { computeCurrentWeek, trackHasStarted } from "@/lib/utils";
import { unitDisplayMap } from "@/lib/programs/unit-display";
import { primaryTrack } from "@/lib/enrollment";
import { TextScaleToggle } from "@/components/text-scale-toggle";
import { useReadAloud } from "@/components/assessment-a11y-bar";
import { SidebarToggle } from "@/components/sidebar-toggle";

const UserMenu = dynamic(
  () => import("@/components/user-menu").then((m) => m.UserMenu),
  {
    loading: () => (
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-paper-tint" />
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
      <div className="mx-3 h-12 animate-pulse rounded bg-paper-tint" />
    ),
  },
);

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "bold"; "aria-hidden"?: boolean }>;
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
      className="ml-2 inline-block h-3 w-3 shrink-0 animate-spin rounded-full border border-ink/20 border-t-ink/70"
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
  startDateTbd?: boolean;
  selfPaced?: boolean;
  totalWeeks: number;
  lastSessionDayOffset: number;
  unitLabel?: string;
  /** Set when this track wraps around another (MASS → Security+). */
  companionOf?: string;
  weekSummaries: { week: number; topic: string; icon: string; label?: string }[];
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
  showResources = false,
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
  showLunchLearnLink = false,
}: {
  isAdmin: boolean;
  canAccessStaff?: boolean;
  logo: string;
  programName: string;
  showTutor?: boolean;
  showResources?: boolean;
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
  showLunchLearnLink?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "program";
  const [mobileOpen, setMobileOpen] = useState(false);
  // Light shell (Meridian-style) across the whole platform — learner, admin,
  // and lunch-learn now share the white/SF/skin look.
  const lightShell = true;

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  // For admins, Home IS the admin dashboard (the learner home is preview-only).
  // The bare /dashboard would render the learner shell and only THEN redirect
  // admins to /dashboard/admin — flashing the learner skeleton first. Point
  // every brand/home link straight at the right destination to avoid that.
  //
  // Same reasoning for students: their course IS their home. /dashboard was a
  // greeting, a picker duplicating this very sidebar, and two tiles duplicating
  // these very nav items — 118 of 122 learners have exactly one real course, and
  // the four with two reach the second from the list below. Point Home at the
  // course; the second course is one click away, and nobody lands on a chooser.
  // (Security+ enrolls you in its MASS wraparound too, so "how many courses"
  // isn't a count — `primaryTrack` prefers a standalone course over a companion.)
  const primarySlug =
    variant === "student-sidebar" ? (primaryTrack(curriculumTracks)?.slug ?? null) : null;
  const homeHref = isAdmin
    ? "/dashboard/admin"
    : primarySlug
      ? `/dashboard/track/${primarySlug}`
      : "/dashboard";

  const items: NavItem[] = [
    // For admins, Home IS the admin dashboard (the learner home is preview-only),
    // so there's no separate "Admin" item — one clear landing.
    { href: homeHref, label: "Home", icon: House },
    // No separate "Courses" item: for admins, Home IS the course hub — it lists
    // every track with Manage + Open-student-view actions per course, so a
    // second admin-only catalog page was redundant (collapsed into Home).
    // Workshops are BGC-internal staff content — only shown to staff while in
    // the BGC program (the page itself 404s outside BGC to close the URL hole).
    // Students never see this; it's not enrolled-learner content.
    ...(canAccessStaff && currentProgramSlug === "bgc"
      ? [{ href: "/dashboard/workshops", label: "Workshops", icon: Confetti }]
      : []),
    ...(showTutor
      ? [{ href: "/dashboard/tutor", label: "AI Tutor", icon: ChatsCircle }]
      : []),
    // Resources is independent of the AI Tutor — shown whenever the current
    // program has any resources (admins manage them at /dashboard/admin/resources).
    ...(showResources
      ? [{ href: "/dashboard/resources", label: "Resources", icon: BookOpen }]
      : []),
    ...(canSwitch
      ? [{ href: "/dashboard/insights", label: "Analytics", icon: ChartBar }]
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

  const renderItem = ({ href, label, icon: Icon }: NavItem) => {
    const active = isItemActive(href);
    return (
      <Link
        key={href}
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        onClick={() => setMobileOpen(false)}
        className={`nav-item flex min-h-[44px] items-center gap-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-lg border-l-2 pl-[10px] pr-3 ${
          lightShell
            ? active
              ? "border-primary bg-primary/[0.08] text-primary"
              : "border-transparent text-ink-soft hover:bg-paper-tint hover:text-ink"
            : active
              ? "border-primary bg-white/[0.08] text-white"
              : "border-transparent text-ink-soft hover:bg-white/[0.06] hover:text-white"
        }`}
      >
        <Icon size={20} weight="bold" aria-hidden />
        <span className="nav-collapsible flex-1">{label}</span>
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
        lightShell
          ? helpActive
            ? "text-ink"
            : "text-ink-soft hover:text-ink"
          : helpActive
            ? "text-ink"
            : "text-ink-faint hover:text-ink-soft"
      }`}
    >
      <Question size={16} weight="regular" aria-hidden />
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

  const { enabled: readAloud, setEnabled: setReadAloud, speak, stop } = useReadAloud();

  const sidebarFooter = (
    <div className="nav-collapsible mt-auto flex flex-col gap-1">
      {helpLink}
      <div className="my-1 h-px bg-rule" aria-hidden />
      {/* Accessibility controls — always visible in sidebar */}
      <div className="flex items-center justify-between px-2 py-1.5">
        <TextScaleToggle compact tone={lightShell ? "light" : "dark"} />
        <button
          type="button"
          aria-pressed={readAloud}
          aria-label={readAloud ? "Turn off read aloud" : "Turn on read aloud"}
          onClick={() => {
            if (readAloud) {
              setReadAloud(false);
              stop();
            } else {
              setReadAloud(true);
              const heading = document.querySelector("main h1, h1")?.textContent ?? "";
              const body = Array.from(document.querySelectorAll("main p, main li"))
                .slice(0, 6)
                .map((el) => el.textContent?.trim())
                .filter(Boolean)
                .join(". ");
              speak([heading, body].filter(Boolean).join(". "));
            }
          }}
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
            readAloud
              ? "bg-accent text-white"
              : lightShell
                ? "text-ink-soft hover:bg-paper-tint hover:text-ink"
                : "text-ink-faint hover:bg-paper-tint hover:text-ink"
          }`}
        >
          {readAloud ? (
            <SpeakerHigh size={14} weight="bold" aria-hidden />
          ) : (
            <SpeakerSlash size={14} weight="bold" aria-hidden />
          )}
          <span>{readAloud ? "Audio on" : "Audio"}</span>
        </button>
      </div>
      {/* The account menu lives in the top bar on the light shell, so the
          redundant sidebar user menu is dropped there. */}
      {!lightShell && (
        <>
          <div className="my-1 h-px bg-rule" aria-hidden />
          <UserMenu variant="sidebar" {...userMenuProps} />
        </>
      )}
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
  const urlTrackSlug = onTrackPage
    ? pathname.replace("/dashboard/track/", "").split("/")[0]
    : null;
  const visibleCurriculumTracks = urlTrackSlug
    ? curriculumTracks.filter((t) => t.slug === urlTrackSlug)
    : curriculumTracks;

  const curriculumNav = onTrackPage && visibleCurriculumTracks.length > 0 && (
    <div className="flex flex-col gap-4">
      {visibleCurriculumTracks.map((track) => {
        const now = new Date();
        const started = trackHasStarted(track, now);
        const currentWeek = track.selfPaced
          ? started ? 1 : 0
          : started
            ? computeCurrentWeek(track.startDate, track.totalWeeks, track.lastSessionDayOffset)
            : 0;

        const unitDisplay = unitDisplayMap(track.weekSummaries, track.unitLabel ?? "Week");

        return (
          <div key={track.slug}>
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
                    className={`flex min-h-[36px] items-center gap-2.5 rounded-lg py-1.5 text-[13px] transition-colors border-l-2 pl-[10px] pr-3 ${
                      isActive
                        ? "border-primary bg-primary/[0.08] font-medium text-primary"
                        : isCurrent
                          ? "border-transparent text-ink hover:bg-paper-tint"
                          : isFuture
                            ? "border-transparent text-ink-faint hover:bg-paper-tint hover:text-ink-soft"
                            : "border-transparent text-ink-soft hover:bg-paper-tint hover:text-ink"
                    }`}
                  >
                    {isPast ? (
                      <Check size={14} weight="bold" aria-hidden className="shrink-0 text-ink-faint" />
                    ) : (
                      <span className="w-[14px] shrink-0 text-center text-[11px] tabular-nums text-ink-faint">
                        {/* Extras (a kickoff) have no number — mark them with a dot. */}
                        {unitDisplay.get(ws.week)?.number ?? "·"}
                      </span>
                    )}
                    <span className="truncate">{ws.topic}</span>
                    {isCurrent && (
                      <span className="ml-auto shrink-0 h-1.5 w-1.5 rounded-full bg-primary" />
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
      <p className="mb-1 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
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
                ? "rounded-lg border-l-2 border-primary bg-primary/[0.08] text-primary pl-[10px] pr-3"
                : "rounded-lg border-l-2 border-transparent text-ink-soft hover:bg-paper-tint hover:text-ink pl-[10px] pr-3"
            }`}
          >
            <span className="w-10 shrink-0 pt-0.5 text-[10px] tabular-nums text-ink-faint">
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
    <div className="nav-collapsible flex flex-col gap-1">
      <div className="my-1 h-px bg-rule" aria-hidden />

      <p className="mt-1 mb-1 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
        Courses
      </p>

      <AdminProgramSwitcher
        tracks={adminTracks}
        activeTab={activeTab}
        showLunchLearn={canAccessStaff && isAdmin && currentProgramSlug === "bgc"}
        onNavigate={() => setMobileOpen(false)}
      />
    </div>
  );

  // ── Top bar variant (unenrolled students) ───────────────────────────────

  if (variant === "topbar" && !minimal) {
    return (
      <>
        {/* Desktop top bar */}
        <header className="hidden md:flex sticky top-0 z-30 items-center justify-between gap-4 shell-topbar px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href={homeHref} className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt={programName} className="h-6 w-auto" />
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
                        ? "bg-paper-tint text-ink"
                        : "text-ink-soft hover:bg-paper-tint hover:text-ink"
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
                    ? "text-ink"
                    : "text-ink-faint hover:text-ink-soft"
                }`}
              >
                Help
              </Link>
            </nav>
          </div>
          <UserMenu variant="topbar" {...userMenuProps} />
        </header>

        {/* Mobile top bar (same as sidebar variant) */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between shell-topbar px-4 py-2">
          <Link href={homeHref} className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={programName} className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-1">
            <UserMenu variant="topbar" {...userMenuProps} />
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-ink hover:bg-paper-tint hover:text-ink transition-colors"
            >
              <List size={22} weight="bold" aria-hidden />
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
            className={`absolute inset-y-0 left-0 w-72 max-w-[80%] shell-light shadow-xl transition-transform ${
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
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-ink-soft hover:bg-paper-tint hover:text-ink transition-colors"
              >
                <X size={22} weight="bold" aria-hidden />
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
          className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30 md:w-60 md:flex-col shell-light"
          aria-label="Main navigation"
        >
          <div className="flex h-full flex-col gap-6 p-4">
            <Link href={homeHref} className="flex items-center px-2 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt={programName} className="h-6 w-auto" />
            </Link>
          </div>
        </aside>
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between shell-topbar px-4 py-2">
          <Link href={homeHref} className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt={programName} className="h-7 w-auto" />
          </Link>
        </div>
      </>
    );
  }

  // ── Sidebar variants (admin-sidebar + student-sidebar) ──────────────────

  const sidebarLogo = lightShell ? (
    <div className="nav-brandrow flex items-center justify-between gap-1 pr-1">
      <Link
        href={homeHref}
        className="flex min-w-0 items-center px-2 py-2"
        onClick={() => setMobileOpen(false)}
      >
        <span className="nav-collapsible truncate text-[15px] font-bold tracking-[-0.01em] text-ink">
          {programName}
        </span>
      </Link>
      <SidebarToggle />
    </div>
  ) : (
    <Link
      href={homeHref}
      className="flex items-center px-2 py-2"
      onClick={() => setMobileOpen(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt={programName} className="h-6 w-auto" />
    </Link>
  );

  const sidebarBody = (
    <div className="flex h-full flex-col gap-6 p-4">
      {sidebarLogo}

      <nav aria-label="Primary" className="flex flex-col gap-1">
        {items.map(renderItem)}
      </nav>

      {variant === "student-sidebar" && curriculumNav && (
        <div className="nav-collapsible flex flex-col gap-1">
          <div className="my-1 h-px bg-rule" aria-hidden />
          {curriculumNav}
        </div>
      )}

      {variant === "lunch-learn-sidebar" && lunchLearnNav && (
        <div className="nav-collapsible flex flex-col gap-1">
          <div className="my-1 h-px bg-rule" aria-hidden />
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
        href={homeHref}
        className="flex items-center px-2 py-2"
        onClick={() => setMobileOpen(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt={programName} className="h-6 w-auto" />
      </Link>

      <nav aria-label="Primary" className="flex flex-col gap-1">
        {items.map(renderItem)}
      </nav>

      {variant === "student-sidebar" && curriculumNav && (
        <div className="nav-collapsible flex flex-col gap-1">
          <div className="my-1 h-px bg-rule" aria-hidden />
          {curriculumNav}
        </div>
      )}

      {variant === "lunch-learn-sidebar" && lunchLearnNav && (
        <div className="nav-collapsible flex flex-col gap-1">
          <div className="my-1 h-px bg-rule" aria-hidden />
          {lunchLearnNav}
        </div>
      )}

      {variant === "student-sidebar" && showLunchLearnLink && (
        <div className="flex flex-col gap-1">
          <div className="my-1 h-px bg-rule" aria-hidden />
          <a
            href="/dashboard/lunch-learn"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-paper-tint hover:text-ink transition-colors"
          >
            <span>Lunch &amp; Learns</span>
          </a>
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
        className={`js-sidebar hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30 md:w-60 md:flex-col overflow-y-auto ${lightShell ? "shell-light" : "nav-surface"}`}
        aria-label="Main navigation"
      >
        {sidebarBody}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between shell-topbar px-4 py-2">
        <Link href={homeHref} className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={programName} className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-1">
          <UserMenu variant="topbar" {...userMenuProps} />
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-ink hover:bg-paper-tint hover:text-ink transition-colors"
          >
            <List size={22} weight="bold" aria-hidden />
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
          className={`absolute inset-y-0 left-0 w-72 max-w-[80%] shell-light shadow-xl transition-transform ${
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
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-ink-soft hover:bg-paper-tint hover:text-ink transition-colors"
            >
              <X size={22} weight="bold" aria-hidden />
            </button>
          </div>
          {drawerBody}
        </div>
      </div>
    </>
  );
}
