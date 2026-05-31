"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Track = { slug: string; shortName: string };

type Props = {
  tracks: Track[];
  activeTab: string;
  showLunchLearn: boolean;
  onNavigate?: () => void;
};

const LUNCH_LEARN_SLUG = "lunch-learn";

// Sub-nav switcher that replaces the flat PROGRAMS list. As the program
// catalog grows, a long sidebar list gets unwieldy — this packs every
// track + Lunch & Learns into one popover trigger.
export function AdminProgramSwitcher({
  tracks,
  activeTab,
  showLunchLearn,
  onNavigate,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const items = useMemo(() => {
    const base: { slug: string; label: string; icon: "track" | "lunch" }[] = tracks.map(
      (t) => ({ slug: t.slug, label: t.shortName, icon: "track" }),
    );
    if (showLunchLearn) {
      base.push({ slug: LUNCH_LEARN_SLUG, label: "Lunch & Learns", icon: "lunch" });
    }
    return base;
  }, [tracks, showLunchLearn]);

  const activeItem = items.find((i) => i.slug === activeTab) ?? null;

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

  // Clear the pending indicator once the active tab actually matches what
  // we asked for (route transition resolved).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pendingSlug && pendingSlug === activeTab) setPendingSlug(null);
  }, [pendingSlug, activeTab]);

  const handleSelect = (slug: string) => {
    setOpen(false);
    onNavigate?.();
    setPendingSlug(slug);
    startTransition(() => {
      router.push(`/dashboard/admin?tab=${slug}`);
    });
  };

  const triggerLabel = activeItem?.label ?? "All programs";
  const isLunchActive = activeItem?.slug === LUNCH_LEARN_SLUG;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex w-full min-h-[36px] items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors ${
          activeItem
            ? "bg-white/15 text-white"
            : "text-neutral-300 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span aria-hidden className="shrink-0">{isLunchActive ? "☕" : "📖"}</span>
        <span className="flex-1 truncate text-left">{triggerLabel}</span>
        {pendingSlug ? (
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 animate-spin rounded-full border border-white/30 border-t-white/80"
          />
        ) : (
          <span aria-hidden className="shrink-0 opacity-60">↕</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Programs"
          className="absolute left-0 right-0 top-full z-40 mt-1 border border-white/10 bg-ink py-1 shadow-lg"
        >
          {items.map((item) => {
            const isActive = item.slug === activeTab;
            const icon = item.icon === "lunch" ? "☕" : "📖";
            return (
              <button
                key={item.slug}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(item.slug)}
                className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-neutral-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span aria-hidden className="shrink-0">{icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && (
                  <span aria-hidden className="shrink-0 text-white">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
