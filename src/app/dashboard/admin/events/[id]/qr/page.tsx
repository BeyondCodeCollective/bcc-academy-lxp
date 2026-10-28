import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSessionContext } from "@/lib/auth/session";
import { canManageStudents } from "@/lib/roles";
import { createServiceClient } from "@/lib/supabase/server";
import { requireManager, allowedProgramIdsForActor } from "@/app/dashboard/admin/actions-shared";
import { EVENT_COLUMNS, formatEventWhen, type EventRow } from "@/lib/events";
import { eventCheckinKey } from "@/lib/event-checkin";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

// Full-screen QR for the door: project it or print this page. Scanning opens
// the self check-in page for this event.
export default async function EventQrPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canManageStudents(ctx.student?.role ?? "")) redirect("/dashboard/admin");

  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const allowedIds = allowedProgramIdsForActor(await requireManager());
  const { data: event } = await createServiceClient()
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", id)
    .maybeSingle<EventRow>();
  if (!event || (allowedIds !== null && !allowedIds.includes(event.program_id))) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "bccacademy.io";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/events/check-in/${event.id}?k=${eventCheckinKey(event.id)}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 text-center">
      <Link
        href={`/dashboard/admin/events/${event.id}/check-in`}
        className="text-sm text-ink-soft hover:text-ink hover:underline print:hidden"
      >
        Back to check-in
      </Link>
      <h1 className="mt-2 text-3xl font-bold text-ink">{event.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {formatEventWhen(event.starts_at, event.ends_at, event.timezone)}
        {event.location ? ` · ${event.location}` : ""}
      </p>
      <div
        className="mx-auto mt-6 w-full max-w-md bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
        role="img"
        aria-label="QR code for check-in"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="mt-4 text-lg font-semibold text-ink">Scan to check in</p>
      <p className="mt-1 text-sm text-ink-soft">Use the email you registered with. Opens two hours before the start.</p>
      <p className="mt-6 break-all text-xs text-ink-faint print:hidden">{url}</p>
    </div>
  );
}
