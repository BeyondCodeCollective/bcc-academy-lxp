"use client";

import { useState } from "react";
import { CaretLeft } from "@phosphor-icons/react";

const KEY = "nav-collapsed";

/**
 * Collapses the light shell's sidebar to an icon rail. Persists to
 * localStorage and toggles data-nav-collapsed on <html>; the width/offset
 * transitions live in globals.css so the sidebar and content move together.
 */
export function SidebarToggle() {
  // Seed from the attribute the layout's pre-paint script already set, so
  // the button's pressed state matches the rendered rail without an effect.
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.dataset.navCollapsed === "true",
  );

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.dataset.navCollapsed = String(next);
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      // storage unavailable — non-persistent toggle still works this session
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-pressed={collapsed}
      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-paper-tint hover:text-ink md:flex"
    >
      <CaretLeft
        size={16}
        weight="bold"
        aria-hidden
        className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
      />
    </button>
  );
}
