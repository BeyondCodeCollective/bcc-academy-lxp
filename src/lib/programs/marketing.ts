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
  tagline: "Every Step, Someone's With You",
  domain: "bccacademy.io",
  logo: "/marketing/logo.svg",
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
    title: "BCC Academy — Every Step, Someone's With You",
    description:
      "A global, intergenerational learning ecosystem for ages 7 to 70+. Every learner gets a real human facilitator. Proudly home to Black Girls Code.",
    ogTitle: "BCC Academy",
    ogDescription:
      "A global, intergenerational learning ecosystem for ages 7 to 70+. Every learner gets a real human facilitator.",
  },
  organization: "Beyond Code Collective",
};
