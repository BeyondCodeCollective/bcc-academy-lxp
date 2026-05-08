"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Books,
  ShieldCheck,
  ChatsCircle,
  SignOut,
  BookOpenText,
  Compass,
  List,
  X,
  CaretDown,
} from "@phosphor-icons/react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "bold"; "aria-hidden"?: boolean }>;
  group: "main" | "admin";
};

export function Nav({
  isAdmin,
  logo,
  programName,
  showTutor = true,
  showResources = false,
  minimal = false,
  programs = [],
  currentProgramSlug,
}: {
  isAdmin: boolean;
  logo: string;
  programName: string;
  showTutor?: boolean;
  showResources?: boolean;
  minimal?: boolean;
  programs?: { slug: string; name: string }[];
  currentProgramSlug?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items: NavItem[] = [
    { href: "/dashboard", label: "Home", icon: House, group: "main" },
    { href: "/dashboard/start", label: "Get Started", icon: Compass, group: "main" },
    ...(isAdmin || showResources
      ? [{ href: "/dashboard/resources", label: "Resources", icon: Books, group: "main" as const }]
      : []),
    ...(showTutor
      ? [{ href: "/dashboard/tutor", label: "AI Tutor", icon: ChatsCircle, group: "main" as const }]
      : []),
    ...(isAdmin
      ? [
          { href: "/dashboard/admin", label: "Admin", icon: ShieldCheck, group: "admin" as const },
          { href: "/dashboard/guide", label: "Guide", icon: BookOpenText, group: "admin" as const },
        ]
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

  const mainItems = items.filter((i) => i.group === "main");
  const adminItems = items.filter((i) => i.group === "admin");

  const signOutButton = (
    <button
      onClick={async () => {
        document.cookie = "atg-demo-user=; path=/; max-age=0";
        document.cookie = "program-override=; path=/; max-age=0";
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = "/";
      }}
      className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
      aria-label="Sign out"
    >
      <SignOut size={20} weight="bold" aria-hidden />
      <span>Sign Out</span>
    </button>
  );

  const showSwitcher = !minimal && programs.length > 1 && currentProgramSlug;

  const handleSwitchProgram = (slug: string) => {
    if (slug === currentProgramSlug) return;
    if (slug === "__bcc_surveys__") {
      window.location.href = "/dashboard/admin/surveys";
      return;
    }
    const domains: Record<string, string> = {
      atg: "atg.bccacademy.io",
      forge: "forge.bccacademy.io",
      catalyst: "catalyst.bccacademy.io",
    };
    const targetDomain = domains[slug];
    const onKnownDomain =
      targetDomain && Object.values(domains).includes(window.location.hostname);
    if (onKnownDomain) {
      window.location.href = `https://${targetDomain}/dashboard/admin`;
    } else {
      document.cookie = `program-override=${slug}; path=/; max-age=86400`;
      window.location.reload();
    }
  };

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

      {showSwitcher && (
        <div className="px-1">
          <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5 px-2">
            Program
          </label>
          <div className="relative">
            <select
              value={currentProgramSlug}
              onChange={(e) => handleSwitchProgram(e.target.value)}
              className="w-full appearance-none rounded-lg bg-white/10 px-3 py-2 pr-8 text-sm font-medium text-white focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              {programs.map((p) => (
                <option key={p.slug} value={p.slug} className="text-neutral-900">
                  {p.name}
                </option>
              ))}
              <option disabled className="text-neutral-400">
                ─────────
              </option>
              <option value="__bcc_surveys__" className="text-neutral-900">
                BCC — Surveys
              </option>
            </select>
            <CaretDown
              size={12}
              weight="bold"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
          </div>
        </div>
      )}

      {!minimal && (
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
          {mainItems.map(renderItem)}
          {adminItems.length > 0 && (
            <>
              <div className="my-3 h-px bg-white/10" role="separator" />
              {adminItems.map(renderItem)}
            </>
          )}
        </nav>
      )}

      <div className="mt-auto border-t border-white/10 pt-3">{signOutButton}</div>
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
