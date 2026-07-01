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

// NOTE: Endless Games (Godot) moved to the Black Girls Code program — see
// src/lib/programs/bgc.ts.

// NOTE: "AI Literacy" (slug foundations-ai) is in Beyond Code Centers
// (beyond-code-centers.ts); IBM SkillsBuild moved to Black Girls Code (bgc.ts).

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
  salesforceTrack,
];
