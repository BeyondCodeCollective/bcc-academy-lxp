"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gear, CaretDown } from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui";

// Program-config actions collapsed into one "Manage" dropdown so the admin
// home leads with the course list + daily-ops toolbar instead of two pill rows.
const ITEMS: { href: string; label: string }[] = [
  { href: "/dashboard/admin/programs", label: "Manage courses" },
  { href: "/dashboard/admin/announcements", label: "Announcements" },
  { href: "/dashboard/admin/landing", label: "Landing pages" },
  { href: "/dashboard/admin/registrations", label: "Registrations" },
  { href: "/dashboard/admin/agreements", label: "Participation agreements" },
  { href: "/dashboard/admin/resources", label: "Resources" },
  { href: "/dashboard/admin/features", label: "Tools" },
];

// Master-tier entry points. Handing someone a second program is a credential
// change, and creating an organization spins up a whole new tenant — both sit
// with the platform owner (email-gated), not with super-admins.
const MASTER_ITEMS: { href: string; label: string }[] = [
  { href: "/dashboard/admin/organizations", label: "Organizations" },
  { href: "/dashboard/admin/health", label: "Platform health" },
  { href: "/dashboard/admin/access", label: "Program access" },
];

export function ManageMenu({ isMaster = false }: { isMaster?: boolean }) {
  const items = isMaster ? [...ITEMS, ...MASTER_ITEMS] : ITEMS;
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
          {items.map((it) => {
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
      )}
    </div>
  );
}
