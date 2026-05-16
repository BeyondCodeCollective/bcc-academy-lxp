import type { ProgramConfig } from "./types";
import { atgConfig } from "./atg";
import { forgeConfig } from "./forge";
import { forteConfig } from "./forte";

// Catalyst consolidates all BCC programs into one: ATG, Forge (now
// "Beyond Code Centers"), and Forte tracks live side-by-side. Students
// are enrolled in specific tracks via invite links or admin assignment.
// The program-level config defines shared branding and surveys; the
// tracks carry their own schedule, content, and phase metadata.

export const catalystConfig: ProgramConfig = {
  slug: "catalyst",
  name: "Catalyst",
  tagline: "Workforce development powered by Beyond Code Collective",
  domain: "bccacademy.io",
  logo: "/bcc/logo.svg",
  colors: {
    primary: "#1a1a1a",
    primaryHover: "#2a2a2a",
    accent: "#E54D2E",
    tagline: "#E54D2E",
  },
  defaultCohort: {
    name: "catalyst-cohort-1",
    displayName: "Catalyst — Cohort 1",
    startDate: "2026-03-24",
    totalWeeks: 10,
  },
  tracks: [
    // Foundation — shared across all Catalyst participants
    ...atgConfig.tracks.map((t) => ({
      ...t,
      phase: t.slug === "mass" ? "foundation" as const : "core" as const,
    })),
    // Core — skills training from Beyond Code Centers (formerly The Forge)
    ...forgeConfig.tracks.map((t) => ({
      ...t,
      phase: (t.type === "single-event" ? "workshop" : "core") as string,
    })),
    // Core — Forte Bahamas AI literacy
    ...forteConfig.tracks.map((t) => ({
      ...t,
      phase: "core" as const,
    })),
  ],
  surveys: [
    {
      id: "pre-survey-spring-2026",
      title: "Pre-Survey",
      description:
        "Help us understand your background and experience so we can better support you.",
      required: true,
    },
    {
      id: "post-survey-spring-2026",
      title: "Post-Survey",
      description:
        "You made it — share how the program landed and where you're headed next. Takes about 5 minutes.",
      required: false,
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
