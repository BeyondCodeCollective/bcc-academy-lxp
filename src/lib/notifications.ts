import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { getTrackBySlug } from "@/lib/programs";
import { sendAnnouncementEmail, sendFeedbackEmail } from "@/lib/email";

/**
 * Notification fan-out for event-driven emails (Resend). Every function here is
 * fire-and-forget: callers `void notify…()` from inside a server action and the
 * student-facing mutation never waits on, nor fails because of, email delivery.
 *
 * Preference model: a missing notification_preferences row means opted IN. We
 * only ever skip a recipient who has a row with the relevant flag set to false.
 */

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "bccacademy.io";
  const proto =
    h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** programs row → { slug, name } for the program owning a row, by UUID. */
async function getProgramMeta(
  svc: ReturnType<typeof createServiceClient>,
  programId: string,
): Promise<{ slug: string; name: string } | null> {
  const { data } = await svc
    .from("programs")
    .select("slug, name")
    .eq("id", programId)
    .maybeSingle<{ slug: string; name: string }>();
  return data ?? null;
}

/** Resolve a track's display name (DB overrides applied); falls back to slug. */
async function resolveTrackName(
  programSlug: string,
  trackSlug: string,
): Promise<string> {
  try {
    const program = await getProgramWithOverrides(programSlug);
    return getTrackBySlug(program, trackSlug)?.name ?? trackSlug;
  } catch {
    return trackSlug;
  }
}

/**
 * Email every enrolled student (who hasn't opted out) when a new announcement
 * is posted to a specific track. Program-wide announcements (no trackSlug) are
 * shown in-app only — we don't blast an entire program by email here.
 */
export async function notifyAnnouncement(params: {
  programId: string;
  trackSlug: string | null;
  message: string;
}): Promise<void> {
  try {
    if (!params.trackSlug) return; // program-wide → in-app only (see note above)
    const svc = createServiceClient();

    const programMeta = await getProgramMeta(svc, params.programId);
    if (!programMeta) return;

    const { data: enrollments } = await svc
      .from("student_tracks")
      .select("student_id")
      .eq("program_id", params.programId)
      .eq("track_slug", params.trackSlug);

    const studentIds = [...new Set((enrollments ?? []).map((e) => e.student_id as string))];
    if (studentIds.length === 0) return;

    const [{ data: students }, { data: prefs }] = await Promise.all([
      svc.from("students").select("id, email").in("id", studentIds),
      svc
        .from("notification_preferences")
        .select("student_id, announcements")
        .in("student_id", studentIds),
    ]);

    const optedOut = new Set(
      (prefs ?? [])
        .filter((p) => p.announcements === false)
        .map((p) => p.student_id as string),
    );

    const recipients = (students ?? [])
      .filter((s) => s.email && !optedOut.has(s.id as string))
      .map((s) => s.email as string);
    if (recipients.length === 0) return;

    const [origin, trackName] = await Promise.all([
      getOrigin(),
      resolveTrackName(programMeta.slug, params.trackSlug),
    ]);
    const portalUrl = `${origin}/dashboard`;

    await Promise.allSettled(
      recipients.map((to) =>
        sendAnnouncementEmail({
          to,
          programName: programMeta.name,
          trackName,
          message: params.message,
          portalUrl,
        }),
      ),
    );
  } catch (err) {
    console.error(
      "[notifications] notifyAnnouncement failed:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Email the single student who owns the submission/reflection that just
 * received instructor feedback — unless they've turned feedback alerts off.
 */
export async function notifyFeedback(params: {
  submissionId?: string | null;
  reflectionId?: string | null;
}): Promise<void> {
  try {
    const svc = createServiceClient();

    const table = params.submissionId ? "submissions" : "reflections";
    const rowId = params.submissionId ?? params.reflectionId;
    if (!rowId) return;

    const { data: work } = await svc
      .from(table)
      .select("student_id, track_slug, week_number, program_id")
      .eq("id", rowId)
      .maybeSingle<{
        student_id: string;
        track_slug: string;
        week_number: number;
        program_id: string;
      }>();
    if (!work) return;

    const { data: pref } = await svc
      .from("notification_preferences")
      .select("feedback")
      .eq("student_id", work.student_id)
      .maybeSingle<{ feedback: boolean }>();
    if (pref?.feedback === false) return; // opted out

    const { data: student } = await svc
      .from("students")
      .select("email")
      .eq("id", work.student_id)
      .maybeSingle<{ email: string | null }>();
    if (!student?.email) return;

    const programMeta = await getProgramMeta(svc, work.program_id);
    if (!programMeta) return;

    const [origin, trackName] = await Promise.all([
      getOrigin(),
      resolveTrackName(programMeta.slug, work.track_slug),
    ]);

    await sendFeedbackEmail({
      to: student.email,
      programName: programMeta.name,
      trackName,
      weekNumber: work.week_number,
      portalUrl: `${origin}/dashboard/track/${work.track_slug}/${work.week_number}`,
    });
  } catch (err) {
    console.error(
      "[notifications] notifyFeedback failed:",
      err instanceof Error ? err.message : String(err),
    );
  }
}
