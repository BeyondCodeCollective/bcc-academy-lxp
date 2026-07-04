"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  House,
  BookOpen,
  Confetti,
  ChatsCircle,
  Compass,
} from "@phosphor-icons/react";

type Item = {
  label: string;
  href: string;
  hint: string;
  Icon: typeof House;
  /** Extra text matched against the query but not shown (subtitle, objectives…). */
  keywords?: string;
};

/** A searchable content entry passed in from the server (course or lesson). */
export type SearchItem = {
  label: string;
  href: string;
  hint: string;
  keywords?: string;
};

const DESTINATIONS: Item[] = [
  { label: "Home", href: "/dashboard", hint: "Your dashboard", Icon: House },
  { label: "Workshops", href: "/dashboard/workshops", hint: "Events & recordings", Icon: Confetti },
  { label: "AI Tutor", href: "/dashboard/tutor", hint: "Ask anything", Icon: ChatsCircle },
  { label: "Resources", href: "/dashboard/resources", hint: "Materials & contacts", Icon: Compass },
];

const MAX_RESULTS = 30;

/**
 * ⌘K command palette behind the top-bar search. Opens on click or ⌘K/Ctrl+K.
 * Empty query shows the quick-nav destinations; typing searches across all
 * course + lesson content (title, hint, and hidden keywords). Arrow-keys +
 * Enter to navigate.
 */
export function CommandPalette({
  items: content = [],
  confined = false,
  tutorAvailable = false,
}: {
  items?: SearchItem[];
  /** Pending registrant — confined to the holding page, so search only offers
   *  Home (everything else would just bounce them). */
  confined?: boolean;
  /** The AI Tutor is per-program opt-in (Forte only today) — its /dashboard/
   *  tutor route 404s everywhere else, so search must not offer it there. */
  tutorAvailable?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    // Confined learners can't reach Workshops / Tutor / Resources or the catalog.
    const destinations = (
      confined
        ? DESTINATIONS.filter((d) => d.href === "/dashboard")
        : DESTINATIONS
    ).filter((d) => d.href !== "/dashboard/tutor" || tutorAvailable);
    const q = query.trim().toLowerCase();
    // No query → just the quick-nav shortcuts, not the whole catalog.
    if (!q) return destinations;
    const pool: Item[] = [
      ...destinations,
      ...(confined ? [] : content.map((c) => ({ ...c, Icon: BookOpen as typeof House }))),
    ];
    // Token AND-match: every word in the query must appear somewhere in the
    // item's text, in any order. So "what is ai" matches a lesson titled
    // "Introduction to AI" with subtitle "What AI Is and How It Works".
    const tokens = q.split(/\s+/).filter(Boolean);
    return pool
      .filter((d) => {
        const hay = `${d.label} ${d.hint} ${d.keywords ?? ""}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
      .slice(0, MAX_RESULTS);
  }, [query, content, confined, tutorAvailable]);

  const openPalette = () => {
    setQuery("");
    setActive(0);
    setOpen(true);
  };

  // Global keys: ⌘K/Ctrl+K toggles, Escape always closes (regardless of
  // which element has focus — that's what makes "can't escape" go away).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setActive(0);
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus the input once the dialog mounts — a ref call, no state writes.
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        className="group mx-auto flex h-9 w-full max-w-md items-center gap-2.5 panel px-3 text-left transition-colors hover:border-ink-faint"
      >
        <MagnifyingGlass size={15} weight="bold" className="text-ink-faint" aria-hidden />
        <span className="flex-1 text-[13px] text-ink-faint">Search courses, pages…</span>
        <kbd className="rounded border border-rule bg-paper px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
          ⌘K
        </kbd>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/40 px-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="w-full max-w-lg overflow-hidden panel shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, items.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Enter" && items[active]) {
                e.preventDefault();
                go(items[active].href);
              }
            }}
          >
            <div className="flex items-center gap-2.5 border-b border-rule px-4">
              <MagnifyingGlass size={16} weight="bold" className="text-ink-faint" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Search courses, pages…"
                className="h-12 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {items.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-ink-faint">No matches.</li>
              )}
              {items.map((d, i) => (
                <li key={d.href}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(d.href)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      i === active ? "bg-primary/[0.08]" : "hover:bg-paper-tint"
                    }`}
                  >
                    <d.Icon
                      size={18}
                      weight="bold"
                      className={i === active ? "text-primary" : "text-ink-faint"}
                      aria-hidden
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-ink">{d.label}</span>
                      <span className="block text-xs text-ink-soft">{d.hint}</span>
                    </span>
                    {i === active && (
                      <kbd className="rounded border border-rule bg-paper px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
                        ↵
                      </kbd>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
