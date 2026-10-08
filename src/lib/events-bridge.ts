import { createServiceClient } from "@/lib/supabase/server";

// The bridge (phase 4): link event attendees to learner accounts so a
// child's workshop history follows them when they later apply or enroll.
//
// Match rules, in order:
//   1. attendee: a student whose email is the parent's email AND whose first
//      and last name match the attendee's (a child registered on the
//      parent's email, later given their own login on that same email)
//   2. registration: a student whose email is the parent's email AND whose
//      name matches the parent's (the parent is the learner: adult events)
// Email-only matches are deliberately NOT made for attendees: four siblings
// share one parent email, and only the name says which one enrolled.

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

type StudentRow = { id: string; email: string | null; first_name: string | null; last_name: string | null };

type RegRow = {
  id: string;
  parent_email: string;
  parent_first_name: string;
  parent_last_name: string;
  student_id: string | null;
  event_attendees: { id: string; first_name: string; last_name: string; student_id: string | null }[];
};

/**
 * Link every unlinked attendee/registration whose parent email has a
 * matching student. Scoped to one registration when `registrationId` is
 * given (called right after a registration is saved); otherwise a full pass
 * (nightly cron). Returns how many links were made.
 */
export async function linkEventHistory(registrationId?: string): Promise<number> {
  const svc = createServiceClient();
  let q = svc
    .from("event_registrations")
    .select("id, parent_email, parent_first_name, parent_last_name, student_id, event_attendees(id, first_name, last_name, student_id)");
  q = registrationId ? q.eq("id", registrationId) : q.limit(2000);
  const { data } = await q;
  const regs = ((data ?? []) as unknown as RegRow[]).filter(
    (r) => r.student_id == null || r.event_attendees.some((a) => a.student_id == null),
  );
  if (regs.length === 0) return 0;

  const emails = [...new Set(regs.map((r) => norm(r.parent_email)))];
  const { data: students } = await svc
    .from("students")
    .select("id, email, first_name, last_name")
    .in("email", emails);
  const byEmail = new Map<string, StudentRow[]>();
  for (const s of (students ?? []) as StudentRow[]) {
    const k = norm(s.email);
    byEmail.set(k, [...(byEmail.get(k) ?? []), s]);
  }

  const now = new Date().toISOString();
  let linked = 0;
  for (const reg of regs) {
    const candidates = byEmail.get(norm(reg.parent_email)) ?? [];
    if (candidates.length === 0) continue;
    const nameMatch = (first: string, last: string) =>
      candidates.find((s) => norm(s.first_name) === norm(first) && norm(s.last_name) === norm(last));

    for (const a of reg.event_attendees) {
      if (a.student_id) continue;
      const s = nameMatch(a.first_name, a.last_name);
      if (!s) continue;
      const { error } = await svc.from("event_attendees").update({ student_id: s.id, linked_at: now }).eq("id", a.id);
      if (!error) linked += 1;
    }
    if (reg.student_id == null) {
      const s = nameMatch(reg.parent_first_name, reg.parent_last_name);
      if (s) {
        const { error } = await svc.from("event_registrations").update({ student_id: s.id }).eq("id", reg.id);
        if (!error) linked += 1;
      }
    }
  }
  return linked;
}

export type EventHistoryItem = {
  eventId: string;
  title: string;
  startsAt: string;
  timezone: string;
  status: string;
  attendeeName: string;
};

/** Events on a learner's record: as a linked attendee, or as the registering parent. */
export async function eventHistoryForStudent(studentId: string): Promise<EventHistoryItem[]> {
  const svc = createServiceClient();
  type Row = {
    id: string;
    status: string;
    first_name: string;
    last_name: string;
    events: { id: string; title: string; starts_at: string; timezone: string } | null;
  };
  const cols = "id, status, first_name, last_name, events(id, title, starts_at, timezone)";
  const [{ data: asAttendee }, { data: asParent }] = await Promise.all([
    svc.from("event_attendees").select(cols).eq("student_id", studentId),
    svc
      .from("event_attendees")
      .select(`${cols}, event_registrations!inner(student_id)`)
      .eq("event_registrations.student_id", studentId),
  ]);
  const seen = new Set<string>();
  const rows = [...((asAttendee ?? []) as unknown as Row[]), ...((asParent ?? []) as unknown as Row[])].filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
  return rows
    .filter((r) => r.events)
    .sort((a, b) => Date.parse(b.events!.starts_at) - Date.parse(a.events!.starts_at))
    .map((r) => ({
      eventId: r.events!.id,
      title: r.events!.title,
      startsAt: r.events!.starts_at,
      timezone: r.events!.timezone,
      status: r.status,
      attendeeName: `${r.first_name} ${r.last_name}`,
    }));
}
