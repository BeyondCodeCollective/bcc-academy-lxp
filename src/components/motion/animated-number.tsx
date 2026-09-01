"use client";

// Count-up number for stat tiles. Adapted from beUI `number`
// (beui.dev/components/motion/number) onto the BCC tokens and framer-motion.
//
// Counts up on mount, NOT on scroll-into-view: admins screenshot and print
// these dashboards to quote the numbers, and a view-gated ticker leaves every
// below-the-fold tile frozen at 0 in a full-page capture.

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function AnimatedNumber({
  value,
  duration = 1.2,
  format = (n) => Math.round(n).toLocaleString(),
  className,
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const controls = animate(fromRef.current, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => setDisplay(v),
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [value, duration, reduce]);

  return (
    <span className={`tabular-nums ${className ?? ""}`.trim()}>
      {format(display)}
    </span>
  );
}
