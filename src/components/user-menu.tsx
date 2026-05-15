"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown, SignOut, Check } from "@phosphor-icons/react";
import { TextScaleToggle } from "@/components/text-scale-toggle";
import { ReadAloudButton } from "@/components/read-aloud-button";

type ProgramOption = {
  slug: string;
  name: string;
  domain: string;
};

export function UserMenu({
  firstName,
  lastName,
  email,
  avatarUrl,
  canSwitch,
  programs,
  currentProgramSlug,
  readAloudSelector = "#dashboard-main",
}: {
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl: string | null;
  canSwitch: boolean;
  programs: ProgramOption[];
  currentProgramSlug: string;
  readAloudSelector?: string;
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
    if (target && onProductionHost) {
      window.location.href = `https://${target.domain}/dashboard/admin`;
    } else {
      document.cookie = `program-override=${slug}; path=/; max-age=86400`;
      window.location.reload();
    }
  };

  const handleSignOut = async () => {
    document.cookie = "atg-demo-user=; path=/; max-age=0";
    document.cookie = "program-override=; path=/; max-age=0";
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? "Close account menu" : "Open account menu"}
        className="inline-flex items-center gap-2 rounded-full border border-rule-soft bg-paper px-1 py-1 pr-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper-tint-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 sm:pr-3"
      >
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-paper-tint text-[11px] font-semibold tracking-tight text-ink-soft"
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
        <span className="hidden sm:inline">{firstName}</span>
        <CaretDown
          size={11}
          weight="bold"
          aria-hidden
          className={`hidden text-ink-faint transition-transform sm:inline ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 z-40 mt-2 w-72 origin-top-right rounded-xl border border-rule-soft bg-paper p-1 shadow-[0_8px_24px_-12px_rgba(31,27,22,0.12)]"
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

          {/* Program switcher (super-admins only) */}
          {canSwitch && programs.length > 1 && (
            <>
              <div className="my-1 h-px bg-rule-soft" role="separator" />
              <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                Program
              </div>
              <ul className="px-1">
                {programs.map((p) => {
                  const active = p.slug === currentProgramSlug;
                  return (
                    <li key={p.slug}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleSwitchProgram(p.slug)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                          active
                            ? "bg-paper-tint text-ink"
                            : "text-ink-soft hover:bg-paper-tint-soft hover:text-ink"
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {active && (
                          <Check
                            size={13}
                            weight="bold"
                            aria-hidden
                            className="text-ink-soft"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSwitchProgram("__bcc_surveys__")}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-tint-soft hover:text-ink"
                  >
                    <span className="truncate">BCC — Surveys</span>
                  </button>
                </li>
              </ul>
            </>
          )}

          {/* Accessibility controls */}
          <div className="my-1 h-px bg-rule-soft" role="separator" />
          <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
            Accessibility
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span className="text-xs text-ink-soft">Text size</span>
            <TextScaleToggle compact />
          </div>
          <div className="flex items-center justify-between gap-2 px-3 pb-2">
            <span className="text-xs text-ink-soft">Read aloud</span>
            <ReadAloudButton selector={readAloudSelector} label="Read aloud" />
          </div>

          {/* Sign out */}
          <div className="my-1 h-px bg-rule-soft" role="separator" />
          <div className="px-1 pb-1 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-tint-soft hover:text-ink"
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
