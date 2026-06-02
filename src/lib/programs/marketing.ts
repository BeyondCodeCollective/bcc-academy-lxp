import type { ProgramConfig } from "./types";

// The marketing "program" is a stub used by middleware + layout when the
// apex bccacademy.io domain is hit. It is NOT registered in PROGRAMS or
// returned by getAllPrograms — it never appears in admin switchers or
// program-scoped queries. The slug exists purely so layout.tsx, root
// page.tsx, and middleware can branch on `program.slug === "marketing"`
// and render marketing pages instead of a program login.

export const MARKETING_SLUG = "marketing";

export const marketingConfig: ProgramConfig = {
  slug: MARKETING_SLUG,
  name: "BCC Academy",
  tagline: "Where everyone builds together.",
  domain: "bccacademy.io",
  logo: "/images/bcc/logos/bcc-logo-horizontal-white.png",
  colors: {
    primary: "#1a1a1a",
    primaryHover: "#2a2a2a",
    accent: "#E54D2E",
    tagline: "#E54D2E",
  },
  defaultCohort: {
    name: "marketing-placeholder",
    displayName: "BCC Academy",
    startDate: "2026-01-01",
    totalWeeks: 0,
  },
  tracks: [],
  coppa: { required: false },
  seo: {
    title: "Beyond Code Collective — Where everyone builds together",
    description:
      "A community-based learning and workforce ecosystem giving people lifelong access to the skills, relationships, and pathways shaping the future of work. Ages 7 to 77. By us, for everyone.",
    ogTitle: "Beyond Code Collective",
    ogDescription:
      "A community-based learning and workforce ecosystem for ages 7 to 77. Where everyone builds together.",
  },
  organization: "Beyond Code Collective",
};
