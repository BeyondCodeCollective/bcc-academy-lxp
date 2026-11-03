import { createServiceClient } from "@/lib/supabase/server";
import { EVENT_COLUMNS, formatEventWhen, type EventRow } from "@/lib/events";
import { checkinWindowState, verifyEventCheckinKey } from "@/lib/event-checkin";
import { CheckInForm } from "./check-in-form";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Landing page for the QR code posted at the door. The key in the URL proves
// the visitor scanned it; the form then matches them to their registration.
export default async function EventSelfCheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { id } = await params;
  const { k = "" } = await searchParams;
  const valid = UUID_RE.test(id) && verifyEventCheckinKey(id, k);
  const event = valid
    ? ((await createServiceClient().from("events").select(EVENT_COLUMNS).eq("id", id).maybeSingle<EventRow>()).data ?? null)
    : null;
  const state = event ? checkinWindowState(event) : null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-md px-5 py-12">
        <div className="rounded-lg border border-rule bg-white p-6">
          {!event || event.status === "draft" ? (
            <>
              <h1 className="text-xl font-bold text-ink">This link is not valid</h1>
              <p className="mt-2 text-sm text-ink-soft">Scan the code at the door again, or see a team member.</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-ink">{event.title}</h1>
              <p className="mt-1 text-sm text-ink-soft">{formatEventWhen(event.starts_at, event.ends_at, event.timezone)}</p>
              {event.location && <p className="text-sm text-ink-soft">{event.location}</p>}
              <div className="mt-5">
                {state === "open" ? (
                  <CheckInForm eventId={event.id} keyParam={k} />
                ) : (
                  <p className="text-sm text-ink-soft">
                    {state === "early" ? "Check-in opens two hours before the start." : "Check-in has closed. Please see a team member."}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
