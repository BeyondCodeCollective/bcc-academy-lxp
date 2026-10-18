import { matchesMvpDateWindow, type parseMvpDateWindow } from "./date-window";

// Attendee tickets are participations, not unique LXP learners. Registration
// status is not delivery/completion status, and missing check-ins are not absences.
export type MvpEventRecord = { id: string; program_id: string; title: string; starts_at: string;
  ends_at: string | null; timezone: string; status: string; capacity: number | null };
export type MvpEventAttendee = { id: string; event_id: string; registration_id: string; status: string; checked_in_at: string | null };
export type MvpEventRegistration = { id: string; event_id: string; program_id: string; status: string };
export function eventMatchesWindow(event: MvpEventRecord, window: ReturnType<typeof parseMvpDateWindow>) {
  if (!window.start && !window.end) return true;
  try {
    const day = (value: string) => new Intl.DateTimeFormat("en-CA", {
      timeZone: event.timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(value));
    if (event.ends_at && new Date(event.ends_at) < new Date(event.starts_at)) return null;
    return matchesMvpDateWindow({ startDate: day(event.starts_at), endDate: event.ends_at ? day(event.ends_at) : null }, window);
  } catch { return null; }
}
export function calculateMvpEvent(event: MvpEventRecord, registrations: MvpEventRegistration[], attendees: MvpEventAttendee[], asOf: Date) {
  const families = new Map(registrations.filter(r => r.event_id === event.id && r.program_id === event.program_id).map(r => [r.id, r]));
  const tickets = [...new Map(attendees.filter(a => a.event_id === event.id).map(a => [a.id, a])).values()];
  let enrolled = 0, attended = 0, unknown = 0, waitlisted = 0;
  for (const ticket of tickets) {
    const registration = families.get(ticket.registration_id);
    if (!registration) { unknown++; continue; }
    if (registration.status === "cancelled" || ticket.status === "cancelled") continue;
    if (registration.status !== "confirmed") { unknown++; continue; }
    if (ticket.status === "waitlisted") { waitlisted++; continue; }
    if (["offered", "expired"].includes(ticket.status)) continue;
    if (!["confirmed", "attended"].includes(ticket.status)) { unknown++; continue; }
    enrolled++;
    const checkIn = ticket.checked_in_at ? Date.parse(ticket.checked_in_at) : NaN;
    if (ticket.status === "attended" && Number.isFinite(checkIn) && checkIn <= asOf.getTime()) attended++;
    else if (ticket.status === "attended" || ticket.checked_in_at) unknown++;
  }
  return { id: event.id, programId: event.program_id, title: event.title,
    startsAt: event.starts_at, endsAt: event.ends_at, timezone: event.timezone,
    registrationStatus: event.status, unit: "Attendee tickets (not unique learners)",
    enrolled: unknown ? null : enrolled, attended: unknown ? null : attended,
    active: unknown ? null : attended, waitlisted,
    capacity: event.capacity, completed: null, needsCheckIn: null,
    unavailableReason: unknown ? "Some ticket or registration evidence is inconsistent; partial attendance totals are not shown."
      : "Completion and absence-based check-in rules are not established for separate events." };
}
