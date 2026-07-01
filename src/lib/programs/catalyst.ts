import type { ProgramConfig, TrackConfig } from "./types";
import { additionalTracks } from "./additional-tracks";

// ── MASS Wraparound (Catalyst shared track) ────────────────────────────────
//
// This is a Catalyst-branded instance of the MASS Wraparound curriculum,
// intended for future non-athlete Catalyst cohorts. It lives under Catalyst
// (slug `mass-catalyst`) and is DISTINCT from the ATG cohort's `mass` track
// so that student data, attendance, and submissions stay cleanly separated.
//
// See `atg.ts` for the original Beyond the Game `mass` track.

const massCatalystTrack: TrackConfig = {
  slug: "mass-catalyst",
  name: "MASS Wraparound",
  shortName: "MASS Wraparound",
  type: "weekly",
  totalWeeks: 8,
  sessionsPerWeek: 1,
  startDate: "2026-07-15",
  startDateTbd: true,
  instructor: "Angel Aviles",
  sessionTimes: ["Tuesdays 10–11am ET"],
  lastSessionDayOffset: 6,
  phase: "core",
  defaultReflectionPrompts: [
    "What did you learn this week?",
    "What was challenging?",
    "How will you apply this going forward?",
  ],
  submissionsEnabled: false,
  reflectionsEnabled: true,
  weekSummaries: [
    { week: 1, topic: "Storytelling", icon: "🎙️" },
    { week: 2, topic: "Networking", icon: "🤝" },
    { week: 3, topic: "The Art of the Brag", icon: "💪" },
    { week: 4, topic: "Guest Speaker", icon: "🎤" },
    { week: 5, topic: "Planning", icon: "📋" },
    { week: 6, topic: "Guest Speaker", icon: "🎤" },
    { week: 7, topic: "Money", icon: "💰" },
    { week: 8, topic: "Career Expo", icon: "🎯" },
  ],
  weeks: [
    {
      week: 1,
      title: "Storytelling for Career Success",
      icon: "🎙️",
      subtitle: "Crafting Your Personal Narrative",
      description:
        "A lot of people have talent. Not everyone knows how to communicate it. This week you'll build the foundation of your professional story — who you are, what you've done, and where you're going.",
      objectives: [
        "Identify your current reality: strengths, gaps, constraints, opportunities",
        "Define your north star — role direction + why it fits",
        "Translate 'I want a better job' into specific outcomes",
        "Build a clear personal narrative for interviews and networking",
      ],
      sessions: [{ title: "Storytelling for Career Success", time: "Tuesday · 10:00 – 11:00 AM ET" }],
      recordingNote: "This session was not recorded to create a safe space for open discussion.",
    },
    {
      week: 2,
      title: "Networking",
      icon: "🤝",
      subtitle: "Building Meaningful Professional Connections",
      description:
        "Networking isn't about collecting business cards — it's about building real relationships that open doors. This week you'll learn how to connect with intention.",
      objectives: [
        "Understand the difference between transactional and relational networking",
        "Build a target list of people to connect with",
        "Craft outreach messages that get responses",
        "Practice the art of the follow-up",
      ],
      sessions: [{ title: "Networking", time: "Tuesday · 10:00 – 11:00 AM ET" }],
    },
    {
      week: 3,
      title: "The Art of the Brag",
      icon: "💪",
      subtitle: "Self-Advocacy & Owning Your Worth",
      description:
        "Most career blocks aren't knowledge gaps — they're action avoidance. This week is about developing the courage to own your accomplishments and communicate your value.",
      objectives: [
        "Overcome imposter syndrome with evidence-based confidence",
        "Learn to quantify and articulate your achievements",
        "Practice self-advocacy in professional settings",
        "Build your Brag Book — a portfolio of proof",
      ],
      sessions: [{ title: "The Art of the Brag", time: "Tuesday · 10:00 – 11:00 AM ET" }],
    },
    {
      week: 4,
      title: "Guest Speaker",
      icon: "🎤",
      subtitle: "Industry Perspectives",
      description:
        "Hear from a professional who has navigated the transition to a tech career. Real stories, real advice, real questions.",
      objectives: [
        "Gain industry perspective from a working professional",
        "Understand different career paths into tech",
        "Ask questions and build your professional network",
        "Connect classroom learning to real-world application",
      ],
      sessions: [{ title: "Guest Speaker", time: "Tuesday · 10:00 – 11:00 AM ET" }],
    },
    {
      week: 5,
      title: "Planning",
      icon: "📋",
      subtitle: "Strategizing Your Career Path",
      description:
        "Clarity reduces busy work and makes effort strategic. This week you'll create an actionable career plan with timelines, milestones, and accountability.",
      objectives: [
        "Map your 30-60-90 day career plan",
        "Identify skill gaps and create a learning roadmap",
        "Set SMART goals for your job search or career pivot",
        "Build accountability structures that stick",
      ],
      sessions: [{ title: "Planning", time: "Tuesday · 10:00 – 11:00 AM ET" }],
    },
    {
      week: 6,
      title: "Guest Speaker",
      icon: "🎤",
      subtitle: "Industry Perspectives",
      description:
        "Another industry professional shares their journey, challenges, and advice for emerging tech professionals.",
      objectives: [
        "Expand your understanding of career possibilities",
        "Learn from someone who has been where you are",
        "Practice professional networking in a live setting",
        "Add to your growing professional network",
      ],
      sessions: [{ title: "Guest Speaker", time: "Tuesday · 10:00 – 11:00 AM ET" }],
    },
    {
      week: 7,
      title: "Money & Financial Confidence",
      icon: "💰",
      subtitle: "Securing Your Economic Future",
      description:
        "Gain essential financial knowledge to negotiate salaries, understand compensation packages, and build long-term financial independence.",
      objectives: [
        "Understand salary ranges for entry-level tech roles",
        "Learn salary negotiation tactics and scripts",
        "Decode benefits packages: health, 401k, equity, PTO",
        "Build a personal budget tied to your career goals",
      ],
      sessions: [{ title: "Money & Financial Confidence", time: "Tuesday · 10:00 – 11:00 AM ET" }],
    },
    {
      week: 8,
      title: "Career Expo",
      icon: "🎯",
      subtitle: "Put Everything Into Practice",
      description:
        "The culmination of MASS — a mini career fair where you'll put your storytelling, networking, self-advocacy, and planning skills to work in front of real employers and professionals.",
      objectives: [
        "Present your professional story to real employers",
        "Practice networking in a live professional setting",
        "Get feedback on your pitch, resume, and presence",
        "Make real connections that could lead to opportunities",
      ],
      sessions: [{ title: "Career Expo", time: "Tuesday · 10:00 – 11:00 AM ET" }],
    },
  ],
};

// Catalyst is its own program. Beyond the Game (slug `atg`), Beyond Code
// Centers, and Upskill Bahamas (Forte) are their OWN programs — their courses
// do NOT aggregate into Catalyst. Students are enrolled in specific tracks via
// invite links or admin assignment. The program-level config defines shared
// branding and surveys; the tracks carry their own schedule, content, and phase.

export const catalystConfig: ProgramConfig = {
  slug: "catalyst",
  name: "Catalyst",
  tagline: "Workforce development powered by Beyond Code Collective",
  domain: "bccacademy.io",
  logo: "/catalyst/logo.svg",
  colors: {
    primary: "#1a1a1a",
    primaryHover: "#2a2a2a",
    accent: "#1D59FF",
    tagline: "#1D59FF",
  },
  defaultCohort: {
    name: "catalyst-cohort-1",
    displayName: "Catalyst — Cohort 1",
    startDate: "2026-03-24",
    totalWeeks: 10,
  },
  tracks: [
    // Catalyst's own tracks (Network+, Salesforce, …). Security+ lives as a DB
    // track_override. Beyond the Game's MASS/Tech+ and Beyond Code Centers' AI
    // tracks belong to those programs, not here.
    ...additionalTracks,
  ],
  surveys: [
    {
      id: "pre-survey-spring-2026",
      title: "AI Fundamentals — Pre-Program Survey",
      description:
        "Help us understand your background and experience so we can better support you.",
      required: true,
      skipForPrograms: ["forte"],
      // Event/workshop courses land registrants on a holding page, not a cohort
      // pre-survey. Game On registrants skip this. comptia-security learners take
      // the pre-survey as an item inside their acceptance checklist, so it must
      // not force-redirect them away from that checklist on login.
      skipForTracks: ["game-on", "comptia-security"],
      organization: "Beyond Code Centers",
    },
    {
      id: "post-survey-spring-2026",
      title: "AI Fundamentals — Post-Program Survey",
      description:
        "You made it — share how the program landed and where you're headed next. Takes about 5 minutes.",
      required: false,
      organization: "Beyond Code Centers",
    },
  ],
  resourcesEnabled: false,
  requireInviteLink: true,
  coppa: { required: false },
  seo: {
    title: "Catalyst — Beyond Code Collective",
    description:
      "Workforce development powered by Beyond Code Collective. AI skills, tech careers, and professional development.",
    ogTitle: "Catalyst — Beyond Code Collective",
    ogDescription:
      "Workforce development powered by Beyond Code Collective.",
  },
  organization: "Beyond Code Collective",
};
