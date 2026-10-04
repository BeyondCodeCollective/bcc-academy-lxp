"use client";

import type { SessionResource } from "./actions";
import { BookOpen, GraduationCap, Video, FileText } from "@phosphor-icons/react";
import { humanizeSlug } from "@/lib/utils";
import type { OfficeHour } from "@/lib/programs/types";
import type { Student } from "@/lib/types";

export const PLATFORM_SURVEY_TITLES: Record<string, string> = {
  "bcc-learner-intake": "BCC Learner Intake",
  "bcc-workshop": "Workshop Survey",
};
export type CohortRow = {
  id: string;
  name: string;
  display_name: string | null;
  track_slug: string | null;
  start_date: string | null;
  total_weeks: number | null;
};
export function trackLabel(slug: string | null): string {
  if (!slug) return "";
  const map: Record<string, string> = {
    mass: "MASS",
    techplus: "CompTIA Tech+",
    "comptia-tech-plus": "CompTIA Tech+",
    "network-plus": "Network+",
    "security-plus": "Security+",
    "ai-fundamentals": "AI Fundamentals",
    "ai-automation": "AI Automation",
    "game-dev": "Game Dev",
    "ai-for-digital-natives": "AI for Digital Natives",
  };
  return map[slug] ?? humanizeSlug(slug);
}
export type StudentRow = Pick<Student, "id" | "first_name" | "last_name" | "email" | "role" | "is_staff" | "cohort_id" | "last_seen_at" | "last_activity_at" | "zip" | "state" | "date_of_birth">;
// Track config passed from server (subset of TrackConfig)
export type AdminTrackConfig = {
  slug: string;
  name: string;
  shortName: string;
  unitLabel?: string;
  description?: string;
  type?: string;
  totalWeeks: number;
  /** Server-resolved current unit (day-gated camps advance by date, not the
   *  7-day cycle). Falls back to computeCurrentWeek when absent. */
  currentUnit?: number;
  /** Where the course sits in its life. See resolveTrackPhase. */
  phase?: "upcoming" | "running" | "ended";
  selfPaced?: boolean;
  sessionsPerWeek: number;
  instructor: string;
  /** Slug of the course this track wraps around (MASS → its cohort). */
  companionOf?: string;
  sessionTimes: string[];
  startDate: string;
  startDateTbd?: boolean;
  lastSessionDayOffset: number;
  /** `time` / `durationMinutes` come straight through from TrackConfig — the
   *  admin page maps weekSummaries wholesale. They were simply untyped here,
   *  which meant the schedule looked date-only from the admin side. */
  weekSummaries: {
    week: number;
    topic: string;
    icon: string;
    date?: string;
    label?: string;
    time?: string;
    durationMinutes?: number;
  }[];
  defaultReflectionPrompts?: string[];
  submissionsEnabled?: boolean;
  reflectionsEnabled?: boolean;
  sequentialGating?: boolean;
  officeHours?: OfficeHour[];
  weeks: {
    week: number;
    title: string;
    icon: string;
    sessions: { title: string }[];
    submissionPrompts?: string[];
  }[];
};
// Unified per-session state for admin editing
export type AdminSession = {
  num: number;
  title: string;
  meetingLink: string;
  recordingUrl: string;
  resources: SessionResource[];
  status: "upcoming" | "completed";
};
// Unified per-week state
export type AdminWeek = {
  week: number;
  title: string;
  icon: string;
  sessions: AdminSession[];
  /** Instructor overrides (empty string = use config default) */
  overrideTitle: string;
  overrideSubtitle: string;
  overrideDescription: string;
  overrideObjectives: string; // newline-separated for editing
};
// DB content map
export type SessionContentMap = Record<number, {
  meeting_link: string;
  recording_url: string;
  meeting_link_2: string;
  recording_url_2: string;
  meeting_link_3: string;
  recording_url_3: string;
  status: string;
  status_2: string;
  status_3: string;
  resources: SessionResource[];
  title: string | null;
  subtitle: string | null;
  description: string | null;
  objectives: string[] | null;
}>;
export function buildInitialWeeks(track: AdminTrackConfig): AdminWeek[] {
  return track.weeks.map((w) => ({
    week: w.week,
    title: w.title,
    icon: w.icon,
    overrideTitle: "",
    overrideSubtitle: "",
    overrideDescription: "",
    overrideObjectives: "",
    sessions: w.sessions.map((s, i) => ({
      num: i + 1,
      title: s.title,
      meetingLink: "",
      recordingUrl: "",
      resources: [],
      status: "upcoming" as const,
    })),
  }));
}
export function applyContentMap(weeks: AdminWeek[], map: SessionContentMap): AdminWeek[] {
  return weeks.map((w) => {
    const content = map[w.week];
    if (!content) return w;
    return {
      ...w,
      overrideTitle: content.title ?? "",
      overrideSubtitle: content.subtitle ?? "",
      overrideDescription: content.description ?? "",
      overrideObjectives: content.objectives?.join("\n") ?? "",
      sessions: w.sessions.map((s, i) => ({
        ...s,
        meetingLink: i === 0 ? content.meeting_link : i === 1 ? content.meeting_link_2 : i === 2 ? content.meeting_link_3 : s.meetingLink,
        recordingUrl: i === 0 ? content.recording_url : i === 1 ? content.recording_url_2 : i === 2 ? content.recording_url_3 : s.recordingUrl,
        status: (i === 0 ? content.status : i === 1 ? content.status_2 : i === 2 ? content.status_3 : s.status) as "upcoming" | "completed",
        resources: i === 0 ? content.resources : s.resources,
      })),
    };
  });
}
// "Tasha Morris" → "Tasha M." for board-demo screens where full names
// shouldn't appear. Falls back to whatever's available if the name is a
// single token or empty.
export function anonymizeName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "Anonymous";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}
// ─── Tab icon helper ─────────────────────────────────────────────────────────

export function getTrackIcon(index: number) {
  const icons = [GraduationCap, BookOpen, Video, FileText];
  return icons[index % icons.length];
}
export type StudentSubView = "students" | "attendance" | "progress" | "work" | "certificates";
