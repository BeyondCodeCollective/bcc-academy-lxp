"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  House,
  ShieldCheck,
  ChatsCircle,
  ChartBar,
  Question,
  List,
  X,
  Check,
  Users,
  Clipboard,
  ChartLineUp,
  BookOpen,
  Gauge,
} from "@phosphor-icons/react";
import { UserMenu } from "@/components/user-menu";
import { computeCurrentWeek } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "bold"; "aria-hidden"?: boolean }>;
};

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

type NavVariant = "admin-sidebar" | "student-sidebar" | "topbar";

export function Nav({
  isAdmin,
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
}: {
  isAdmin: boolean;
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
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items: NavItem[] = [
    { href: "/dashboard", label: "Home", icon: House },
    ...(showTutor
      ? [{ href: "/dashboard/tutor", label: "AI Tutor", icon: ChatsCircle }]
      : []),
    ...(isAdmin
      ? [{ href: "/dashboard/admin", label: "Admin", icon: ShieldCheck }]
      : []),
    ...(canSwitch
      ? [{ href: "/dashboard/admin/insights", label: "Insights", icon: ChartBar }]
      : []),
  ];

  const isItemActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const renderItem = ({ href, label, icon: Icon }: NavItem) => {
    const active = isItemActive(href);
    return (
      <Link
        key={href}
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        onClick={() => setMobileOpen(false)}
        className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-white/15 text-white"
            : "text-neutral-300 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon size={20} weight="bold" aria-hidden />
        <span>{label}</span>
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
      className={`flex min-h-[40px] items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
        helpActive
          ? "text-neutral-200"
          : "text-neutral-500 hover:text-neutral-300"
      }`}
    >
      <Question size={16} weight="regular" aria-hidden />
      <span>Help</span>
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

  const curriculumNav = curriculumTracks.length > 0 && (
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
                    className={`flex min-h-[36px] items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                      isActive
                        ? "bg-white/15 text-white"
                        : isCurrent
                          ? "text-white hover:bg-white/10"
                          : isFuture
                            ? "text-neutral-600 hover:bg-white/5 hover:text-neutral-400"
                            : "text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
                    }`}
                  >
                    {isPast ? (
                      <Check size={14} weight="bold" aria-hidden className="shrink-0 text-neutral-500" />
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

  // ── Admin nav (admin-sidebar, on admin pages) ───────────────────────────

  const searchParams = useSearchParams();
  const onAdminPage = pathname.startsWith("/dashboard/admin");
  const activeTab = searchParams.get("tab") ?? "program";

  const adminNav = variant === "admin-sidebar" && onAdminPage && adminTracks.length > 0 && (
    <div className="flex flex-col gap-1">
      <div className="my-1 h-px bg-white/10" aria-hidden />

      {/* Overview — cross-track program view */}
      {isAdmin && (
        <Link
          href="/dashboard/admin?tab=program"
          onClick={() => setMobileOpen(false)}
          className={`flex min-h-[36px] items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
            activeTab === "program"
              ? "bg-white/15 text-white"
              : "text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
          }`}
        >
          <Gauge size={14} weight="bold" aria-hidden className="shrink-0" />
          <span>Overview</span>
        </Link>
      )}

      {/* Tracks — each is a mini program */}
      <p className="mt-2 mb-1 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
        Programs
      </p>
      {adminTracks.map((t) => {
        const isTrackActive = activeTab === t.slug;
        return (
          <Link
            key={t.slug}
            href={`/dashboard/admin?tab=${t.slug}`}
            onClick={() => setMobileOpen(false)}
            className={`flex min-h-[36px] items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
              isTrackActive
                ? "bg-white/15 text-white"
                : "text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
            }`}
          >
            <BookOpen size={14} weight="regular" aria-hidden className="shrink-0" />
            <span className="truncate">{t.shortName}</span>
          </Link>
        );
      })}
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
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
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
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-neutral-200 hover:bg-white/10 hover:text-white transition-colors"
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
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
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
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-neutral-200 hover:bg-white/10 hover:text-white transition-colors"
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
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
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
