import type { ProgramConfig } from "./types";

export const catalystConfig: ProgramConfig = {
  slug: "catalyst",
  name: "Catalyst",
  tagline: "Beyond Code Collective",
  domain: "catalyst.bccacademy.io",
  // TODO: replace with Catalyst-specific brand assets when available.
  logo: "/atg-logo.svg",
  logoPng: "/atg-logo.png",
  colors: {
    primary: "#1a1a1a",
    primaryHover: "#2a2a2a",
    accent: "#E54D2E",
    tagline: "#E54D2E",
  },
  // Catalyst does not run cohorts yet — field is required by the type but
  // unused while hasDashboard is false.
  defaultCohort: {
    name: "catalyst-placeholder",
    displayName: "Catalyst",
    startDate: "2026-01-01",
    totalWeeks: 0,
  },
  tracks: [],
  surveys: [
    {
      id: "network-plus-post",
      title: "CompTIA Network+ Post-Survey",
      description:
        "Share how the program worked for you so we can shape future cohorts, resources, and offerings.",
      required: false,
    },
  ],
  coppa: { required: false },
  seo: {
    title: "Catalyst — Beyond Code Collective",
    description:
      "Catalyst is a Beyond Code Collective program supporting learners through CompTIA Network+ and beyond.",
    ogTitle: "Catalyst — Beyond Code Collective",
    ogDescription:
      "Catalyst is a Beyond Code Collective program supporting learners through CompTIA Network+ and beyond.",
  },
  organization: "Beyond Code Collective",
};
