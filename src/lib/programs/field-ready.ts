import type { ProgramConfig, TrackConfig } from "./types";

/**
 * Field Ready — its own program, not a track inside Catalyst.
 *
 * It started as `forward-deploy`, a single 13-unit track seeded under Catalyst
 * whose week 1 carried the whole live session. That shape was fine for seven
 * staff who were hand-enrolled. It does not survive strangers signing up: a
 * community learner would become a Catalyst student, sit in Catalyst's rosters,
 * answer Catalyst's surveys and finish holding a Catalyst certificate.
 *
 * So: its own `programs` row, on the same host. Program resolution already
 * falls back to a track's home program (`resolveTrackProgram`), so a program
 * needs no domain of its own — `bccacademy.io/dashboard/track/field-ready-…`
 * resolves here with no DNS work.
 *
 * Three phases, each a track, each opening the next:
 *
 *   Phase 0  Intro     async, always open, no facilitator
 *   Phase 1  Session    live, 90 minutes (or the 2-hour Lab, in a room)
 *   Phase 2  Program    13 sessions, 8 live classes, 7 weeks
 *
 * Phase 2 is NOT defined here. It is DB-driven — `scripts/seed-forward-deploy.mjs`
 * writes it as a track override with its 13 session bodies, and
 * `buildTrackFromOverride` materializes it at request time. Duplicating those
 * 13 units into TypeScript would give the course two sources of truth.
 */

/** Phase 0 · the async intro. The one every community learner meets first. */
const introTrack: TrackConfig = {
  slug: "field-ready-intro",
  name: "Field Ready: Intro",
  shortName: "Phase 0",
  type: "weekly",
  totalWeeks: 1,
  unitLabel: "Session",
  sessionsPerWeek: 1,
  startDate: "2026-09-16",
  instructor: "Self-paced",
  sessionTimes: ["Any time · about 15 minutes"],
  lastSessionDayOffset: 0,
  phase: "phase-0",
  // Async by definition: there is no cohort, no date, and nobody waiting to
  // let you in. The whole point of this phase is that it scales without us.
  selfPaced: true,
  submissionsEnabled: false,
  reflectionsEnabled: false,
  // The only phase a learner can finish on their own recognizance. Phases 1
  // and 2 are signed off by a person — see `selfCompletable` in types.ts.
  selfCompletable: true,
  weekSummaries: [{ week: 1, topic: "Where AI belongs", icon: "🎧" }],
  weeks: [
    {
      week: 1,
      title: "Where AI belongs",
      icon: "🎧",
      subtitle: "A video, six words, and two rounds to prove they stuck",
      description:
        "Most AI pilots die before they ever land. Watch why, pick up the six words the rest of Field Ready is built on, then get tested on them twice. About fifteen minutes, sound on, nothing to install.",
      objectives: [
        "Say why a project can work perfectly and still never land",
        "Use the six words: system of record, guardrail, human in the loop, happy path, eval, leverage point",
        "Recognize those words when they show up in your own work",
      ],
      sessions: [{ title: "The $10M autopsy, then two vocabulary rounds", time: "Any time" }],
    },
  ],
};

/** Phase 1 · the live session. Opens once Phase 0 is done. */
const sessionTrack: TrackConfig = {
  slug: "field-ready-session",
  name: "Field Ready: The Session",
  shortName: "Phase 1",
  type: "weekly",
  totalWeeks: 1,
  unitLabel: "Session",
  sessionsPerWeek: 1,
  startDate: "2026-10-01",
  startDateTbd: true,
  instructor: "Fonz Morris & Mica Le John",
  sessionTimes: ["90 minutes, live · dated runs"],
  lastSessionDayOffset: 0,
  phase: "phase-1",
  submissionsEnabled: false,
  reflectionsEnabled: true,
  // Held until the intro is done. The gate is what makes the ladder a ladder;
  // `prerequisiteTrackSlug` alone is inert — nothing has ever read it.
  prerequisiteTrackSlug: "field-ready-intro",
  gates: [{ type: "prerequisite", trackSlug: "field-ready-intro" }],
  weekSummaries: [{ week: 1, topic: "The one nobody used", icon: "📥" }],
  weeks: [
    {
      week: 1,
      title: "The one nobody used",
      icon: "📥",
      subtitle: "Four enrollments that really arrived, and the rules you'd write",
      description:
        "A youth center shipped a family portal that worked perfectly and never landed. You'll rule on four real enrollments before an AI does, watch where it beats you, and leave having written the three rules that are yours.",
      objectives: [
        "Tell a thing that works from a thing that landed",
        "Decide what an AI may confirm, what it must hold, and what only a person may touch",
        "Write three standing rules for your own desk",
      ],
      sessions: [{ title: "Live, 90 minutes — or two hours in a room, as the Lab", time: "TBD" }],
    },
  ],
};

export const FIELD_READY_SLUG = "field-ready";

/** The DB-seeded 13-session course. Named here so the ladder can point at it. */
export const FIELD_READY_PROGRAM_TRACK = "field-ready-program";

export const fieldReadyConfig: ProgramConfig = {
  slug: FIELD_READY_SLUG,
  name: "Field Ready",
  tagline: "Decide where AI belongs in the work you already do",
  domain: "bccacademy.io",
  logo: "/images/bcc/logos/bcc-horizontal-ink.svg",
  logoLight: "/images/bcc/logos/bcc-horizontal-ink.svg",
  colors: {
    primary: "#1a1a1a",
    primaryHover: "#2a2a2a",
    accent: "#1D59FF",
    tagline: "#1D59FF",
  },
  defaultCohort: {
    name: "field-ready-cohort-1",
    displayName: "Field Ready — Cohort 1",
    startDate: "2026-10-01",
    totalWeeks: 7,
  },
  tracks: [introTrack, sessionTrack],
  surveys: [],
  resourcesEnabled: false,
  // Phase 0 is the front door for strangers, so it must NOT require an invite
  // link. The door is the request-and-approve flow, not a secret URL.
  requireInviteLink: false,
  coppa: { required: false },
  seo: {
    title: "Field Ready — Beyond Code Collective",
    description:
      "Decide where AI belongs in the work you already do. A free intro, a live session, and a seven-week program.",
    ogTitle: "Field Ready",
    ogDescription: "Decide where AI belongs in the work you already do.",
  },
  organization: "Beyond Code Collective",
};
