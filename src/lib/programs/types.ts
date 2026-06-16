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
  /**
   * Per-week override for project submissions. Defaults to the track-level
   * `submissionsEnabled`. Set to false for conceptual sessions where there's
   * nothing for the student to submit, so the submission UI and the homework
   * checklist row are both hidden.
   */
  submissionsEnabled?: boolean;
  /**
   * Structured questions that make up this week's submission ("Written
   * Artifact"). When set, the SubmissionForm renders one labeled textarea per
   * prompt and persists the answers to `submissions.prompt_responses`. Files
   * and links remain available as supporting attachments.
   */
  submissionPrompts?: string[];
  /**
   * Google Drive share URL for the session recording.
   * Pass the standard share link (drive.google.com/file/d/…/view) — the
   * session view converts it to a /preview embed automatically.
   */
  videoUrl?: string;
  /**
   * ISO date (YYYY-MM-DD). While `now < comingSoonUntil`, the week renders
   * as a greyed, non-clickable cell on the track overview with a
   * "Coming {date}" label, and direct navigation to the week page falls
   * back to a placeholder. Used to drip-release weeks while the rest of a
   * self-paced track is already live.
   */
  comingSoonUntil?: string;
};

export type OfficeHour = {
  /** ISO date (yyyy-mm-dd) — used for sort + day-of-week label */
  date: string;
  /** Display time, e.g. "1pm EST" */
  time: string;
  /** Title, e.g. "Office Hours" or "Building an App Using Replit" */
  title: string;
  /** One-paragraph description */
  description: string;
  /** Optional live video join link (Google Meet / Zoom). Renders a Join button. */
  joinUrl?: string;
  /** Optional dial-in line, e.g. "(US) +1 475-239-1638 PIN: 565 653 985#" */
  dialIn?: string;
};

export type TrackConfig = {
  /** URL-safe identifier: "mass", "techplus", "ai-fundamentals" */
  slug: string;
  /** Display name shown in UI */
  name: string;
  /** Short label for dashboard cards */
  shortName: string;
  /**
   * Track overview shown on the track landing page. Split on blank lines
   * (`\n\n`) by the renderer to support multi-paragraph welcome copy.
   */
  description?: string;
  type: TrackType;
  totalWeeks: number;
  sessionsPerWeek: number;
  startDate: string;
  /**
   * If true, every user-facing "Starts {date}" / "Started {date}" rendering
   * collapses to "TBD". The real `startDate` is still used for internal
   * sorting and `computeCurrentWeek` logic, but nothing on the page commits
   * to a date the team hasn't confirmed yet. Useful for tracks parked at a
   * placeholder start so the catalog doesn't make a promise.
   */
  startDateTbd?: boolean;
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
  /**
   * Public survey IDs that belong to this track. Public surveys are
   * non-authenticated and live in `public_survey_responses` keyed by
   * `survey_type` — they don't appear under any program by default. Listing
   * them here surfaces response counts and a CSV export on the per-track
   * Insights view alongside the track's authenticated surveys.
   */
  publicSurveys?: string[];
  /**
   * Kid-facing tracks render week-topic icons as the raw emoji from the
   * config/DB (playful, age-appropriate). Adult tracks (default) map them
   * to Phosphor icons via weekIconForEmoji.
   */
  emojiIcons?: boolean;
  /**
   * Self-paced tracks (every session is a pre-recorded video, no live meetings)
   * unlock per-week recordings and submissions independently of `startDate` /
   * `computeCurrentWeek`. The track overview can still read "Not Launched"
   * until the marketing start date passes, but students who land on a week
   * page can already watch and submit.
   */
  selfPaced?: boolean;
  /** Whether weekly reflections are enabled for this track (defaults to true) */
  reflectionsEnabled?: boolean;
  /** Declarative gates evaluated before showing track content. */
  gates?: TrackGate[];
  /** @deprecated Use gates: [{ type: "intake", ... }] instead */
  intakeRequired?: boolean;
  /** @deprecated Use gates: [{ type: "intake", ... }] instead */
  intakeQuestions?: IntakeQuestion[];
  /**
   * Optional office-hours / live drop-ins (Google Calendar events recorded).
   * Rendered on the track landing page below the curriculum hero.
   */
  officeHours?: OfficeHour[];
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
  /** Program slugs whose students should skip this survey even when they
   *  resolve to this program's dashboard (e.g. forte students on Catalyst) */
  skipForPrograms?: string[];
  /** Brand label shown in the survey header eyebrow. Overrides the browsing
   *  program's organization so the survey reads with its own program's brand
   *  (e.g. an AI Fundamentals survey always shows "Beyond Code Centers", even
   *  when opened from another program context). */
  organization?: string;
};

export type ProgramConfig = {
  /** Unique identifier: "catalyst" | "beyond-code-centers" | "bgc" */
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
