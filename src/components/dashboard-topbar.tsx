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
  confined = false,
  hideSearch = false,
  tutorAvailable = false,
}: {
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl: string | null;
  canSwitch: boolean;
  programs: ProgramOption[];
  currentProgramSlug: string;
  searchItems?: SearchItem[];
  /** Pending registrant — hide program destinations from search. */
  confined?: boolean;
  /** Single-course event programs (e.g. BGC camps) — no search at all. */
  hideSearch?: boolean;
  /** Whether this program has the AI Tutor (Forte only today). */
  tutorAvailable?: boolean;
}) {
  // Breadcrumbs moved to a dedicated <Breadcrumbs> bar below the top bar (it
  // renders a full trail on all viewports). The top bar now just hosts search
  // and the account menu.
  return (
    <div className="sticky top-0 z-20 hidden md:block">
      <div className="shell-topbar flex h-14 items-center gap-3 px-4 sm:px-6">
        {/* Working ⌘K command palette. Camp programs drop it entirely — the
            spacer keeps the bell/account menu pinned right. */}
        {hideSearch ? (
          <div className="flex-1" aria-hidden />
        ) : (
          <CommandPalette items={searchItems} confined={confined} tutorAvailable={tutorAvailable} />
        )}

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
