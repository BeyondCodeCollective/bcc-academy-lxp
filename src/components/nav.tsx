"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  ShieldCheck,
  ChatsCircle,
  Question,
  List,
  X,
} from "@phosphor-icons/react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "bold"; "aria-hidden"?: boolean }>;
};

export function Nav({
  isAdmin,
  logo,
  programName,
  showTutor = true,
  minimal = false,
}: {
  isAdmin: boolean;
  logo: string;
  programName: string;
  showTutor?: boolean;
  minimal?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Workspaces only — places where work happens. Reference content
  // (orientation, instructor guide, study materials) lives on /dashboard/help
  // and is reached via the muted footer link below.
  const items: NavItem[] = [
    { href: "/dashboard", label: "Home", icon: House },
    ...(showTutor
      ? [{ href: "/dashboard/tutor", label: "AI Tutor", icon: ChatsCircle }]
      : []),
    ...(isAdmin
      ? [{ href: "/dashboard/admin", label: "Admin", icon: ShieldCheck }]
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

      {!minimal && (
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
          {items.map(renderItem)}
        </nav>
      )}

      {!minimal && <div className="mt-auto">{helpLink}</div>}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar (md+) — fixed to viewport */}
      <aside
        className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30 md:w-60 md:flex-col bg-ink"
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
        {!minimal && (
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-neutral-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <List size={22} weight="bold" aria-hidden />
          </button>
        )}
      </div>

      {/* Mobile drawer */}
      {!minimal && (
        <div
          className={`md:hidden fixed inset-0 z-40 transition ${
            mobileOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
          aria-hidden={!mobileOpen}
        >
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            className={`absolute inset-0 bg-black/50 transition-opacity ${
              mobileOpen ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* Panel */}
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
            {sidebarBody}
          </div>
        </div>
      )}
    </>
  );
}
