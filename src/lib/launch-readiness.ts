import { createServiceClient } from "@/lib/supabase/server";

export type ReadinessCheck = {
  label: string;
  ok: boolean;
  /** Live numbers / what to do when not ok. */
  detail: string;
};

/** Panel shows from 14 days before start through 2 days after (launch-morning
 *  triage window). */
export function isInLaunchWindow(startDate: string, startDateTbd?: boolean): boolean {
  if (startDateTbd || !startDate) return false;
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  if (Number.isNaN(start)) return false;
  const now = Date.now();
  return now >= start - 14 * 86_400_000 && now <= start + 2 * 86_400_000;
}

/**
 * Pre-launch checks for one course, computed live on every admin page load.
 * Born from the 2026-08-04 Endless Bootcamp launch morning: every red row here
 * was something we discovered by hand, at 5 AM, from three different tools.
 */
export async function getLaunchReadiness(trackSlug: string): Promise<ReadinessCheck[]> {
  const svc = createServiceClient();

  const [allowRes, inviteRes, enrollRes, overrideRes, sessionRes] = await Promise.all([
    svc.from("allowed_signup_emails").select("email").eq("track_slug", trackSlug),
    svc.from("invites").select("email, status").eq("track_slug", trackSlug),
    svc
      .from("student_tracks")
      .select("student_id, students!inner(email, role, is_test)")
      .eq("track_slug", trackSlug),
    svc
      .from("track_overrides")
      .select("kickoff_time_utc")
      .eq("track_slug", trackSlug)
      .maybeSingle(),
    svc
      .from("session_content")
      .select("week_number, meeting_link")
      .eq("track", trackSlug),
  ]);

  const allowlisted = new Set(
    (allowRes.data ?? []).map((r) => (r.email as string).toLowerCase()),
  );
  const invited = new Set(
    (inviteRes.data ?? [])
      .filter((r) => r.status === "sent")
      .map((r) => (r.email as string).toLowerCase()),
  );
  type EnrollRow = { students: { email: string | null; role: string; is_test: boolean } };
  const accountEmails = new Set(
    ((enrollRes.data ?? []) as unknown as EnrollRow[])
      .filter((r) => r.students.role === "student" && !r.students.is_test)
      .map((r) => (r.students.email ?? "").toLowerCase())
      .filter(Boolean),
  );

  // The silent-stranding set: on the list, never emailed, never signed up.
  const unreached = [...allowlisted].filter(
    (e) => !invited.has(e) && !accountEmails.has(e),
  );
  const joined = [...allowlisted].filter((e) => accountEmails.has(e)).length;

  const meetingLinks = (sessionRes.data ?? [])
    .map((r) => (r.meeting_link as string | null) ?? "")
    .filter(Boolean);
  const hasZoom = meetingLinks.length > 0;
  const foreignZoom = meetingLinks.some((l) => !/https?:\/\/(us02web\.)?zoom\.us\//.test(l));

  const kickoffSet = Boolean(overrideRes.data?.kickoff_time_utc);

  return [
    {
      label: "Everyone on the allowlist has been reached",
      ok: unreached.length === 0,
      detail:
        unreached.length === 0
          ? `${allowlisted.size} allowlisted, all invited or signed up`
          : `${unreached.length} allowlisted but never invited and no account — send invites from the People tab`,
    },
    {
      label: "Sign-ups",
      // Informational until launch is close; red only when nobody has joined.
      ok: joined > 0,
      detail: `${joined} of ${allowlisted.size} allowlisted have created accounts`,
    },
    {
      label: "Session Zoom link set",
      ok: hasZoom && !foreignZoom,
      detail: !hasZoom
        ? "No meeting link on any session — add one in Curriculum"
        : foreignZoom
          ? "A session links a non-Zoom or partner meeting — attendance and recordings only auto-import from our Zoom account"
          : `${meetingLinks.length} session${meetingLinks.length === 1 ? "" : "s"} linked`,
    },
    {
      label: "Kickoff time set",
      ok: kickoffSet,
      detail: kickoffSet
        ? "Countdown and calendar entries show the real time"
        : "kickoff time missing — countdown and calendar entries show date only",
    },
  ];
}
