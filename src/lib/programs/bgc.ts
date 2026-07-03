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
  certificateName: "Roblox Virtual Bootcamp",
  description:
    "A 3-day virtual bootcamp for girls ages 10–15, in partnership with Black Girls Code. Students build a real game in Roblox Studio using Lua scripting — from world design to publishing.\n\nNo prior coding experience required. Each session builds directly on the last: design, script, and ship.",
  type: "weekly",
  totalWeeks: 3,
  // 3 consecutive days, not weeks — every "Week N" surface renders "Day N"
  // (already live via the track_overrides.unit_label row; mirrored here so
  // config is the source of truth).
  unitLabel: "Day",
  sessionsPerWeek: 1,
  startDate: "2026-07-07",
  // 9:00 AM Eastern on July 7 — drives the holding-page countdown and its
  // add-to-calendar entries (without this they'd default to wrong times).
  kickoffTimeUtc: "2026-07-07T13:00:00Z",
  instructor: "TBD",
  sessionTimes: ["Tue–Thu · July 7–9 · 9:00 AM EST"],
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
      subtitle: "Day 1 — Roblox Studio & 3D Design",
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
      subtitle: "Day 2 — Lua Scripting Basics",
      // Day-of gating: students can't open a future day. Unlocks at
      // midnight ET (04:00 UTC in July) on the day of the session.
      comingSoonUntil: "2026-07-08T04:00:00Z",
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
      subtitle: "Day 3 — Polish, Publish & Show Your Work",
      comingSoonUntil: "2026-07-09T04:00:00Z",
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

const endlessGamesTrack: TrackConfig = {
  slug: "endless-games-godot",
  name: "Endless Games: Core Godot",
  shortName: "Game Dev",
  type: "weekly",
  totalWeeks: 9,
  sessionsPerWeek: 1,
  startDate: "2026-06-01",
  startDateTbd: true,
  instructor: "TBD",
  sessionTimes: ["Day & time TBD"],
  lastSessionDayOffset: 6,
  phase: "core",
  submissionsEnabled: true,
  reflectionsEnabled: true,
  defaultReflectionPrompts: [
    "What did you build this session?",
    "What was the trickiest part?",
    "What would you add if you had more time?",
  ],
  weekSummaries: [
    { week: 1, topic: "Getting Started", icon: "🎮" },
    { week: 2, topic: "Scenes & Nodes", icon: "🧩" },
    { week: 3, topic: "Player Movement", icon: "🕹️" },
    { week: 4, topic: "Physics & Collision", icon: "💥" },
    { week: 5, topic: "UI & Menus", icon: "📱" },
    { week: 6, topic: "Audio & Effects", icon: "🔊" },
    { week: 7, topic: "Level Design", icon: "🗺️" },
    { week: 8, topic: "Polish & Debug", icon: "✨" },
    { week: 9, topic: "Ship Your Game", icon: "🚀" },
  ],
  weeks: [
    { week: 1, title: "Getting Started with Godot", icon: "🎮", subtitle: "Install, Interface, First Project", description: "Set up the Godot engine, navigate the editor, and create your first project.", objectives: ["Install and configure Godot 4", "Navigate the editor interface", "Create and run a first scene", "Understand the project file structure"], sessions: [{ title: "Getting Started with Godot", time: "TBD" }] },
    { week: 2, title: "Scenes & Nodes", icon: "🧩", subtitle: "Building Blocks of Godot", description: "Learn Godot's scene system — how nodes compose into scenes, and scenes compose into games.", objectives: ["Create and nest scenes", "Add and configure nodes", "Use signals for communication", "Manage the scene tree"], sessions: [{ title: "Scenes & Nodes", time: "TBD" }] },
    { week: 3, title: "Player Movement", icon: "🕹️", subtitle: "Input, Animation, Control", description: "Build a controllable character with keyboard/gamepad input and basic animations.", objectives: ["Handle player input", "Implement 2D character movement", "Add sprite animations", "Use AnimationPlayer"], sessions: [{ title: "Player Movement", time: "TBD" }] },
    { week: 4, title: "Physics & Collision", icon: "💥", subtitle: "RigidBody, Area2D, CollisionShape", description: "Add physics and collision detection — make objects interact with each other.", objectives: ["Configure collision shapes and layers", "Use RigidBody2D and Area2D", "Detect and respond to collisions", "Implement basic enemy behavior"], sessions: [{ title: "Physics & Collision", time: "TBD" }] },
    { week: 5, title: "UI & Menus", icon: "📱", subtitle: "HUD, Buttons, Score Display", description: "Build game UI — health bars, score counters, pause menus, and start screens.", objectives: ["Create a HUD with Control nodes", "Build a main menu and pause screen", "Display score and health", "Handle UI input events"], sessions: [{ title: "UI & Menus", time: "TBD" }] },
    { week: 6, title: "Audio & Effects", icon: "🔊", subtitle: "Sound, Music, Particles", description: "Add audio and visual effects to bring your game to life.", objectives: ["Add sound effects and background music", "Use AudioStreamPlayer nodes", "Create particle effects", "Trigger effects from game events"], sessions: [{ title: "Audio & Effects", time: "TBD" }] },
    { week: 7, title: "Level Design", icon: "🗺️", subtitle: "TileMaps, Layouts, Progression", description: "Design game levels using TileMaps and create meaningful progression.", objectives: ["Use TileMap for level creation", "Design level layouts with purpose", "Implement level transitions", "Add collectibles and objectives"], sessions: [{ title: "Level Design", time: "TBD" }] },
    { week: 8, title: "Polish & Debug", icon: "✨", subtitle: "Testing, Optimization, Juice", description: "Polish your game — fix bugs, optimize performance, and add game feel.", objectives: ["Debug common Godot issues", "Add screen shake and juice effects", "Optimize for performance", "Playtest and iterate"], sessions: [{ title: "Polish & Debug", time: "TBD" }] },
    { week: 9, title: "Ship Your Game", icon: "🚀", subtitle: "Export, Publish, Present", description: "Export your game for distribution and present your work.", objectives: ["Export for web and desktop", "Create a game page (itch.io)", "Present your game to the cohort", "Plan your next game project"], sessions: [{ title: "Ship Your Game", time: "TBD" }] },
  ],
};

const ibmSkillsBuildTrack: TrackConfig = {
  slug: "ibm-ai-fundamentals",
  name: "IBM SkillsBuild: AI Fundamentals",
  shortName: "IBM AI",
  type: "weekly",
  totalWeeks: 6,
  sessionsPerWeek: 1,
  startDate: "2026-06-01",
  startDateTbd: true,
  instructor: "TBD",
  sessionTimes: ["Self-paced"],
  lastSessionDayOffset: 6,
  phase: "core",
  submissionsEnabled: false,
  reflectionsEnabled: true,
  defaultReflectionPrompts: [
    "What did you learn this week?",
    "How does this connect to your career goals?",
    "What would you explore further?",
  ],
  weekSummaries: [
    { week: 1, topic: "Introduction to AI", icon: "🧠" },
    { week: 2, topic: "AI in Practice", icon: "⚙️" },
    { week: 3, topic: "AI & Society", icon: "🌍" },
    { week: 4, topic: "AI in the Real World", icon: "💼" },
    { week: 5, topic: "Your Future in AI", icon: "🚀" },
    { week: 6, topic: "Certification & Portfolio", icon: "🏅" },
  ],
  weeks: [
    { week: 1, title: "Introduction to AI", icon: "🧠", subtitle: "What AI Is and How It Works", description: "Build a foundational understanding of artificial intelligence — what it is, how it learns, and where it's used today.", objectives: ["Define artificial intelligence and machine learning", "Explain how AI models are trained", "Identify AI applications in daily life", "Complete the IBM Introduction to AI module"], sessions: [{ title: "Introduction to AI", time: "Self-paced" }] },
    { week: 2, title: "AI in Practice", icon: "⚙️", subtitle: "Tools and Techniques", description: "Get hands-on with AI tools — natural language processing, computer vision, and conversational AI.", objectives: ["Use NLP tools to analyze text", "Explore computer vision applications", "Build a simple chatbot interaction", "Complete the IBM AI in Practice module"], sessions: [{ title: "AI in Practice", time: "Self-paced" }] },
    { week: 3, title: "AI & Society", icon: "🌍", subtitle: "Ethics, Bias, and Responsibility", description: "Examine the societal impact of AI — bias, fairness, privacy, and responsible development.", objectives: ["Identify bias in AI systems", "Discuss ethical implications of AI", "Evaluate AI fairness frameworks", "Complete the IBM AI Ethics module"], sessions: [{ title: "AI & Society", time: "Self-paced" }] },
    { week: 4, title: "AI in the Real World", icon: "💼", subtitle: "Industry Applications", description: "Explore how AI is transforming industries — healthcare, finance, retail, and more.", objectives: ["Map AI applications across industries", "Analyze a real-world AI case study", "Evaluate ROI of AI implementations", "Complete the AI in the Real World module"], sessions: [{ title: "AI in the Real World", time: "Self-paced" }] },
    { week: 5, title: "Your Future in AI", icon: "🚀", subtitle: "Career Paths and Skills", description: "Explore AI career paths — the jobs, the skills, and how to position yourself.", objectives: ["Identify AI job roles and requirements", "Build your LinkedIn profile for AI roles", "Practice AI storytelling and interview skills", "Map your personal AI learning path"], sessions: [{ title: "Your Future in AI", time: "Self-paced" }] },
    { week: 6, title: "Certification & Portfolio", icon: "🏅", subtitle: "IBM Digital Credential", description: "Complete your IBM SkillsBuild AI Fundamentals credential and build your portfolio.", objectives: ["Pass the IBM AI Fundamentals assessment", "Accept your IBM digital credential", "Add the credential to your LinkedIn", "Present your AI learning journey"], sessions: [{ title: "Certification & Portfolio", time: "Self-paced" }] },
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
  tracks: [robloxVirtualBootcampTrack, endlessGamesTrack, ibmSkillsBuildTrack],
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
