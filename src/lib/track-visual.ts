import type { ComponentType } from "react";
import {
  Microphone,
  Wrench,
  Sparkle,
  DeviceMobile,
  BookOpen,
  Cloud,
  GameController,
  GraduationCap,
  Certificate,
  Buildings,
  Compass,
} from "@phosphor-icons/react/dist/ssr";

type IconComponent = ComponentType<{
  size?: number;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  color?: string;
  className?: string;
}>;

// Curated single-tone palette per track. Matte, editorial — no rainbow.
// Color is deterministic per slug so each track keeps its identity across
// sessions and surfaces.
const TRACK_TONES = [
  "#E54D2E", // vermillion (brand)
  "#1F1B16", // ink
  "#2563EB", // editorial blue
  "#15803D", // forest
  "#B45309", // burnt amber
  "#7C3AED", // plum
];

export function toneForTrack(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return TRACK_TONES[Math.abs(h) % TRACK_TONES.length];
}

// One curated Phosphor icon per track. Compass is the fallback for any
// track slug not in the map.
const ICON_FOR_SLUG: Record<string, IconComponent> = {
  mass: Microphone,
  techplus: Wrench,
  "ai-fundamentals": Sparkle,
  "ai-digital-natives": DeviceMobile,
  "ai-automation-bootcamp": Sparkle,
  "ai-literacy": BookOpen,
  "network-plus": Cloud,
  "endless-games-godot": GameController,
  "foundations-ai": GraduationCap,
  "ibm-ai-fundamentals": Certificate,
  "salesforce-admin": Buildings,
};

export function iconForTrack(slug: string): IconComponent {
  return ICON_FOR_SLUG[slug] ?? Compass;
}
