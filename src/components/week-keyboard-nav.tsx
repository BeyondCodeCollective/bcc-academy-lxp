"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  prevHref: string | null;
  nextHref: string | null;
}

/**
 * Keyboard shortcuts for the week page. Left/Right (or j/k) jump between
 * weeks. Ignored if the user is typing in a field or has a modifier key
 * pressed — we don't want to intercept browser shortcuts or break form
 * input.
 */
export function WeekKeyboardNav({ prevHref, nextHref }: Props) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.key === "ArrowLeft" || e.key === "k") && prevHref) {
        e.preventDefault();
        router.push(prevHref);
      } else if ((e.key === "ArrowRight" || e.key === "j") && nextHref) {
        e.preventDefault();
        router.push(nextHref);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prevHref, nextHref, router]);

  return null;
}
