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
      // This is Beyond Code Centers' AI Fundamentals survey, surfaced here
      // because Catalyst aggregates that program's courses. Naming the program
      // it belongs to is the whole rule: the old skip list named four unrelated
      // courses and had to be extended for every new one — it missed MASS, so a
      // MASS Wraparound learner under Beyond the Game was served an "AI
      // Fundamentals" pre-survey and answered it.
      appliesToPrograms: ["beyond-code-centers"],
      // comptia-security learners take the pre-survey as an item inside their
      // acceptance checklist, so it must not force-redirect them away from that
      // checklist on login. (Catalyst-home, so the allowlist already excludes
      // it — kept explicit because the reason is a different one.)
      skipForTracks: ["comptia-security"],
      organization: "Beyond Code Centers",
    },
    {
      id: "post-survey-spring-2026",
      title: "AI Fundamentals — Post-Program Survey",
      description:
        "You made it — share how the program landed and where you're headed next. Takes about 5 minutes.",
      required: false,
      // Same targeting as the pre-survey: it's an AI Fundamentals survey, so it
      // goes to AI Fundamentals learners — not to whoever hasn't been added to
      // an exclusion list yet.
      appliesToPrograms: ["beyond-code-centers"],
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
