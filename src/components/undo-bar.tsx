"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowsClockwise, X } from "@phosphor-icons/react";

/**
 * Undo affordance for actions that are done immediately and can be reversed.
 *
 * Replaces `window.confirm` on reversible admin actions. A confirmation makes
 * the admin pay attention BEFORE every action, including the 99 that were
 * correct; an Undo charges only the one that was a mistake. `confirm()` also
 * blocks the main thread, can't be styled, and can't be focus-managed.
 *
 * Fixed to the viewport's bottom-left so appearing and dismissing never shift
 * page content — a bar that pushes the roster down is worse than the dialog it
 * replaced. Auto-dismisses after `timeoutMs`; the action stays done.
 *
 * Confirmations are still correct for two things and are kept there: anything
 * irreversible (deleting responses) and anything that leaves the building
 * (sending email to families — you cannot un-send).
 */
export function UndoBar({
  message,
  onUndo,
  onDismiss,
  timeoutMs = 8000,
}: {
  message: string;
  /** The inverse action. Throwing shows the failure inline and keeps the bar. */
  onUndo: () => Promise<void>;
  onDismiss: () => void;
  timeoutMs?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);

  // Auto-dismiss, paused once something goes wrong — a failed undo must stay on
  // screen until it's read.
  useEffect(() => {
    if (busy || error) return;
    const t = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(t);
  }, [busy, error, onDismiss, timeoutMs]);

  // Move focus to Undo so a keyboard admin can reverse without hunting for it.
  useEffect(() => {
    undoRef.current?.focus();
  }, []);

  async function handleUndo() {
    setBusy(true);
    setError(null);
    try {
      await onUndo();
      onDismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex max-w-[min(28rem,calc(100vw-2rem))] items-center gap-3 rounded-lg bg-ink px-4 py-3 text-sm text-white shadow-md"
    >
      <span className="min-w-0 flex-1">
        {error ? `Couldn't undo: ${error}` : message}
      </span>
      {!error && (
        <button
          ref={undoRef}
          type="button"
          onClick={handleUndo}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/30 px-3 py-1 font-semibold transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          <ArrowsClockwise size={13} className={busy ? "animate-spin" : undefined} />
          Undo
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={13} />
      </button>
    </div>
  );
}
