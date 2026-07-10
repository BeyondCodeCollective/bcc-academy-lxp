import { createServiceClient } from "@/lib/supabase/server";

// Append a row to activity_events. Fire-and-forget: callers `void` this so a
// logging failure never breaks the request it's observing. Writes go through
// the service client (RLS-exempt) since the table is service-only.

export type ActivityEventType =
  | "login"
  | "page_view"
  | "video_progress"
  | "submission"
  | "reflection"
  // Agreements flow through survey_complete too — distinguish by
  // metadata.surveyType, which carries the survey/agreement id.
  | "survey_complete"
  // Learner joined the live Zoom through the platform embed.
  | "session_join"
  | "certificate_issued";

export async function logActivityEvent(e: {
  userId: string;
  eventType: ActivityEventType;
  programId?: string | null;
  trackSlug?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from("activity_events").insert({
      user_id: e.userId,
      event_type: e.eventType,
      program_id: e.programId ?? null,
      track_slug: e.trackSlug ?? null,
      metadata: e.metadata ?? {},
    });
  } catch (err) {
    console.error("[activity] logActivityEvent failed", err);
  }
}
