"use client";

import { useId, useRef, useState, type CSSProperties, type ReactNode, type PointerEvent } from "react";

export const WORKSPACE_WIDTH = { min: 240, max: 360, initial: 260 };
export function clampWorkspaceWidth(width: number) {
  return Math.min(WORKSPACE_WIDTH.max, Math.max(WORKSPACE_WIDTH.min, width));
}
export function workspaceKeyboardWidth(width: number, key: string): number | null {
  if (key === "Home") return WORKSPACE_WIDTH.min;
  if (key === "End") return WORKSPACE_WIDTH.max;
  if (key === "ArrowLeft") return clampWorkspaceWidth(width - 10);
  if (key === "ArrowRight") return clampWorkspaceWidth(width + 10);
  return null;
}

// Resizing is local presentation state: it never changes filters or reloads data.
export function WorkspaceLayout({ navigation, children }: { navigation: ReactNode; children?: ReactNode }) {
  const sidebarId = useId();
  const [width, setWidth] = useState(WORKSPACE_WIDTH.initial);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointerId: number; x: number; width: number } | null>(null);
  function finish(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return <div className={`mt-8 grid min-w-0 grid-cols-1 gap-y-6 lg:grid-cols-[var(--workspace-width)_16px_minmax(0,1fr)] lg:gap-x-3 lg:gap-y-0 ${dragging ? "select-none" : ""}`}
    style={{ "--workspace-width": `${width}px` } as CSSProperties}>
    <div id={sidebarId} className="min-w-0 self-start lg:sticky lg:top-6">{navigation}</div>
    <div role="separator" aria-label="Resize Impact workspace" aria-orientation="vertical" aria-controls={sidebarId}
      aria-valuemin={WORKSPACE_WIDTH.min} aria-valuemax={WORKSPACE_WIDTH.max} aria-valuenow={width} aria-valuetext={`${width} pixels wide`}
      tabIndex={0} title="Drag to resize. Use left/right arrows, Home or End. Double-click to reset."
      className={`group relative hidden min-h-32 touch-none cursor-col-resize self-stretch rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:block ${dragging ? "bg-primary/10" : "hover:bg-primary/5"}`}
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary) return;
        event.preventDefault(); event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointerId: event.pointerId, x: event.clientX, width };
        setDragging(true);
      }}
      onPointerMove={event => {
        if (drag.current?.pointerId === event.pointerId) setWidth(clampWorkspaceWidth(drag.current.width + event.clientX - drag.current.x));
      }}
      onPointerUp={finish} onPointerCancel={finish}
      onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
      onDoubleClick={() => setWidth(WORKSPACE_WIDTH.initial)}
      onKeyDown={event => {
        const next = workspaceKeyboardWidth(width, event.key);
        if (next !== null) { event.preventDefault(); setWidth(next); }
      }}>
      <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-ink/20 group-hover:bg-primary group-focus-visible:bg-primary" />
      <span aria-hidden="true" className="sticky top-12 mx-auto mt-12 flex h-10 w-3 items-center justify-center rounded-full border border-rule bg-white text-xs text-primary">⋮</span>
    </div>
    <div className="min-w-0">{children}</div>
  </div>;
}
