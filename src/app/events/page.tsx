import Link from "next/link";
import { getProgram, getProgramId } from "@/lib/programs/server";
import { MARKETING_SLUG } from "@/lib/programs/marketing";
import { createServiceClient } from "@/lib/supabase/server";
import { EVENT_COLUMNS, formatEventWhen, type EventRow } from "@/lib/events";
import { buttonClass } from "@/components/ui";

// Public events listing for the current program: the page a program's
// website points its "Events" link at once Hivebrite is retired.
// Open events only, soonest first, with live seat counts.

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const program = await getProgram();
  return { title: `Events · ${program.organization ?? program.name}` };
}

/** Keep an event listed for six hours after it starts, so a running event stays findable. */
const listedSince = () => new Date(Date.now() - 6 * 3_600_000).toISOString();

export default async function EventsIndexPage() {
  const [program, programId] = await Promise.all([getProgram(), getProgramId()]);
  const svc = createServiceClient();
  const since = listedSince();
  // The apex (marketing) context has no events of its own: show every program's.
  const allPrograms = program.slug === MARKETING_SLUG;
  let eventsQ = svc.from("events").select(EVENT_COLUMNS).eq("status", "open").gte("starts_at", since);
  let seatsQ = svc
    .from("event_attendees")
    .select("event_id, events!inner(program_id, status)")
    .eq("events.status", "open")
    .in("status", ["confirmed", "offered", "attended"]);
  if (!allPrograms) {
    eventsQ = eventsQ.eq("program_id", programId);
    seatsQ = seatsQ.eq("events.program_id", programId);
  }
  const [{ data: events }, { data: seats }] = await Promise.all([
    eventsQ.order("starts_at", { ascending: true }).limit(50),
    seatsQ,
  ]);
  const taken = new Map<string, number>();
  for (const a of (seats ?? []) as { event_id: string }[]) taken.set(a.event_id, (taken.get(a.event_id) ?? 0) + 1);
  const rows = (events ?? []) as EventRow[];

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-2xl px-5 pt-10 pb-20">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">{program.organization ?? program.name}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Upcoming events</h1>

        {rows.length === 0 ? (
          <p className="mt-8 rounded-lg border border-rule bg-white px-5 py-8 text-center text-sm text-ink-soft">
            Nothing scheduled right now. Check back soon.
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-rule rounded-lg border border-rule bg-white">
            {rows.map((e) => {
              const left = e.capacity == null ? null : Math.max(0, e.capacity - (taken.get(e.id) ?? 0));
              const full = left === 0;
              return (
                <li key={e.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-ink">{e.title}</h2>
                    <p className="mt-1 text-sm text-ink-soft">{formatEventWhen(e.starts_at, e.ends_at, e.timezone)}</p>
                    {(e.location || e.join_url) && (
                      <p className="text-sm text-ink-soft">{e.location ?? "Online"}</p>
                    )}
                    {left != null && (
                      <p className="mt-1 text-xs text-ink-soft">
                        {full ? (e.waitlist_enabled ? "Full · waitlist open" : "Full") : `${left} spot${left === 1 ? "" : "s"} left`}
                      </p>
                    )}
                  </div>
                  {full && !e.waitlist_enabled ? (
                    <span className="text-sm text-ink-soft">Full</span>
                  ) : (
                    <Link href={`/events/${e.slug}/register`} className={buttonClass(full ? "secondary" : "primary", "md")}>
                      {full ? "Join waitlist" : "Register"}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
