import type { Variants, Transition } from "framer-motion";

// Exponential easing — smooth deceleration like real objects
const expoOut = [0.16, 1, 0.3, 1] as const;
const quartOut = [0.25, 1, 0.5, 1] as const;
const quintOut = [0.22, 1, 0.36, 1] as const;

// ── Fade + Translate ──────────────────────────────────

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: expoOut } as Transition,
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -80 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.9, ease: quintOut } as Transition,
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 80 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.9, ease: quintOut } as Transition,
  },
};

// Rise from below with scale for headlines
export const heroReveal: Variants = {
  hidden: { opacity: 0, y: 100, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 1.2, ease: expoOut } as Transition,
  },
};

// Counter/stat punch — scales in with emphasis
export const statPunch: Variants = {
  hidden: { opacity: 0, scale: 0.5, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 1, ease: expoOut } as Transition,
  },
};

// ── Containers ────────────────────────────────────────

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.2,
    },
  },
};
