import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendTaDigestEmail } from "@/lib/email";
import { sendSlackDmByEmail } from "@/lib/slack";
import { buildDigests, digestText, type PendingChange, type Recipient } from "@/lib/ta-changes";

export const dynamic = "force-dynamic";

const ADMIN_URL = "https://bccacademy.io/dashboard/admin";

// Daily recap of teaching-assistant edits to each course's lead instructor(s),
// by email and (when SLACK_BOT_TOKEN is set) Slack DM. A course with no lead
// falls back to its program's admins so a change is never silently dropped.
//
// A change is marked digested only once every recipient's EMAIL went out;
// otherwise it rides along in tomorrow's recap. Slack is best-effort.
// Auth mirrors the other crons: `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const svc = createServiceClient();

  const { data: pendingRows, error } = await svc
    .from("ta_changes")
    .select("id, track_slug, program_id, summary, created_at, students(first_name, last_name, email)")
    .is("digested_at", null)
    .order("created_at")
    .limit(1000);
  if (error) {
    console.error("[cron/ta-digest] load failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Person = { first_name: string | null; last_name: string | null; email: string | null };
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  const fullName = (p: Person | null) =>
    [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || p?.email || "A teaching assistant";

  const rows = (pendingRows ?? []) as unknown as {
    id: string;
    track_slug: string;
    program_id: string | null;
    summary: string;
    created_at: string;
    students: Person | Person[] | null;
  }[];
  if (rows.length === 0) return NextResponse.json({ pending: 0, sent: 0 });

  const changes: PendingChange[] = rows.map((r) => ({
    id: r.id,
    track_slug: r.track_slug,
    summary: r.summary,
    created_at: r.created_at,
    actor_name: fullName(one(r.students)),
  }));
  const tracks = [...new Set(rows.map((r) => r.track_slug))];

  const [{ data: leadRows }, { data: courseRows }] = await Promise.all([
    svc
      .from("instructor_tracks")
      .select("track_slug, students(first_name, last_name, email)")
      .in("track_slug", tracks)
      .eq("role", "lead"),
    svc.from("track_overrides").select("track_slug, name").in("track_slug", tracks),
  ]);

  const recipientsByTrack = new Map<string, Recipient[]>();
  const addRecipient = (track: string, p: Person | null) => {
    if (!p?.email) return;
    const list = recipientsByTrack.get(track) ?? [];
    if (!list.some((r) => r.email.toLowerCase() === p.email!.toLowerCase())) {
      list.push({ email: p.email, name: fullName(p) });
    }
    recipientsByTrack.set(track, list);
  };
  for (const l of (leadRows ?? []) as unknown as { track_slug: string; students: Person | Person[] | null }[]) {
    addRecipient(l.track_slug, one(l.students));
  }

  // No lead on a course: its program's admins get the recap instead.
  const leaderless = tracks.filter((t) => !recipientsByTrack.has(t));
  if (leaderless.length > 0) {
    const programByTrack = new Map(
      rows.filter((r) => r.program_id).map((r) => [r.track_slug, r.program_id as string]),
    );
    const programIds = [...new Set(leaderless.map((t) => programByTrack.get(t)).filter(Boolean))] as string[];
    if (programIds.length > 0) {
      const { data: admins } = await svc
        .from("students")
        .select("first_name, last_name, email, program_id")
        .eq("role", "admin")
        .in("program_id", programIds);
      for (const t of leaderless) {
        for (const a of (admins ?? []) as (Person & { program_id: string })[]) {
          if (a.program_id === programByTrack.get(t)) addRecipient(t, a);
        }
      }
    }
  }

  const nameBySlug = new Map(
    ((courseRows ?? []) as { track_slug: string; name: string | null }[]).map((c) => [c.track_slug, c.name]),
  );
  const digests = buildDigests(changes, recipientsByTrack, (slug) => nameBySlug.get(slug) || slug);

  const failed = new Set<string>();
  let emailed = 0;
  let slacked = 0;
  for (const d of digests) {
    const ok = await sendTaDigestEmail({ to: d.recipient.email, digest: d, adminUrl: ADMIN_URL });
    if (ok) emailed++;
    else d.changeIds.forEach((id) => failed.add(id));
    if (await sendSlackDmByEmail(d.recipient.email, digestText(d, ADMIN_URL))) slacked++;
  }

  const orphaned = changes.filter((c) => !recipientsByTrack.has(c.track_slug));
  if (orphaned.length > 0) {
    console.warn(
      `[cron/ta-digest] ${orphaned.length} change(s) with no lead or program admin to notify:`,
      [...new Set(orphaned.map((c) => c.track_slug))].join(", "),
    );
  }

  const done = changes.map((c) => c.id).filter((id) => !failed.has(id));
  if (done.length > 0) {
    const { error: markError } = await svc
      .from("ta_changes")
      .update({ digested_at: new Date().toISOString() })
      .in("id", done);
    if (markError) console.error("[cron/ta-digest] mark failed:", markError.message);
  }

  return NextResponse.json({
    pending: changes.length,
    recipients: digests.length,
    emailed,
    slacked,
    retryTomorrow: failed.size,
    orphaned: orphaned.length,
  });
}
