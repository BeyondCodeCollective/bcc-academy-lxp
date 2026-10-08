import { createServiceClient } from "@/lib/supabase/server";
import { formatEventWhen } from "@/lib/events";
import { ConfirmButton } from "./confirm-button";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  first_name: string;
  last_name: string;
  status: string;
  offer_expires_at: string | null;
  events: { title: string; starts_at: string; ends_at: string | null; timezone: string } | null;
};

function offerExpired(a: Pick<Row, "status" | "offer_expires_at">): boolean {
  return a.status === "expired" || (a.offer_expires_at != null && Date.parse(a.offer_expires_at) < Date.now());
}

export default async function ConfirmSeatPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const svc = createServiceClient();
  const { data } = UUID_RE.test(token)
    ? await svc
        .from("event_attendees")
        .select("first_name, last_name, status, offer_expires_at, events(title, starts_at, ends_at, timezone)")
        .eq("confirm_token", token)
        .maybeSingle<Row>()
    : { data: null };
  const name = data ? `${data.first_name} ${data.last_name}` : "";
  const expired = !!data && offerExpired(data);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-md px-5 py-16">
        <div className="rounded-lg border border-rule bg-white p-8">
          {!data || !data.events ? (
            <>
              <h1 className="text-xl font-bold text-ink">This link is not valid</h1>
              <p className="mt-2 text-sm text-ink-soft">The link may have been copied incorrectly.</p>
            </>
          ) : data.status === "confirmed" ? (
            <>
              <h1 className="text-xl font-bold text-ink">Seat confirmed</h1>
              <p className="mt-2 text-sm text-ink-soft">
                {name} is registered for {data.events.title}. A confirmation with the ticket is on its way.
              </p>
            </>
          ) : data.status !== "offered" || expired ? (
            <>
              <h1 className="text-xl font-bold text-ink">This offer has expired</h1>
              <p className="mt-2 text-sm text-ink-soft">
                The seat for {name} at {data.events.title} went to the next family on the waitlist.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-ink">Confirm {data.first_name}&apos;s seat?</h1>
              <p className="mt-2 text-sm text-ink-soft">
                A spot opened up at {data.events.title}. Confirm to keep it.
              </p>
              <p className="mt-3 text-sm text-ink">
                {formatEventWhen(data.events.starts_at, data.events.ends_at, data.events.timezone)}
              </p>
              {data.offer_expires_at && (
                <p className="mt-1 text-xs text-ink-soft">
                  Offer expires {formatEventWhen(data.offer_expires_at, null, data.events.timezone)}
                </p>
              )}
              <ConfirmButton token={token} attendeeName={name} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
