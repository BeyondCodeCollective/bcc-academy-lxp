import { createServiceClient } from "@/lib/supabase/server";
import { sendSessionReminderEmail, type SessionReminderKind } from "@/lib/email";

// Scheduled reminders for landing-page signups (Catalyst Labs and any other
// page whose sessions carry a start time). One email per (signup, kind), gated
// by the signup_reminders primary key. Add a touch by adding a row
// here; touches must stay ordered from earliest to latest.
export const REMINDER_TOUCHES: { kind: SessionReminderKind; hoursBefore: number }[] = [
  { kind: "1w", hoursBefore: 168 },
  { kind: "3d", hoursBefore: 72 },
  { kind: "24h", hoursBefore: 24 },
  { kind: "1h", hoursBefore: 1 },
];

const HOUR = 3_600_000;

/**
 * Which reminder, if any, is due right now. A touch is due from `hoursBefore`
 * until the next touch takes over (the last one until the session starts), and
 * only for people who signed up BEFORE it: someone registering 2 days out never
 * gets a "1 week" email, the confirmation already covers it.
 */
export function dueReminder(
  startMs: number,
  signedUpMs: number,
  nowMs: number,
  sent: ReadonlySet<string>,
): SessionReminderKind | null {
  for (let i = 0; i < REMINDER_TOUCHES.length; i++) {
    const t = REMINDER_TOUCHES[i];
    const opens = startMs - t.hoursBefore * HOUR;
    const next = REMINDER_TOUCHES[i + 1];
    const closes = next ? startMs - next.hoursBefore * HOUR : startMs;
    if (nowMs < opens || nowMs >= closes) continue;
    if (signedUpMs > opens) return null;
    return sent.has(t.kind) ? null : t.kind;
  }
  return null;
}

type Session = { id: string; label: string; startUtc: string | null; endUtc: string | null; timezone: string | null };

/** Send every reminder that is due now. Run hourly. */
export async function sendDueSignupReminders(origin: string, now = new Date()) {
  const svc = createServiceClient();
  const nowMs = now.getTime();
  const horizon = nowMs + REMINDER_TOUCHES[0].hoursBefore * HOUR;
  const out = { sent: 0, skipped: 0, failed: 0 };

  const { data: pages } = await svc.from("landing_pages").select("slug, sessions, program_id").not("sessions", "is", null);
  const upcoming: { slug: string; programId: string | null; session: Session; startMs: number }[] = [];
  for (const p of (pages ?? []) as { slug: string; sessions: Session[] | null; program_id: string | null }[]) {
    for (const s of p.sessions ?? []) {
      const startMs = s.startUtc ? Date.parse(s.startUtc) : NaN;
      if (Number.isFinite(startMs) && startMs > nowMs && startMs <= horizon) {
        upcoming.push({ slug: p.slug, programId: p.program_id, session: s, startMs });
      }
    }
  }
  if (upcoming.length === 0) return out;

  const programIds = [...new Set(upcoming.map((u) => u.programId).filter((x): x is string => !!x))];
  const { data: programs } = programIds.length
    ? await svc.from("programs").select("id, name").in("id", programIds)
    : { data: [] as { id: string; name: string }[] };
  const programName = new Map(((programs ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));

  for (const u of upcoming) {
    const { data: signups } = await svc
      .from("landing_signups")
      .select("id, email, first_name, name, invite_token, created_at")
      .eq("slug", u.slug)
      .eq("session_id", u.session.id);
    const rows = (signups ?? []) as {
      id: string;
      email: string;
      first_name: string | null;
      name: string | null;
      invite_token: string | null;
      created_at: string;
    }[];
    if (rows.length === 0) continue;

    const [{ data: sentRows }, { data: students }] = await Promise.all([
      svc.from("signup_reminders").select("signup_id, kind").in("signup_id", rows.map((r) => r.id)),
      svc.from("students").select("email").in("email", rows.map((r) => r.email)),
    ]);
    const sentBy = new Map<string, Set<string>>();
    for (const s of (sentRows ?? []) as { signup_id: string; kind: string }[]) {
      if (!sentBy.has(s.signup_id)) sentBy.set(s.signup_id, new Set());
      sentBy.get(s.signup_id)!.add(s.kind);
    }
    const hasAccount = new Set(((students ?? []) as { email: string }[]).map((s) => s.email.toLowerCase()));

    for (const r of rows) {
      const kind = dueReminder(u.startMs, Date.parse(r.created_at), nowMs, sentBy.get(r.id) ?? new Set());
      if (!kind || !r.invite_token) {
        out.skipped++;
        continue;
      }
      // Claim first so a repeated or racing run conflicts instead of double-sending.
      const { error: claimErr } = await svc.from("signup_reminders").insert({ signup_id: r.id, kind });
      if (claimErr) {
        out.skipped++;
        continue;
      }
      try {
        await sendSessionReminderEmail({
          to: r.email,
          firstName: r.first_name ?? r.name?.split(" ")[0] ?? "",
          programName: (u.programId && programName.get(u.programId)) || "BCC Academy",
          eventName: u.session.label,
          kind,
          loggedIn: hasAccount.has(r.email.toLowerCase()),
          eventStartUtc: u.session.startUtc as string,
          eventEndUtc: u.session.endUtc,
          eventTimezone: u.session.timezone,
          inviteLink: `${origin}/invite/${r.invite_token}`,
          origin,
        });
        out.sent++;
      } catch (e) {
        // Release the claim so the next hourly run retries.
        await svc.from("signup_reminders").delete().eq("signup_id", r.id).eq("kind", kind);
        console.error("[signup-reminders] send failed", r.email, kind, e);
        out.failed++;
      }
    }
  }
  return out;
}
