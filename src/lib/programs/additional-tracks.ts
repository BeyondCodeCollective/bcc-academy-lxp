import type { TrackConfig } from "./types";

// ── CompTIA Network+ ────────────────────────────────────────────────────────

const networkPlusTrack: TrackConfig = {
  slug: "network-plus",
  name: "CompTIA Network+",
  shortName: "Network+",
  type: "weekly",
  totalWeeks: 8,
  sessionsPerWeek: 2,
  startDate: "2026-06-01",
  startDateTbd: true,
  instructor: "TBD",
  sessionTimes: ["Wed & Fri · 10am–12pm ET"],
  lastSessionDayOffset: 4,
  phase: "core",
  submissionsEnabled: false,
  reflectionsEnabled: true,
  publicSurveys: ["network-plus-post", "security-plus-application"],
  defaultReflectionPrompts: [
    "What did you learn this week?",
    "What was challenging?",
    "How will you apply this going forward?",
  ],
  weekSummaries: [
    { week: 1, topic: "Networking Concepts", icon: "🌐" },
    { week: 2, topic: "IP Addressing", icon: "📡" },
    { week: 3, topic: "Network Implementation", icon: "🔧" },
    { week: 4, topic: "Network Services", icon: "🖥️" },
    { week: 5, topic: "Network Operations", icon: "📋" },
    { week: 6, topic: "Network Security", icon: "🔒" },
    { week: 7, topic: "Troubleshooting", icon: "🔍" },
    { week: 8, topic: "Exam Prep", icon: "📝" },
  ],
  weeks: [
    {
      week: 1,
      title: "Networking Concepts",
      icon: "🌐",
      subtitle: "OSI & TCP/IP Models, Network Types, Topologies",
      description: "Foundation of networking — understand the OSI and TCP/IP models, identify network types and topologies, and get hands-on with components and cabling.",
      objectives: [
        "Explain the seven layers of the OSI model and their functions",
        "Compare OSI and TCP/IP models",
        "Identify common network types (LAN, WAN, MAN, PAN)",
        "Describe network topologies and their trade-offs",
      ],
      sessions: [
        { title: "Orientation; OSI & TCP/IP models; Network types; Topologies", time: "Wed 10am–12pm ET" },
        { title: "Ethernet standards; Cabling; Speed & duplex; Lab: Components & topologies", time: "Fri 10am–12pm ET" },
      ],
    },
    {
      week: 2,
      title: "IP Addressing & Subnetting",
      icon: "📡",
      subtitle: "IPv4, IPv6, Binary, CIDR, Ports & Protocols",
      description: "Master IP addressing — convert between binary and decimal, subnet networks, and identify common ports and protocols.",
      objectives: [
        "Convert between binary, decimal, and hexadecimal",
        "Calculate subnets using CIDR notation",
        "Compare IPv4 and IPv6 addressing",
        "Identify common ports and protocols (HTTP, DNS, DHCP, SSH)",
      ],
      sessions: [
        { title: "IPv4 vs IPv6; Binary; Subnetting; CIDR", time: "Wed 10am–12pm ET" },
        { title: "Ports & protocols; Lab: IP addressing & subnetting", time: "Fri 10am–12pm ET" },
      ],
    },
    {
      week: 3,
      title: "Network Implementation",
      icon: "🔧",
      subtitle: "Devices, Wireless, Segmentation",
      description: "Deploy and configure network devices — routers, switches, access points. Understand SOHO vs enterprise architectures and wireless standards.",
      objectives: [
        "Configure routers, switches, and wireless access points",
        "Compare SOHO and enterprise network designs",
        "Implement network segmentation with VLANs",
        "Conduct a basic wireless site survey",
      ],
      sessions: [
        { title: "Network devices; SOHO vs enterprise; Segmentation", time: "Wed 10am–12pm ET" },
        { title: "Wireless standards; Site surveys; Lab: Wired/Wireless setup", time: "Fri 10am–12pm ET" },
      ],
    },
    {
      week: 4,
      title: "Network Services",
      icon: "🖥️",
      subtitle: "DNS, DHCP, NTP, Load Balancing, Virtual Networks",
      description: "Configure and troubleshoot network services — DNS resolution, DHCP leases, NTP synchronization, and virtual networking.",
      objectives: [
        "Configure DNS, DHCP, and NTP services",
        "Explain load balancing and redundancy concepts",
        "Deploy and manage virtual networks",
        "Monitor network service health",
      ],
      sessions: [
        { title: "DNS, DHCP, NTP; Load balancing; Redundancy", time: "Wed 10am–12pm ET" },
        { title: "Virtual networks; Monitoring; Lab: Network services", time: "Fri 10am–12pm ET" },
      ],
    },
    {
      week: 5,
      title: "Network Operations",
      icon: "📋",
      subtitle: "Documentation, Change Management, Business Continuity",
      description: "Manage networks in production — change management processes, documentation standards, and disaster recovery planning.",
      objectives: [
        "Implement change management procedures",
        "Create and maintain network documentation and diagrams",
        "Design high-availability and business continuity plans",
        "Apply disaster recovery concepts",
      ],
      sessions: [
        { title: "Change management; Documentation; Lab: Network diagrams", time: "Wed 10am–12pm ET" },
        { title: "Business continuity; High availability; DR concepts", time: "Fri 10am–12pm ET" },
      ],
    },
    {
      week: 6,
      title: "Network Security",
      icon: "🔒",
      subtitle: "Threats, Firewalls, IDS/IPS, VPNs",
      description: "Secure networks against threats — identify attack vectors, configure firewalls and IDS/IPS, and deploy VPN solutions.",
      objectives: [
        "Identify common network threats and vulnerabilities",
        "Configure firewalls and access control lists",
        "Deploy IDS/IPS solutions",
        "Implement VPN tunnels for secure remote access",
      ],
      sessions: [
        { title: "Threats & vulnerabilities; Attacks", time: "Wed 10am–12pm ET" },
        { title: "Firewalls; IDS/IPS; VPNs; Lab: Securing networks", time: "Fri 10am–12pm ET" },
      ],
    },
    {
      week: 7,
      title: "Network Troubleshooting",
      icon: "🔍",
      subtitle: "Methodology, Tools, Diagnostics",
      description: "Systematic troubleshooting — apply a structured methodology and use diagnostic tools (ping, tracert, ipconfig, Wireshark) to resolve issues.",
      objectives: [
        "Apply a structured troubleshooting methodology",
        "Use ping, tracert, ipconfig, and nslookup effectively",
        "Capture and analyze traffic with Wireshark",
        "Diagnose common connectivity and performance issues",
      ],
      sessions: [
        { title: "Troubleshooting methodology; Common issues", time: "Wed 10am–12pm ET" },
        { title: "Tools: ping, tracert, ipconfig, Wireshark; Lab: Diagnostics", time: "Fri 10am–12pm ET" },
      ],
    },
    {
      week: 8,
      title: "Exam Prep",
      icon: "📝",
      subtitle: "Review, Practice Exams, Test Strategies",
      description: "Final preparation for the CompTIA Network+ N10-009 exam — comprehensive review, performance-based question practice, and test-day strategies.",
      objectives: [
        "Complete a comprehensive domain review across all objectives",
        "Practice performance-based questions (PBQs)",
        "Identify and remediate weak areas",
        "Apply effective test-taking strategies",
      ],
      sessions: [
        { title: "Comprehensive review; PBQ practice", time: "Wed 10am–12pm ET" },
        { title: "Practice exam; Remediation; Test strategies", time: "Fri 10am–12pm ET" },
      ],
    },
  ],
};

// ── Endless Games: Core Godot ───────────────────────────────────────────────

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

// ── Foundations of AI & Digital Skills ───────────────────────────────────────

const foundationsAITrack: TrackConfig = {
  slug: "foundations-ai",
  name: "Foundations of AI & Digital Skills",
  shortName: "AI & Digital Skills",
  type: "weekly",
  totalWeeks: 4,
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
    "What did you learn this sprint?",
    "What was challenging?",
    "How will you apply this going forward?",
  ],
  weekSummaries: [
    { week: 1, topic: "Orientation & AI Research", icon: "🧭" },
    { week: 2, topic: "Discovery & Design", icon: "🔎" },
    { week: 3, topic: "Core System Build", icon: "🏗️" },
    { week: 4, topic: "AI as Interpreter", icon: "🤖" },
  ],
  weeks: [
    { week: 1, title: "Orientation, Framing, and AI as Research Partner", icon: "🧭", subtitle: "Sprint 0 — Setting the Foundation", description: "Orient to the course, set up your tools, and learn how to use AI as a research partner — not a replacement for thinking.", objectives: ["Navigate course tools and collaboration platforms", "Frame AI as a research partner", "Set personal learning goals", "Complete your first AI-assisted research task"], sessions: [{ title: "Sprint 0: Orientation & AI as Research Partner", time: "TBD" }] },
    { week: 2, title: "Discovery & Design", icon: "🔎", subtitle: "Sprint 1 — Research and Plan", description: "Apply AI-assisted research to a real problem — discover needs, define scope, and design a solution.", objectives: ["Conduct AI-assisted user research", "Define a problem statement", "Design a solution architecture", "Create a project brief"], sessions: [{ title: "Sprint 1: Discovery & Design", time: "TBD" }] },
    { week: 3, title: "Core System Build", icon: "🏗️", subtitle: "Sprint 2 — Foundations Not Features", description: "Build the core of your system — focus on solid foundations before adding features.", objectives: ["Set up a development environment", "Build core functionality first", "Use AI for code generation and debugging", "Document your build decisions"], sessions: [{ title: "Sprint 2: Core System Build", time: "TBD" }] },
    { week: 4, title: "AI as Interpreter, Not Authority", icon: "🤖", subtitle: "Sprint 3 — Critical AI Thinking", description: "Learn to use AI output critically — interpret, verify, and improve rather than blindly accepting.", objectives: ["Evaluate AI-generated content for accuracy", "Identify hallucinations and bias in AI output", "Develop a personal framework for AI trust", "Present your capstone project"], sessions: [{ title: "Sprint 3: AI as Interpreter", time: "TBD" }] },
  ],
};

// ── IBM SkillsBuild: AI Fundamentals ────────────────────────────────────────

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

// ── Salesforce Administrator ────────────────────────────────────────────────

const salesforceTrack: TrackConfig = {
  slug: "salesforce-admin",
  name: "Salesforce Administrator",
  shortName: "Salesforce",
  type: "weekly",
  totalWeeks: 8,
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
    "What was challenging?",
    "How will you apply this in a Salesforce org?",
  ],
  weekSummaries: [
    { week: 1, topic: "Platform Basics", icon: "☁️" },
    { week: 2, topic: "Configuration & Setup", icon: "⚙️" },
    { week: 3, topic: "User Management", icon: "👥" },
    { week: 4, topic: "Data Management", icon: "💾" },
    { week: 5, topic: "Lightning Customization", icon: "🎨" },
    { week: 6, topic: "Reports & Dashboards", icon: "📊" },
    { week: 7, topic: "Formulas & Validation", icon: "📐" },
    { week: 8, topic: "Flow Builder", icon: "🔄" },
  ],
  weeks: [
    { week: 1, title: "Salesforce Platform Basics", icon: "☁️", subtitle: "Navigation, Architecture, Orgs", description: "Get oriented in the Salesforce ecosystem — understand the platform architecture, navigate Lightning Experience, and set up your Trailhead org.", objectives: ["Navigate Lightning Experience", "Understand Salesforce architecture (objects, fields, records)", "Set up a Trailhead Playground org", "Complete the Platform Basics Trailhead module"], sessions: [{ title: "Salesforce Platform Basics", time: "Self-paced" }] },
    { week: 2, title: "Configuration & Setup", icon: "⚙️", subtitle: "Company Settings, Fiscal Year, UI", description: "Configure org-wide settings — company information, fiscal year, business hours, and UI customization.", objectives: ["Configure company settings and locale", "Set up fiscal year and business hours", "Customize the Lightning UI", "Complete Focus on Force Configuration modules"], sessions: [{ title: "Configuration & Setup", time: "Self-paced" }] },
    { week: 3, title: "User Management", icon: "👥", subtitle: "Users, Profiles, Permissions, Roles", description: "Manage users and access — profiles, permission sets, role hierarchy, and sharing rules.", objectives: ["Create and manage user accounts", "Configure profiles and permission sets", "Design a role hierarchy", "Implement sharing rules and org-wide defaults"], sessions: [{ title: "User Management", time: "Self-paced" }] },
    { week: 4, title: "Data Management", icon: "💾", subtitle: "Import, Export, Quality, Privacy", description: "Manage data in Salesforce — import/export tools, data quality, deduplication, and privacy.", objectives: ["Use Data Import Wizard and Data Loader", "Export data and create backups", "Implement data quality rules", "Understand data privacy and compliance"], sessions: [{ title: "Data Management", time: "Self-paced" }] },
    { week: 5, title: "Lightning Experience Customization", icon: "🎨", subtitle: "Apps, Pages, Components, Actions", description: "Customize Lightning Experience — build custom apps, page layouts, record pages, and quick actions.", objectives: ["Create custom Lightning apps", "Customize page layouts and record pages", "Build list views and compact layouts", "Create custom buttons and quick actions"], sessions: [{ title: "Lightning Experience Customization", time: "Self-paced" }] },
    { week: 6, title: "Reports & Dashboards", icon: "📊", subtitle: "Report Types, Filters, Charts", description: "Build reports and dashboards — create report types, apply filters, and visualize data.", objectives: ["Create tabular, summary, and matrix reports", "Apply filters and groupings", "Build dashboard components", "Schedule and share reports"], sessions: [{ title: "Reports & Dashboards", time: "Self-paced" }] },
    { week: 7, title: "Formulas & Validation", icon: "📐", subtitle: "Formula Fields, Validation Rules, Roll-Ups", description: "Automate calculations and enforce data integrity with formulas and validation rules.", objectives: ["Write formula fields for calculated data", "Create validation rules for data quality", "Use roll-up summary fields", "Debug formula errors"], sessions: [{ title: "Formulas & Validation", time: "Self-paced" }] },
    { week: 8, title: "Flow Builder", icon: "🔄", subtitle: "Automation, Screen Flows, Record-Triggered", description: "Automate business processes with Flow Builder — screen flows, record-triggered flows, and scheduled flows.", objectives: ["Build screen flows for user interactions", "Create record-triggered flows", "Design scheduled automation", "Become an Agentblazer with AI-powered flows"], sessions: [{ title: "Flow Builder", time: "Self-paced" }] },
  ],
};

// NOTE: The Roblox Virtual Bootcamp moved to its own program — Black Girls
// Code is a separate org, not a Catalyst track. See src/lib/programs/bgc.ts.

export const additionalTracks: TrackConfig[] = [
  networkPlusTrack,
  endlessGamesTrack,
  foundationsAITrack,
  ibmSkillsBuildTrack,
  salesforceTrack,
];
