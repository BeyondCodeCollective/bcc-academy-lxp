"use client";

import { useEffect, useRef, useState } from "react";
import { CaretUpDown, SignOut, Check } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

type ProgramOption = {
  slug: string;
  name: string;
  domain: string;
  /** If false, switching uses the cookie-based override instead of redirecting to `domain`. */
  dnsReady?: boolean;
};

type Variant = "sidebar" | "topbar";

export function UserMenu({
  firstName,
  lastName,
  email,
  avatarUrl,
  canSwitch,
  programs,
  currentProgramSlug,
  variant = "sidebar",
}: {
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl: string | null;
  canSwitch: boolean;
  programs: ProgramOption[];
  currentProgramSlug: string;
  variant?: Variant;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "·";

  /* eslint-disable react-hooks/immutability -- intentional browser-global writes for navigation */
  const handleSwitchProgram = (slug: string) => {
    if (slug === currentProgramSlug) return;
    if (slug === "__bcc_surveys__") {
      window.location.href = "/dashboard/admin/surveys";
      return;
    }
    const target = programs.find((p) => p.slug === slug);
    const productionHosts = new Set<string>([
      "bccacademy.io",
      "www.bccacademy.io",
      ...programs.map((p) => p.domain),
    ]);
    const onProductionHost = productionHosts.has(window.location.hostname);
    const targetDnsReady = target?.dnsReady !== false;
    if (target && onProductionHost && targetDnsReady) {
      window.location.href = `https://${target.domain}/dashboard`;
    } else {
      document.cookie = `program-override=${slug}; path=/; max-age=86400`;
      // Land on the program's home so the new context is obvious.
      window.location.href = "/dashboard";
    }
  };
  /* eslint-enable react-hooks/immutability */

  const handleSignOut = async () => {
    document.cookie = "atg-demo-user=; path=/; max-age=0";
    document.cookie = "program-override=; path=/; max-age=0";
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    window.location.href = "/";
  };

  const avatarNode = (size: "sm" | "md" | "lg") => {
    const cls =
      size === "sm"
        ? "h-8 w-8 text-[11px]"
        : size === "md"
          ? "h-9 w-9 text-xs"
          : "h-10 w-10 text-sm";
    return (
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-semibold tracking-tight text-white/80 ${cls}`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </span>
    );
  };

  const popoverPosition =
    variant === "sidebar"
      ? "bottom-full mb-2 left-0 origin-bottom-left"
      : "top-full mt-2 right-0 origin-top-right";

  const trigger =
    variant === "sidebar" ? (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? "Close account menu" : "Open account menu"}
        className="flex w-full min-h-[44px] items-center gap-2.5 px-2 py-1.5 text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        {avatarNode("md")}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">
            {firstName} {lastName}
          </span>
          {email && (
            <span className="block truncate text-xs text-neutral-400">
              {email}
            </span>
          )}
        </span>
        <CaretUpDown
          size={14}
          weight="bold"
          aria-hidden
          className="shrink-0 text-neutral-400"
        />
      </button>
    ) : (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? "Close account menu" : "Open account menu"}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-1 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        {avatarNode("sm")}
      </button>
    );

  return (
    <div ref={rootRef} className="relative">
      {trigger}

      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className={`absolute z-40 w-72 border border-rule-soft bg-surface-elevated p-1 shadow-lg ${popoverPosition}`}
        >
          {/* Identity header */}
          <div className="flex items-center gap-3 px-3 py-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper-tint text-sm font-semibold tracking-tight text-ink-soft"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {firstName} {lastName}
              </p>
              {email && (
                <p className="truncate text-xs text-ink-faint">{email}</p>
              )}
            </div>
          </div>

          {/* Program switcher (super-admins) */}
          {canSwitch && programs.length > 1 && (
            <>
              <div className="my-1 h-px bg-rule-soft" role="separator" />
              <div className="px-3 pt-2 pb-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                  Switch program
                </p>
              </div>
              <div className="px-1 pb-1">
                {programs.map((p) => {
                  const isCurrent = p.slug === currentProgramSlug;
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      role="menuitem"
                      onClick={() => handleSwitchProgram(p.slug)}
                      className={`flex w-full items-center gap-2 px-2.5 py-2 text-sm transition-colors ${
                        isCurrent
                          ? "text-ink font-medium"
                          : "text-ink-soft hover:bg-paper-tint-soft hover:text-ink"
                      }`}
                    >
                      <Check
                        size={14}
                        weight="bold"
                        aria-hidden
                        className={`shrink-0 ${isCurrent ? "text-ink" : "text-transparent"}`}
                      />
                      <span className="truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Sign out */}
          <div className="my-1 h-px bg-rule-soft" role="separator" />
          <div className="px-1 pb-1 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-2.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-tint-soft hover:text-ink"
            >
              <SignOut size={15} weight="bold" aria-hidden />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
