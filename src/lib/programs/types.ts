export type TrackType = "weekly" | "single-event";

export type SessionInfo = {
  title: string;
  time: string;
};

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
};

export type TrackConfig = {
  /** URL-safe identifier: "mass", "techplus", "ai-fundamentals" */
  slug: string;
  /** Display name shown in UI */
  name: string;
  /** Short label for dashboard cards */
  shortName: string;
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
};

export type ProgramColors = {
  primary: string;
  primaryHover: string;
  accent: string;
  tagline: string;
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
