// Teaching assistants: an instructor assigned to a course with role
// "assistant" can make every edit a lead instructor can. Each edit is logged to
// ta_changes, and /api/cron/ta-digest sends the course's lead instructor(s) a
// daily recap so they can confirm it matches what they wanted.
//
// Logging never blocks an edit: if the insert fails, the edit still stands and
// the failure is logged server-side.

import type { createServiceClient } from "@/lib/supabase/server";

type Svc = ReturnType<typeof createServiceClient>;

export type InstructorRole = "lead" | "assistant";

/** Is this user an assistant (not a lead) on this course? Admins never are. */
export async function isAssistantOn(
  svc: Svc,
  actor: { userId: string; role: string },
  trackSlug: string,
): Promise<boolean> {
  if (actor.role !== "instructor") return false;
  const { data } = await svc
    .from("instructor_tracks")
    .select("role")
    .eq("student_id", actor.userId)
    .eq("track_slug", trackSlug)
    .eq("role", "assistant")
    .limit(1);
  return (data ?? []).length > 0;
}

export async function recordTaChange(
  svc: Svc,
  entry: { actorId: string; trackSlug: string; programId: string | null; action: string; summary: string },
): Promise<void> {
  const { error } = await svc.from("ta_changes").insert({
    actor_id: entry.actorId,
    track_slug: entry.trackSlug,
    program_id: entry.programId,
    action: entry.action,
    summary: entry.summary,
  });
  if (error) console.error("[ta-changes] record failed:", error.message);
}

/** Log a change only when the actor is an assistant on the course. */
export async function recordIfAssistant(
  svc: Svc,
  actor: { userId: string; role: string },
  entry: { trackSlug: string; programId: string | null; action: string; summary: string },
): Promise<void> {
  try {
    if (!(await isAssistantOn(svc, actor, entry.trackSlug))) return;
    await recordTaChange(svc, { actorId: actor.userId, ...entry });
  } catch (e) {
    console.error("[ta-changes] record failed:", e);
  }
}

// ─── Describing a change ────────────────────────────────────────────────────

export const SESSION_FIELD_LABELS: Record<string, string> = {
  title: "title",
  subtitle: "subtitle",
  description: "description",
  objectives: "objectives",
  meeting_link: "Zoom link",
  meeting_link_2: "session 2 Zoom link",
  meeting_link_3: "session 3 Zoom link",
  recording_url: "recording",
  recording_url_2: "session 2 recording",
  recording_url_3: "session 3 recording",
  status: "session status",
  status_2: "session 2 status",
  status_3: "session 3 status",
  resources: "resources",
  homework_instructions: "homework instructions",
  homework_instructions_2: "session 2 homework instructions",
  homework_instructions_3: "session 3 homework instructions",
};

export const OVERVIEW_FIELD_LABELS: Record<string, string> = {
  name: "course name",
  short_name: "short name",
  description: "description",
  instructor: "instructor name",
  start_date: "start date",
  total_weeks: "number of weeks",
  unit_label: "unit label",
  sessions_per_week: "sessions per week",
  last_session_day_offset: "last session day",
  session_times: "session times",
  week_summaries: "week summaries",
  default_reflection_prompts: "reflection prompts",
  submissions_enabled: "homework on/off",
  reflections_enabled: "reflections on/off",
  exit_survey_enabled: "exit survey on/off",
  sequential_gating: "week gating",
  office_hours: "office hours",
};

const norm = (v: unknown): string => {
  if (v === undefined || v === null || v === "") return "";
  if (Array.isArray(v) && v.length === 0) return "";
  return typeof v === "string" ? v.trim() : JSON.stringify(v);
};

/** Labels of the fields that actually changed, in label-map order. */
export function changedFields(
  prev: Record<string, unknown> | null,
  next: Record<string, unknown>,
  labels: Record<string, string>,
): string[] {
  const out: string[] = [];
  for (const [key, label] of Object.entries(labels)) {
    if (!(key in next)) continue;
    if (norm(prev?.[key]) !== norm(next[key])) out.push(label);
  }
  return [...new Set(out)];
}

/** "a", "a and b", "a, b and c" */
export function listPhrase(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function truncate(s: string, max = 140): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

// ─── Building the digest ────────────────────────────────────────────────────

export type PendingChange = {
  id: string;
  track_slug: string;
  summary: string;
  created_at: string;
  actor_name: string;
};

export type Recipient = { email: string; name: string };

export type Digest = {
  recipient: Recipient;
  courses: { trackSlug: string; courseName: string; items: PendingChange[] }[];
  changeIds: string[];
};

/** One digest per recipient, courses and items in a stable order. */
export function buildDigests(
  changes: PendingChange[],
  recipientsByTrack: Map<string, Recipient[]>,
  courseName: (trackSlug: string) => string,
): Digest[] {
  const byEmail = new Map<string, Digest>();
  const sorted = [...changes].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const c of sorted) {
    for (const r of recipientsByTrack.get(c.track_slug) ?? []) {
      const key = r.email.toLowerCase();
      const d = byEmail.get(key) ?? { recipient: r, courses: [], changeIds: [] };
      let course = d.courses.find((x) => x.trackSlug === c.track_slug);
      if (!course) {
        course = { trackSlug: c.track_slug, courseName: courseName(c.track_slug), items: [] };
        d.courses.push(course);
      }
      course.items.push(c);
      d.changeIds.push(c.id);
      byEmail.set(key, d);
    }
  }
  return [...byEmail.values()];
}

/** Plain-text body, also used for Slack. */
export function digestText(d: Digest, adminUrl: string): string {
  const first = d.recipient.name.split(" ")[0] || "there";
  const total = d.changeIds.length;
  const tas = new Set(d.courses.flatMap((c) => c.items.map((i) => i.actor_name))).size;
  const lines = [
    `Hi ${first}, your teaching assistant${tas > 1 ? "s" : ""} made ${total} change${total === 1 ? "" : "s"} since the last recap. Take a look and make sure it's what you wanted.`,
    "",
  ];
  for (const c of d.courses) {
    lines.push(c.courseName);
    for (const i of c.items) lines.push(`• ${i.actor_name}: ${i.summary}`);
    lines.push("");
  }
  lines.push(`Review or undo in the admin panel: ${adminUrl}`);
  return lines.join("\n");
}

/** "Jane Doe" for a learner id, falling back to their email. */
export async function learnerName(svc: Svc, studentId: string): Promise<string> {
  const { data } = await svc
    .from("students")
    .select("first_name, last_name, email")
    .eq("id", studentId)
    .maybeSingle<{ first_name: string | null; last_name: string | null; email: string | null }>();
  return [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim() || data?.email || "a learner";
}
