import { createServiceClient } from "@/lib/supabase/server";
import { formatEventWhen } from "@/lib/events";
import { CancelButton } from "./cancel-button";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  first_name: string;
  last_name: string;
  status: string;
  events: { title: string; starts_at: string; ends_at: string | null; timezone: string } | null;
};

export default async function CancelTicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const svc = createServiceClient();
  const { data } = UUID_RE.test(token)
    ? await svc
        .from("event_attendees")
        .select("first_name, last_name, status, events(title, starts_at, ends_at, timezone)")
        .eq("cancel_token", token)
        .maybeSingle<Row>()
    : { data: null };

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-md px-5 py-16">
        <div className="rounded-lg border border-rule bg-white p-8">
          {!data || !data.events ? (
            <>
              <h1 className="text-xl font-bold text-ink">This link is not valid</h1>
              <p className="mt-2 text-sm text-ink-soft">
                The ticket may already be cancelled, or the link was copied incorrectly.
              </p>
            </>
          ) : data.status === "cancelled" ? (
            <>
              <h1 className="text-xl font-bold text-ink">Ticket cancelled</h1>
              <p className="mt-2 text-sm text-ink-soft">
                {data.first_name} {data.last_name} is no longer registered for {data.events.title}.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-ink">Cancel this ticket?</h1>
              <p className="mt-2 text-sm text-ink-soft">
                This cancels {data.first_name} {data.last_name}&apos;s spot at {data.events.title}.
                Other attendees on your registration keep theirs.
              </p>
              <p className="mt-3 text-sm text-ink">
                {formatEventWhen(data.events.starts_at, data.events.ends_at, data.events.timezone)}
              </p>
              <CancelButton token={token} attendeeName={`${data.first_name} ${data.last_name}`} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
