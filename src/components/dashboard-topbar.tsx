"use client";

import { Bell } from "@phosphor-icons/react";
import { UserMenu } from "@/components/user-menu";
import { CommandPalette, type SearchItem } from "@/components/command-palette";

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
  searchItems = [],
}: {
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl: string | null;
  canSwitch: boolean;
  programs: ProgramOption[];
  currentProgramSlug: string;
  searchItems?: SearchItem[];
}) {
  // Breadcrumbs moved to a dedicated <Breadcrumbs> bar below the top bar (it
  // renders a full trail on all viewports). The top bar now just hosts search
  // and the account menu.
  return (
    <div className="sticky top-0 z-20 hidden md:block">
      <div className="shell-topbar flex h-14 items-center gap-3 px-4 sm:px-6">
        {/* Working ⌘K command palette. */}
        <CommandPalette items={searchItems} />

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
