import { notFound } from "next/navigation";
import { formatEventWhen } from "@/lib/events";
import { currentProgramIdOrNull, getEventBySlug } from "@/lib/events-server";

// Read-only details for people who are already registered (a roster imported
// by staff): when, where, the agenda, and how check-in works. Registration
// itself lives at /events/<slug>/register.

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug, await currentProgramIdOrNull());
  return { title: event ? `${event.title} — Details` : "Event" };
}

export default async function EventDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug, await currentProgramIdOrNull());
  if (!event || event.status === "draft") notFound();

  const inPerson = !event.join_url;
  const [agendaHeading, ...agendaLines] = (event.description ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const hasAgenda = agendaLines.length > 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-xl px-5 py-14">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">{event.programName}</p>
        <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-ink">{event.title}</h1>

        <dl className="mt-8 divide-y divide-rule border-y border-rule text-sm">
          <div className="flex gap-4 py-4">
            <dt className="w-20 shrink-0 text-ink-soft">When</dt>
            <dd className="font-medium text-ink">{formatEventWhen(event.starts_at, event.ends_at, event.timezone)}</dd>
          </div>
          <div className="flex gap-4 py-4">
            <dt className="w-20 shrink-0 text-ink-soft">Where</dt>
            <dd className="font-medium text-ink">
              {event.location ?? (inPerson ? "Venue and room details coming soon." : "Online")}
            </dd>
          </div>
        </dl>

        {hasAgenda ? (
          <section className="mt-10" aria-labelledby="agenda-heading">
            <h2 id="agenda-heading" className="font-display text-lg font-bold text-ink">
              {agendaHeading}
            </h2>
            <ul className="mt-3 divide-y divide-rule text-sm">
              {agendaLines.map((line) => {
                const m = line.match(/^(\d{1,2}:\d{2}(?:\s?[AaPp][Mm])?)\s+(.*)$/);
                return (
                  <li key={line} className="flex gap-4 py-3">
                    {m ? (
                      <>
                        <span className="w-16 shrink-0 font-mono text-ink-soft">{m[1]}</span>
                        <span className="text-ink">{m[2]}</span>
                      </>
                    ) : (
                      <span className="text-ink">{line}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          event.description && <p className="mt-10 whitespace-pre-line text-sm text-ink-soft">{event.description}</p>
        )}

        {inPerson && (
          <section className="mt-10 rounded-lg bg-primary/5 p-5" aria-labelledby="checkin-heading">
            <h2 id="checkin-heading" className="text-sm font-bold text-ink">
              When you arrive
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Scan the QR code at the door and enter the email you registered with. Check-in opens two hours before the
              start.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
