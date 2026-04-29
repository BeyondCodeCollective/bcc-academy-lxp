import type { WeekConfig } from "@/lib/programs/types";
import type { SessionContentRow, SessionResource } from "@/app/dashboard/admin/actions";

export type ResolvedSession = {
  title: string;
  subtitle: string;
  description: string;
  objectives: string[];
  meetingLinks: (string | null)[];
  sessionStatuses: string[];
  recordingUrls: (string | null)[];
  resources: SessionResource[];
};

// DB instructor overrides win over program-config defaults.
// Empty string is treated as "no override" (falls back to config) — preserves || semantics.
export function resolveSessionContent(
  weekConfig: WeekConfig,
  dbRow: SessionContentRow | null,
): ResolvedSession {
  const meetingLinks: (string | null)[] = [];
  const sessionStatuses: string[] = [];
  const recordingUrls: (string | null)[] = [];

  for (let i = 0; i < weekConfig.sessions.length; i++) {
    if (i === 0) {
      meetingLinks.push(dbRow?.meeting_link ?? null);
      sessionStatuses.push(dbRow?.status ?? "upcoming");
      recordingUrls.push(dbRow?.recording_url ?? null);
    } else if (i === 1) {
      meetingLinks.push(dbRow?.meeting_link_2 ?? null);
      sessionStatuses.push(dbRow?.status_2 ?? "upcoming");
      recordingUrls.push(dbRow?.recording_url_2 ?? null);
    } else {
      meetingLinks.push(null);
      sessionStatuses.push("upcoming");
      recordingUrls.push(null);
    }
  }

  return {
    title: dbRow?.title || weekConfig.title,
    subtitle: dbRow?.subtitle || weekConfig.subtitle,
    description: dbRow?.description || weekConfig.description,
    objectives: dbRow?.objectives?.length ? dbRow.objectives : weekConfig.objectives,
    meetingLinks,
    sessionStatuses,
    recordingUrls,
    resources: dbRow?.resources ?? [],
  };
}
