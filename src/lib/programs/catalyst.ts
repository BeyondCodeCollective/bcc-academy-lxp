import type { ProgramConfig } from "./types";
import { additionalTracks } from "./additional-tracks";

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
  logoLight: "/images/bcc/logos/bcc-horizontal-ink.svg",
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
      skipForTracks: ["game-on", "comptia-security", "tech-and-ai-hangout"],
      organization: "Beyond Code Centers",
    },
    {
      id: "post-survey-spring-2026",
      title: "AI Fundamentals — Post-Program Survey",
      description:
        "You made it — share how the program landed and where you're headed next. Takes about 5 minutes.",
      required: false,
      // Same opt-outs as the pre-survey: these cohorts aren't AI Fundamentals,
      // so neither their students nor their instructors should see it.
      skipForTracks: ["game-on", "comptia-security", "tech-and-ai-hangout"],
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
