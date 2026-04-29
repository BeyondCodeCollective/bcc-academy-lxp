import type { ProgramConfig } from "./types";

export const catalystConfig: ProgramConfig = {
  slug: "catalyst",
  name: "Catalyst",
  tagline: "Beyond Code Collective",
  domain: "catalyst.bccacademy.io",
  logo: "/catalyst/logo.svg",
  colors: {
    primary: "#1a1a1a",
    primaryHover: "#2a2a2a",
    accent: "#E54D2E",
    tagline: "#E54D2E",
  },
  defaultCohort: {
    name: "catalyst-placeholder",
    displayName: "Catalyst",
    startDate: "2026-01-01",
    totalWeeks: 0,
  },
  // Security+ track config will be added once cohort details are confirmed
  // (start date, instructor, session schedule, week count).
  tracks: [],
  surveys: [
    {
      id: "network-plus-post",
      title: "CompTIA Network+ End-of-Cohort Survey",
      description:
        "15–18 min. You made it — before you wrap up this cohort, tell us how the program landed, what worked, and where you're headed next.",
      required: false,
    },
  ],
  coppa: { required: false },
  seo: {
    title: "Catalyst — Beyond Code Collective",
    description:
      "Catalyst is a Beyond Code Collective program supporting learners through CompTIA certification and beyond.",
    ogTitle: "Catalyst — Beyond Code Collective",
    ogDescription:
      "Catalyst is a Beyond Code Collective program supporting learners through CompTIA certification and beyond.",
  },
  organization: "Beyond Code Collective",
};
