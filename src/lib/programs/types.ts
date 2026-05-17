export type TrackType = "weekly" | "single-event";

export type SessionInfo = {
  title: string;
  time: string;
};

// ─── Track Gates ─────────────────────────────────────────────────────────────
//
// A TrackGate declares a condition that must be satisfied before a student
// can view track content. Gates are evaluated declaratively from TrackConfig;
// the page renders the gate's UI and stops if the condition is unmet.
//
// Gate types:
//   intake — collect demographic/preference data via an intake form.
//            surveyKey stores the responses as survey_type "intake-<key>".

export type IntakeGate = {
  type: "intake";
  /** Used as the survey_type key: stored as "intake-<surveyKey>" */
  surveyKey: string;
  questions: IntakeQuestion[];
};

export type TrackGate = IntakeGate;
// Future gate types (e.g. survey_completion, week_submission) extend this union.

// ─── Intake Form Questions (used by IntakeGate) ───────────────────────────────

export type IntakeRadioQuestion = {
  type: "radio";
  id: string;
  label: string;
  options: string[];
  required?: boolean;
};

export type IntakeMultiSelectQuestion = {
  type: "multi-select";
  id: string;
  label: string;
  options: string[];
  required?: boolean;
};

export type IntakeTextQuestion = {
  type: "text";
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
};

export type IntakeQuestion =
  | IntakeRadioQuestion
  | IntakeMultiSelectQuestion
  | IntakeTextQuestion;

export type WeekConfig = {
  week: number;
  title: string;
  icon: string;
  subtitle: string;
  description: string;
  objectives: string[];
  sessions: SessionInfo[];
  /** Optional note shown instead of recording (e.g. "This session was not recorded") */
  recordingNote?: string | null;
  /** Custom reflection prompts for this specific week (overrides track defaults) */
  reflectionPrompts?: string[];
};

export type TrackConfig = {
  /** URL-safe identifier: "mass", "techplus", "ai-fundamentals" */
  slug: string;
  /** Display name shown in UI */
  name: string;
  /** Short label for dashboard cards */
  shortName: string;
  /** One-paragraph track overview, shown on the track landing page. */
  description?: string;
  type: TrackType;
  totalWeeks: number;
  sessionsPerWeek: number;
  startDate: string;
  instructor: string;
  /** Human-readable schedule: ["Tuesday 10-11am ET"] */
  sessionTimes: string[];
  /** For computeCurrentWeek — days after week start when last session occurs */
  lastSessionDayOffset: number;
  /** Dashboard card data (icon + short topic per week) */
  weekSummaries: { week: number; topic: string; icon: string }[];
  /** Full week content for the track detail pages */
  weeks: WeekConfig[];
  /** Default reflection prompts used when a week doesn't specify custom ones */
  defaultReflectionPrompts?: string[];
  /** Whether project submissions are enabled for this track (defaults to true) */
  submissionsEnabled?: boolean;
  /** Whether weekly reflections are enabled for this track (defaults to true) */
  reflectionsEnabled?: boolean;
  /** Declarative gates evaluated before showing track content. */
  gates?: TrackGate[];
  /** @deprecated Use gates: [{ type: "intake", ... }] instead */
  intakeRequired?: boolean;
  /** @deprecated Use gates: [{ type: "intake", ... }] instead */
  intakeQuestions?: IntakeQuestion[];
  /** Phase grouping for the Catalyst journey (e.g. "foundation", "core", "workshop", "exit") */
  phase?: string;
  /** Slug of a track that must be completed before this one unlocks */
  prerequisiteTrackSlug?: string;
};

export type ProgramColors = {
  primary: string;
  primaryHover: string;
  accent: string;
  tagline: string;
};

export type SurveyConfig = {
  /** Unique ID for this survey, e.g. "pre-survey-spring-2026" */
  id: string;
  /** Display title shown on dashboard card */
  title: string;
  /** Short description shown on dashboard card */
  description: string;
  /** If true, card keeps reappearing until completed */
  required: boolean;
};

export type ProgramConfig = {
  /** Unique identifier: "atg" | "forge" */
  slug: string;
  /** Full program name */
  name: string;
  /** Short tagline shown on login page */
  tagline: string;
  /** Primary domain for this program */
  domain: string;
  /**
   * If false, the program switcher uses cookie-based override instead of
   * redirecting to `domain` (so a program can go live before IT provisions
   * its DNS). Defaults to true. Remove the field once DNS is cut over.
   */
  dnsReady?: boolean;
  /** Path to logo in /public (e.g. "/atg/logo.svg") */
  logo: string;
  /** Optional PNG logo for contexts that need it */
  logoPng?: string;
  /** Optional welcome video path */
  welcomeVideo?: string;
  /** Welcome video presenter name */
  welcomeVideoPresenter?: string;
  colors: ProgramColors;
  defaultCohort: {
    name: string;
    displayName: string;
    startDate: string;
    totalWeeks: number;
  };
  tracks: TrackConfig[];
  tutorConfig?: {
    enabled: boolean;
    systemPrompt: string;
  };
  surveys?: SurveyConfig[];
  /** If true, the Resources nav link is visible to students (not just admins). */
  resourcesEnabled?: boolean;
  /**
   * If true, new signups must arrive with a `?track=<slug>` param or they're
   * rejected. Programs where students pick one of several tracks (Forge) set
   * this true. Programs where every student gets the same set of tracks
   * (ATG — MASS + Tech+) leave this false so new signups are auto-enrolled.
   */
  requireInviteLink?: boolean;
  coppa: {
    required: boolean;
  };
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };
  /** Google Analytics measurement ID */
  gaId?: string;
  /** Organization name shown in footer/copyright */
  organization: string;
};
