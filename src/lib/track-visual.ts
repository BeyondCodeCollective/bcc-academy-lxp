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

// One curated emoji per track. 🧭 is the fallback for any track slug not
// in the map.
const ICON_FOR_SLUG: Record<string, string> = {
  mass: "🎤",
  techplus: "🔧",
  "ai-fundamentals": "✨",
  "ai-digital-natives": "📱",
  "ai-automation-bootcamp": "✨",
  "ai-literacy": "📖",
  "network-plus": "☁️",
  "endless-games-godot": "🎮",
  "foundations-ai": "🎓",
  "ibm-ai-fundamentals": "📜",
  "salesforce-admin": "🏢",
};

export function iconForTrack(slug: string): string {
  return ICON_FOR_SLUG[slug] ?? "🧭";
}
