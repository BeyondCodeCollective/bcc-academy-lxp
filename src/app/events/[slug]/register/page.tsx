import { notFound } from "next/navigation";
import { getProgram, getProgramId } from "@/lib/programs/server";
import { formatEventWhen } from "@/lib/events";
import { getEventBySlug } from "@/lib/events-server";
import { RegisterForm } from "./register-form";

// Public event registration. Outside /dashboard/* so the proxy does not gate
// it: a parent with no account registers one or more children here.

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(await getProgramId(), slug);
  return { title: event ? `Register: ${event.title}` : "Register" };
}

export default async function EventRegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [program, programId] = await Promise.all([getProgram(), getProgramId()]);
  const event = await getEventBySlug(programId, slug);
  if (!event || event.status === "draft") notFound();

  const when = formatEventWhen(event.starts_at, event.ends_at, event.timezone);

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-2xl px-5 pt-10 pb-6">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">{program.organization}</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{event.title}</h1>
        <dl className="mt-4 space-y-1 text-sm text-ink">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-ink-soft">When</dt>
            <dd>{when}</dd>
          </div>
          {event.location && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-ink-soft">Where</dt>
              <dd>{event.location}</dd>
            </div>
          )}
        </dl>
        {event.description && <p className="mt-4 text-sm text-ink-soft">{event.description}</p>}
      </div>

      {event.status === "closed" ? (
        <div className="mx-auto w-full max-w-2xl px-5 pb-20">
          <p className="rounded-lg border border-rule bg-white px-5 py-8 text-center text-sm text-ink-soft">
            Registration for this event is closed.
          </p>
        </div>
      ) : (
        <RegisterForm
          eventSlug={event.slug}
          eventTitle={event.title}
          maxAttendees={event.max_attendees_per_registration}
        />
      )}
    </main>
  );
}
