import type { TrackConfig } from "./types";

// ── CompTIA Network+ ────────────────────────────────────────────────────────

const networkPlusTrack: TrackConfig = {
  slug: "network-plus",
  name: "CompTIA Network+",
  shortName: "Network+",
  type: "weekly",
  totalWeeks: 24,
  sessionsPerWeek: 1,
  unitLabel: "Session",
  startDate: "2026-07-01",
  instructor: "Kobie Joyner",
  sessionTimes: ["Wed & Fri · 11am–1pm ET"],
  lastSessionDayOffset: 1,
  phase: "core",
  submissionsEnabled: false,
  reflectionsEnabled: true,
  publicSurveys: ["network-plus-post", "security-plus-application"],
  defaultReflectionPrompts: [
    "What did you learn this session?",
    "What was challenging?",
    "How will you apply this going forward?",
  ],
  weekSummaries: [
    { week: 1, topic: "Orientation & the OSI Model", icon: "🌐" },
    { week: 2, topic: "TCP/IP, Encapsulation & Topologies", icon: "📦" },
    { week: 3, topic: "Ethernet, Cabling & Connectors", icon: "🔌" },
    { week: 4, topic: "Copper, Fiber & Transceivers", icon: "🧵" },
    { week: 5, topic: "IPv4 Addressing & Subnetting", icon: "🔢" },
    { week: 6, topic: "IPv6 Addressing & Address Planning", icon: "🆔" },
    { week: 7, topic: "Switching, VLANs & Trunking", icon: "🔀" },
    { week: 8, topic: "Routing Fundamentals", icon: "🧭" },
    { week: 9, topic: "Wireless Standards & Deployments", icon: "📶" },
    { week: 10, topic: "Wireless Security & Troubleshooting", icon: "🛡️" },
    { week: 11, topic: "Network Services: DNS, DHCP, NTP", icon: "🖥️" },
    { week: 12, topic: "Cloud Networking & Virtualization", icon: "☁️" },
    { week: 13, topic: "Infrastructure Devices & Functions", icon: "🧰" },
    { week: 14, topic: "High Availability & Load Balancing", icon: "⚖️" },
    { week: 15, topic: "Monitoring & Performance Metrics", icon: "📊" },
    { week: 16, topic: "Documentation & Change Management", icon: "📝" },
    { week: 17, topic: "Physical Security & Hardening", icon: "🔒" },
    { week: 18, topic: "Authentication, Authorization & Access Control", icon: "🔑" },
    { week: 19, topic: "Security Appliances & Secure Design", icon: "🧱" },
    { week: 20, topic: "Network Attacks & Mitigation", icon: "⚔️" },
    { week: 21, topic: "Troubleshooting Methodology", icon: "🔍" },
    { week: 22, topic: "Troubleshooting Connectivity, Routing & Switching", icon: "🔧" },
    { week: 23, topic: "Troubleshooting Wireless, Security & Performance", icon: "📡" },
    { week: 24, topic: "Comprehensive Review & Exam Readiness", icon: "🎓" },
  ],
  weeks: [
    {
      week: 1,
      title: "Orientation & the OSI Model",
      icon: "🌐",
      subtitle: "Wed · Jul 1",
      description: "Course Orientation, Network Fundamentals, OSI Model.",
      objectives: [
        "Course orientation and expectations",
        "Networking fundamentals",
        "The OSI model and its seven layers",
      ],
      sessions: [
        { title: "Course Orientation, Network Fundamentals, OSI Model", time: "Wed 11am–1pm ET" },
      ],
    },
    {
      week: 2,
      title: "TCP/IP, Encapsulation & Topologies",
      icon: "📦",
      subtitle: "Fri · Jul 3",
      description: "TCP/IP Model, Encapsulation, Network Types and Topologies.",
      objectives: [
        "The TCP/IP model",
        "Encapsulation and de-encapsulation",
        "Network types and topologies",
      ],
      sessions: [
        { title: "TCP/IP Model, Encapsulation, Network Types and Topologies", time: "Fri 11am–1pm ET" },
      ],
    },
    {
      week: 3,
      title: "Ethernet, Cabling & Connectors",
      icon: "🔌",
      subtitle: "Wed · Jul 8",
      description: "Ethernet Standards, Cabling and Connectors.",
      objectives: [
        "Ethernet standards",
        "Cabling types",
        "Connectors",
      ],
      sessions: [
        { title: "Ethernet Standards, Cabling and Connectors", time: "Wed 11am–1pm ET" },
      ],
    },
    {
      week: 4,
      title: "Copper, Fiber & Transceivers",
      icon: "🧵",
      subtitle: "Fri · Jul 10",
      description: "Copper, Fiber Optic, and Transceiver Technologies.",
      objectives: [
        "Copper cabling",
        "Fiber optic cabling",
        "Transceiver technologies",
      ],
      sessions: [
        { title: "Copper, Fiber Optic, and Transceiver Technologies", time: "Fri 11am–1pm ET" },
      ],
    },
    {
      week: 5,
      title: "IPv4 Addressing & Subnetting",
      icon: "🔢",
      subtitle: "Wed · Jul 15",
      description: "IPv4 Addressing and Subnetting.",
      objectives: [
        "IPv4 addressing",
        "Subnetting",
        "CIDR notation",
      ],
      sessions: [
        { title: "IPv4 Addressing and Subnetting", time: "Wed 11am–1pm ET" },
      ],
    },
    {
      week: 6,
      title: "IPv6 Addressing & Address Planning",
      icon: "🆔",
      subtitle: "Fri · Jul 17",
      description: "IPv6 Addressing, Address Planning, Practice Lab.",
      objectives: [
        "IPv6 addressing",
        "Address planning",
        "Hands-on practice lab",
      ],
      sessions: [
        { title: "IPv6 Addressing, Address Planning, Practice Lab", time: "Fri 11am–1pm ET" },
      ],
    },
    {
      week: 7,
      title: "Switching, VLANs & Trunking",
      icon: "🔀",
      subtitle: "Wed · Jul 22",
      description: "Switching Concepts, VLANs, Trunking.",
      objectives: [
        "Switching concepts",
        "VLANs",
        "Trunking",
      ],
      sessions: [
        { title: "Switching Concepts, VLANs, Trunking", time: "Wed 11am–1pm ET" },
      ],
    },
    {
      week: 8,
      title: "Routing Fundamentals",
      icon: "🧭",
      subtitle: "Fri · Jul 24",
      description: "Routing Fundamentals, Static and Dynamic Routing.",
      objectives: [
        "Routing fundamentals",
        "Static routing",
        "Dynamic routing",
      ],
      sessions: [
        { title: "Routing Fundamentals, Static and Dynamic Routing", time: "Fri 11am–1pm ET" },
      ],
    },
    {
      week: 9,
      title: "Wireless Standards & Deployments",
      icon: "📶",
      subtitle: "Wed · Jul 29",
      description: "Wireless Networking Standards and Deployments.",
      objectives: [
        "Wireless networking standards",
        "Wireless deployment models",
      ],
      sessions: [
        { title: "Wireless Networking Standards and Deployments", time: "Wed 11am–1pm ET" },
      ],
    },
    {
      week: 10,
      title: "Wireless Security & Troubleshooting",
      icon: "🛡️",
      subtitle: "Fri · Jul 31",
      description: "Wireless Security, Site Surveys, Troubleshooting.",
      objectives: [
        "Wireless security",
        "Site surveys",
        "Wireless troubleshooting",
      ],
      sessions: [
        { title: "Wireless Security, Site Surveys, Troubleshooting", time: "Fri 11am–1pm ET" },
      ],
    },
    {
      week: 11,
      title: "Network Services: DNS, DHCP, NTP",
      icon: "🖥️",
      subtitle: "Wed · Aug 12",
      description: "Network Services: DNS, DHCP, NTP.",
      objectives: [
        "DNS",
        "DHCP",
        "NTP",
      ],
      sessions: [
        { title: "Network Services: DNS, DHCP, NTP", time: "Wed 11am–1pm ET" },
      ],
    },
    {
      week: 12,
      title: "Cloud Networking & Virtualization",
      icon: "☁️",
      subtitle: "Fri · Aug 14",
      description: "Cloud Networking and Virtualization Concepts.",
      objectives: [
        "Cloud networking concepts",
        "Virtualization concepts",
      ],
      sessions: [
        { title: "Cloud Networking and Virtualization Concepts", time: "Fri 11am–1pm ET" },
      ],
    },
    {
      week: 13,
      title: "Infrastructure Devices & Functions",
      icon: "🧰",
      subtitle: "Wed · Aug 19",
      description: "Network Infrastructure Devices and Functions.",
      objectives: [
        "Network infrastructure devices",
        "Device functions and placement",
      ],
      sessions: [
        { title: "Network Infrastructure Devices and Functions", time: "Wed 11am–1pm ET" },
      ],
    },
    {
      week: 14,
      title: "High Availability & Load Balancing",
      icon: "⚖️",
      subtitle: "Fri · Aug 21",
      description: "High Availability, Redundancy, Load Balancing.",
      objectives: [
        "High availability",
        "Redundancy",
        "Load balancing",
      ],
      sessions: [
        { title: "High Availability, Redundancy, Load Balancing", time: "Fri 11am–1pm ET" },
      ],
    },
    {
      week: 15,
      title: "Monitoring & Performance Metrics",
      icon: "📊",
      subtitle: "Wed · Aug 26",
      description: "Network Monitoring and Performance Metrics.",
      objectives: [
        "Network monitoring",
        "Performance metrics",
      ],
      sessions: [
        { title: "Network Monitoring and Performance Metrics", time: "Wed 11am–1pm ET" },
      ],
    },
    {
      week: 16,
      title: "Documentation & Change Management",
      icon: "📝",
      subtitle: "Fri · Aug 28",
      description: "Network Documentation and Change Management.",
      objectives: [
        "Network documentation",
        "Change management",
      ],
      sessions: [
        { title: "Network Documentation and Change Management", time: "Fri 11am–1pm ET" },
      ],
    },
    {
      week: 17,
      title: "Physical Security & Hardening",
      icon: "🔒",
      subtitle: "Wed · Sep 2",
      description: "Physical Security and Network Hardening.",
      objectives: [
        "Physical security",
        "Network hardening",
      ],
      sessions: [
        { title: "Physical Security and Network Hardening", time: "Wed 11am–1pm ET" },
      ],
    },
    {
      week: 18,
      title: "Authentication, Authorization & Access Control",
      icon: "🔑",
      subtitle: "Fri · Sep 4",
      description: "Authentication, Authorization, and Access Control.",
      objectives: [
        "Authentication",
        "Authorization",
        "Access control",
      ],
      sessions: [
        { title: "Authentication, Authorization, and Access Control", time: "Fri 11am–1pm ET" },
      ],
    },
    {
      week: 19,
      title: "Security Appliances & Secure Design",
      icon: "🧱",
      subtitle: "Wed · Sep 9",
      description: "Security Appliances and Secure Network Design.",
      objectives: [
        "Security appliances",
        "Secure network design",
      ],
      sessions: [
        { title: "Security Appliances and Secure Network Design", time: "Wed 11am–1pm ET" },
      ],
    },
    {
      week: 20,
      title: "Network Attacks & Mitigation",
      icon: "⚔️",
      subtitle: "Fri · Sep 11",
      description: "Common Network Attacks and Mitigation Techniques.",
      objectives: [
        "Common network attacks",
        "Mitigation techniques",
      ],
      sessions: [
        { title: "Common Network Attacks and Mitigation Techniques", time: "Fri 11am–1pm ET" },
      ],
    },
    {
      week: 21,
      title: "Troubleshooting Methodology",
      icon: "🔍",
      subtitle: "Wed · Sep 16",
      description: "Network Troubleshooting Methodology.",
      objectives: [
        "The network troubleshooting methodology",
        "Structured problem-solving",
      ],
      sessions: [
        { title: "Network Troubleshooting Methodology", time: "Wed 11am–1pm ET" },
      ],
    },
    {
      week: 22,
      title: "Troubleshooting Connectivity, Routing & Switching",
      icon: "🔧",
      subtitle: "Fri · Sep 18",
      description: "Troubleshooting Connectivity, Routing, and Switching Issues.",
      objectives: [
        "Troubleshoot connectivity issues",
        "Troubleshoot routing issues",
        "Troubleshoot switching issues",
      ],
      sessions: [
        { title: "Troubleshooting Connectivity, Routing, and Switching Issues", time: "Fri 11am–1pm ET" },
      ],
    },
    {
      week: 23,
      title: "Troubleshooting Wireless, Security & Performance",
      icon: "📡",
      subtitle: "Wed · Sep 23",
      description: "Troubleshooting Wireless, Security, and Performance Issues.",
      objectives: [
        "Troubleshoot wireless issues",
        "Troubleshoot security issues",
        "Troubleshoot performance issues",
      ],
      sessions: [
        { title: "Troubleshooting Wireless, Security, and Performance Issues", time: "Wed 11am–1pm ET" },
      ],
    },
    {
      week: 24,
      title: "Comprehensive Review & Exam Readiness",
      icon: "🎓",
      subtitle: "Fri · Sep 25",
      description: "Comprehensive Review, Practice Exam, Exam Readiness Assessment.",
      objectives: [
        "Comprehensive course review",
        "Full practice exam",
        "Exam readiness assessment",
      ],
      sessions: [
        { title: "Comprehensive Review, Practice Exam, Exam Readiness Assessment", time: "Fri 11am–1pm ET" },
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
