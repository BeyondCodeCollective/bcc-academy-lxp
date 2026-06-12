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
  ArrowsClockwise,
  Books,
  Brain,
  Briefcase,
  Broadcast,
  Calendar,
  ChartBar,
  ChatCircle,
  ClipboardText,
  CurrencyDollar,
  Desktop,
  Disc,
  Fire,
  FloppyDisk,
  Gear,
  Globe,
  GlobeHemisphereWest,
  Hammer,
  HandFist,
  Handshake,
  IdentificationCard,
  Joystick,
  Laptop,
  Lightbulb,
  Lightning,
  Lock,
  MagnifyingGlass,
  MapTrifold,
  Medal,
  NotePencil,
  Palette,
  PencilLine,
  Plug,
  PuzzlePiece,
  Robot,
  RocketLaunch,
  Ruler,
  Scales,
  ShieldCheck,
  SpeakerHigh,
  Target,
  Users,
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

// Week-topic icons are stored as emoji strings in track config/DB data
// (admins can edit them without a deploy). Adult-facing surfaces render
// them as Phosphor icons via this map; kid-facing tracks (TrackConfig
// `emojiIcons: true`, e.g. the Roblox bootcamp) keep the raw emoji.
// Unmapped emojis fall back to the emoji itself, so DB-authored tracks
// with novel icons never break.
const WEEK_ICON_FOR_EMOJI: Record<string, IconComponent> = {
  "🚀": RocketLaunch,
  "🎯": Target,
  "💻": Laptop,
  "📊": ChartBar,
  "⚡": Lightning,
  "🎨": Palette,
  "🎤": Microphone,
  "🎙️": Microphone,
  "📋": ClipboardText,
  "🔧": Wrench,
  "🛠️": Hammer,
  "🌐": Globe,
  "🌍": GlobeHemisphereWest,
  "🔒": Lock,
  "🛡️": ShieldCheck,
  "🤖": Robot,
  "⚖️": Scales,
  "✍️": PencilLine,
  "📝": NotePencil,
  "💡": Lightbulb,
  "🔍": MagnifyingGlass,
  "🔎": MagnifyingGlass,
  "🗺️": MapTrifold,
  "🧭": Compass,
  "⚙️": Gear,
  "🤝": Handshake,
  "💪": HandFist,
  "💰": CurrencyDollar,
  "📀": Disc,
  "💾": FloppyDisk,
  "🪪": IdentificationCard,
  "💬": ChatCircle,
  "📚": Books,
  "📖": BookOpen,
  "📡": Broadcast,
  "🖥️": Desktop,
  "🎮": GameController,
  "🕹️": Joystick,
  "🧩": PuzzlePiece,
  "💥": Fire,
  "📱": DeviceMobile,
  "🔊": SpeakerHigh,
  "✨": Sparkle,
  "🏗️": Buildings,
  "🧠": Brain,
  "💼": Briefcase,
  "🏅": Medal,
  "☁️": Cloud,
  "👥": Users,
  "📐": Ruler,
  "🔄": ArrowsClockwise,
  "🔌": Plug,
  "📅": Calendar,
  "🎓": GraduationCap,
};

export function weekIconForEmoji(emoji: string): IconComponent | null {
  return WEEK_ICON_FOR_EMOJI[emoji.trim()] ?? null;
}
