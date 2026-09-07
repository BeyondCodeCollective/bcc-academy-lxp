"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle } from "lucide-react";

/**
 * Session tabs — the second half of the session-page redesign. Everything that
 * used to stack as its own full-width panel down the page (brief, materials,
 * reflection, transcript) is one strip of tabs under the stage, so the page has
 * ONE dominant object instead of five competing ones.
 *
 * Panels are passed in as rendered nodes from the server component, so nothing
 * about how they fetch or render changes — only where they live.
 */

export type SessionTab = {
  id: string;
  label: string;
  /** Small pill after the label (e.g. a materials count). Hidden when 0. */
  count?: number;
  content: ReactNode;
};

export function SessionTabs({
  tabs,
  progressLabel,
  progressComplete,
}: {
  tabs: SessionTab[];
  /** Right-aligned status on the tab rail, e.g. "1 of 3 complete". */
  progressLabel?: string;
  progressComplete?: boolean;
}) {
  const visible = tabs.filter((t) => t.content);
  const [active, setActive] = useState(visible[0]?.id);
  if (visible.length === 0) return null;

  const current = visible.find((t) => t.id === active) ?? visible[0];

  return (
    <div className="mb-8">
      <div
        role="tablist"
        aria-label="Session sections"
        className="flex items-center gap-6 overflow-x-auto border-b border-rule sm:gap-7"
      >
        {visible.map((t) => {
          const isActive = t.id === current.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`session-tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`session-panel-${t.id}`}
              onClick={() => setActive(t.id)}
              className={`-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap pb-2.5 text-sm transition-colors ${
                isActive
                  ? "border-b-2 border-primary font-semibold text-ink"
                  : "text-ink-faint hover:text-ink-soft"
              }`}
            >
              {t.label}
              {!!t.count && (
                <span className="inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-paper-tint px-1.5 text-[10.5px] font-bold text-ink-soft">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}

        {progressLabel && (
          <>
            <div className="hidden flex-1 sm:block" />
            <span className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap pb-2.5 text-[12.5px] text-ink-faint sm:inline-flex">
              <CheckCircle
                size={14}
                className={progressComplete ? "text-success" : "text-rule"}
              />
              {progressLabel}
            </span>
          </>
        )}
      </div>

      <div
        role="tabpanel"
        id={`session-panel-${current.id}`}
        aria-labelledby={`session-tab-${current.id}`}
        className="pt-6"
      >
        {current.content}
      </div>
    </div>
  );
}
