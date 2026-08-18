"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gear, CaretDown } from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui";

// Program-config actions collapsed into one "Manage" dropdown so the admin
// home leads with the course list + daily-ops toolbar instead of two pill rows.
// Grouped: a flat ten-item list stopped scanning. `master` marks entry points
// that sit with the platform owner (email-gated) — a second program is a
// credential change, an organization is a whole new tenant, and Platform
// health lists learner emails across every program.
type Item = {
  href: string;
  label: string;
  master?: boolean;
  /** Show only when the CURRENT program context is one of these slugs.
   *  Practice exams currently exist only for Catalyst-hub courses — a Forte
   *  admin has nothing behind the link and shouldn't see it. */
  programs?: string[];
};

const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Content",
    items: [
      { href: "/dashboard/admin/programs", label: "Manage courses" },
      { href: "/dashboard/admin/announcements", label: "Announcements" },
      { href: "/dashboard/admin/landing", label: "Landing pages" },
      { href: "/dashboard/admin/landing-signups", label: "Landing signups" },
      { href: "/dashboard/admin/resources", label: "Resources" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/dashboard/admin/locations", label: "Participant locations", programs: ["catalyst", "atg", "beyond-code-centers"] },
      { href: "/dashboard/admin/agreements", label: "Participation agreements" },
      { href: "/dashboard/admin/access", label: "Program access", master: true },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/dashboard/admin/features", label: "Tools" },
      { href: "/dashboard/admin/organizations", label: "Organizations", master: true },
      { href: "/dashboard/admin/health", label: "Platform health", master: true },
    ],
  },
];

export function ManageMenu({
  isMaster = false,
  programSlug,
}: {
  isMaster?: boolean;
  /** Current program context; program-scoped items hide when absent. */
  programSlug?: string;
}) {
  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(
      (it) =>
        (isMaster || !it.master) &&
        (!it.programs || (programSlug ? it.programs.includes(programSlug) : false)),
    ),
  })).filter((g) => g.items.length > 0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={buttonClass("secondary", "sm")}
      >
        <Gear size={13} weight="bold" aria-hidden />
        Manage
        <CaretDown
          size={11}
          weight="bold"
          aria-hidden
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-lg border border-rule bg-surface-elevated py-1 shadow-lg"
        >
          {groups.map((g, gi) => (
            <div key={g.label} className={gi > 0 ? "mt-1 border-t border-rule pt-1" : ""}>
              <p className="px-3.5 pb-0.5 pt-1.5 text-micro font-semibold uppercase tracking-[0.12em] text-ink-faint">
                {g.label}
              </p>
              {g.items.map((it) => {
                const active = pathname.startsWith(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    role="menuitem"
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`block px-3.5 py-2 text-sm transition-colors hover:bg-paper-tint ${
                      active ? "bg-paper-tint font-semibold text-ink" : "text-ink"
                    }`}
                  >
                    {it.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
