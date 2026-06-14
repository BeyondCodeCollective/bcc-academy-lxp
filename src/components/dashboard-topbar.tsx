"use client";

import { usePathname } from "next/navigation";
import { Bell } from "@phosphor-icons/react";
import { UserMenu } from "@/components/user-menu";
import { CommandPalette } from "@/components/command-palette";

// Map the current path to a human breadcrumb label. Track/workshop detail
// pages keep their section label — the page's own h1 carries the specific
// title, so the breadcrumb stays stable and uncluttered.
function pageLabel(pathname: string): string {
  if (pathname === "/dashboard") return "Home";
  if (pathname.startsWith("/dashboard/courses")) return "Courses";
  if (pathname.startsWith("/dashboard/track")) return "Course";
  if (pathname.startsWith("/dashboard/workshops")) return "Workshops";
  if (pathname.startsWith("/dashboard/lunch-learn")) return "Lunch & Learns";
  if (pathname.startsWith("/dashboard/tutor")) return "AI Tutor";
  if (pathname.startsWith("/dashboard/resources")) return "Resources";
  if (pathname.startsWith("/dashboard/assessment")) return "Pathway";
  if (pathname.startsWith("/dashboard/help")) return "Help";
  return "Home";
}

type ProgramOption = { slug: string; name: string; domain: string; dnsReady?: boolean };

/**
 * Full-width top bar for the light learner shell (Meridian-style): program
 * breadcrumb on the left, a command-style search in the center, and account
 * controls on the right. A hairline gradient accent frames the top edge —
 * the shell's one signature flourish.
 */
export function DashboardTopBar({
  firstName,
  lastName,
  email,
  avatarUrl,
  canSwitch,
  programs,
  currentProgramSlug,
}: {
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl: string | null;
  canSwitch: boolean;
  programs: ProgramOption[];
  currentProgramSlug: string;
}) {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-20 hidden md:block">
      <div className="shell-topbar flex h-14 items-center gap-3 px-4 sm:px-6">
        {pageLabel(pathname) !== "Home" && (
          <p className="hidden shrink-0 items-baseline text-sm sm:flex">
            <span className="text-[13px] font-semibold text-ink">{pageLabel(pathname)}</span>
          </p>
        )}

        {/* Working ⌘K command palette. */}
        <CommandPalette />

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-paper-tint hover:text-ink"
          >
            <Bell size={18} weight="bold" aria-hidden />
          </button>
          <UserMenu
            variant="topbar"
            firstName={firstName}
            lastName={lastName}
            email={email}
            avatarUrl={avatarUrl}
            canSwitch={canSwitch}
            programs={programs}
            currentProgramSlug={currentProgramSlug}
          />
        </div>
      </div>
    </div>
  );
}
