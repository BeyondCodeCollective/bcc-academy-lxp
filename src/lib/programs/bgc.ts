import type { ProgramConfig, TrackConfig } from "./types";

// Black Girls Code — a distinct organization on the platform, NOT a Catalyst
// track. BGC and BCC share the plumbing but are separate programs/orgs (the
// multi-org model). Runs on the shared bccacademy.io host via cookie override
// until/if BGC gets its own DNS (dnsReady: false). Reachable via /join/bgc and
// the BGC camp landing pages (e.g. /camp/bgc-roblox).

const robloxVirtualBootcampTrack: TrackConfig = {
  slug: "roblox-virtual-bootcamp",
  name: "BGC × BCC Academy: Roblox Virtual Bootcamp",
  shortName: "Roblox Bootcamp",
  description:
    "A 3-day virtual bootcamp for girls ages 10–15, in partnership with Black Girls Code. Students build a real game in Roblox Studio using Lua scripting — from world design to publishing.\n\nNo prior coding experience required. Each session builds directly on the last: design, script, and ship.",
  type: "weekly",
  totalWeeks: 3,
  sessionsPerWeek: 1,
  startDate: "2026-07-07",
  instructor: "TBD",
  sessionTimes: ["Mon–Wed · July 7–9 · Time TBD"],
  lastSessionDayOffset: 2,
  phase: "workshop",
  submissionsEnabled: false,
  reflectionsEnabled: false,
  // Girls 10–15 — keep the playful emoji week icons instead of Phosphor
  emojiIcons: true,
  defaultReflectionPrompts: [
    "What did you build today?",
    "What was the hardest part?",
    "What would you add to your game next?",
  ],
  weekSummaries: [
    { week: 1, topic: "Build Your First World", icon: "🌍" },
    { week: 2, topic: "Script It With Lua", icon: "💻" },
    { week: 3, topic: "Publish & Showcase", icon: "🚀" },
  ],
  weeks: [
    {
      week: 1,
      title: "Build Your First World",
      icon: "🌍",
      subtitle: "Day 1 · July 7 — Roblox Studio & 3D Design",
      description:
        "Get oriented in Roblox Studio and build your first 3D game world. Learn how to place parts, use the toolbox, and set up a playable environment.",
      objectives: [
        "Install and navigate Roblox Studio",
        "Understand the Explorer and Properties panels",
        "Build a 3D environment using BaseParts and free models",
        "Playtest your world in Studio",
      ],
      sessions: [
        {
          title: "Orientation · Studio Setup · Build Your First World",
          time: "July 7",
        },
      ],
    },
    {
      week: 2,
      title: "Script It With Lua",
      icon: "💻",
      subtitle: "Day 2 · July 8 — Lua Scripting Basics",
      description:
        "Write your first Lua scripts to make your game interactive. Add a leaderboard, coins to collect, and a door that opens when a player touches it.",
      objectives: [
        "Understand what scripts are and how they connect to parts",
        "Write basic Lua: variables, if-statements, functions",
        "Use game.Players and game.Workspace in scripts",
        "Create a coin-collect mechanic with a leaderboard",
      ],
      sessions: [
        {
          title: "Intro to Lua · Coins & Leaderboard · Interactive Parts",
          time: "July 8",
        },
      ],
    },
    {
      week: 3,
      title: "Publish & Showcase",
      icon: "🚀",
      subtitle: "Day 3 · July 9 — Polish, Publish & Show Your Work",
      description:
        "Add finishing touches to your game, publish it to Roblox so anyone can play, and present your creation to the group.",
      objectives: [
        "Add a spawn point, lighting, and sky to polish your world",
        "Configure game settings (name, description, thumbnail)",
        "Publish to Roblox and share the link",
        "Present your game to the cohort",
      ],
      sessions: [
        {
          title: "Polish · Publish · Showcase",
          time: "July 9",
        },
      ],
    },
  ],
};

export const bgcConfig: ProgramConfig = {
  slug: "bgc",
  name: "Black Girls Code",
  tagline: "Build the future you imagine",
  domain: "bccacademy.io",
  // No dedicated BGC subdomain yet — switch via cookie override, not a domain
  // redirect. Flip to true once IT provisions DNS.
  dnsReady: false,
  logo: "/bgc-logo.svg",
  colors: {
    primary: "#7C3AED",
    primaryHover: "#6D28D9",
    accent: "#7C3AED",
    tagline: "#7C3AED",
  },
  defaultCohort: {
    name: "bgc-roblox-cohort-1",
    displayName: "Roblox Bootcamp — July 2026",
    startDate: "2026-07-07",
    totalWeeks: 3,
  },
  tracks: [robloxVirtualBootcampTrack],
  // Camp signups are gated on the BGC event allowlist.
  requireInviteLink: true,
  coppa: {
    required: true,
  },
  seo: {
    title: "Black Girls Code × BCC Academy",
    description:
      "A 3-day virtual bootcamp for girls ages 10–15. Build a real game with Roblox Studio and Lua. July 7–9, 2026.",
    ogTitle: "Black Girls Code × BCC Academy — Roblox Virtual Bootcamp",
    ogDescription:
      "Build a real game with Roblox Studio and Lua. July 7–9, 2026. Ages 10–15.",
  },
  organization: "Black Girls Code",
};
