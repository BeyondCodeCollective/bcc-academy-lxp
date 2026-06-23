import { events as fallbackEvents, type Event } from "@/data/marketing/events";

const ORGANIZER_ID = "121150678633";
export const ORGANIZER_URL =
  "https://www.eventbrite.com/o/beyond-code-collective-121150678633";

interface EventbriteEvent {
  id: string;
  name: { text: string };
  description: { text: string | null };
  start: { local: string; timezone: string };
  end: { local: string; timezone: string };
  url: string;
  online_event: boolean;
  logo: { original: { url: string } } | null;
  venue: {
    name: string;
    address?: { city?: string; region?: string };
  } | null;
}

interface EventbriteResponse {
  events: EventbriteEvent[];
}

const PATHWAY_KEYWORDS: Array<{
  pattern: RegExp;
  pathway: string;
  color: string;
}> = [
  {
    pattern: /wisdom leader|55\+|50\+|elder/i,
    pathway: "Wisdom Leaders",
    color: "#B0A99F",
  },
  {
    pattern: /pivoter|career (switch|change|pivot|shift|transition)|educator/i,
    pathway: "Pivoters",
    color: "#FF7043",
  },
  {
    pattern: /launcher|catalyst|workforce|certification|comptia|network\+/i,
    pathway: "Launchers",
    color: "#E85D26",
  },
  {
    pattern: /builder|family|families|caregiver|parent/i,
    pathway: "Builders",
    color: "#0097A7",
  },
  {
    pattern: /explorer|youth|kids|teen|grades?\s*\d|k-12|code (jam|along)/i,
    pathway: "Explorers",
    color: "#00BCD4",
  },
];

function inferPathway(title: string): { pathway: string; color: string } {
  for (const { pattern, pathway, color } of PATHWAY_KEYWORDS) {
    if (pattern.test(title)) return { pathway, color };
  }
  return { pathway: "All Pathways", color: "#0097A7" };
}

const TZ_ABBR: Record<string, string> = {
  "America/New_York": "EST",
  "America/Chicago": "CST",
  "America/Denver": "MST",
  "America/Los_Angeles": "PST",
};

function formatTimeRange(
  startLocal: string,
  endLocal: string,
  timezone: string,
): string {
  const start = new Date(startLocal);
  const end = new Date(endLocal);
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const startStr = start.toLocaleTimeString("en-US", opts);
  const endStr = end.toLocaleTimeString("en-US", opts);
  const tz = TZ_ABBR[timezone] ?? timezone.split("/").pop()?.replace("_", " ") ?? "";
  return `${startStr} – ${endStr}${tz ? ` ${tz}` : ""}`;
}

function normalize(eb: EventbriteEvent): Event {
  const dateOnly = eb.start.local.slice(0, 10);
  const time = formatTimeRange(eb.start.local, eb.end.local, eb.start.timezone);
  const format: Event["format"] = eb.online_event ? "Virtual" : "In-Person";
  const venueName = eb.venue?.name;
  const city = eb.venue?.address?.city;
  const location = venueName
    ? city && city !== venueName
      ? `${venueName}, ${city}`
      : venueName
    : undefined;
  const { pathway, color } = inferPathway(eb.name.text);
  const rawDescription = (eb.description.text ?? "").trim();
  const description = rawDescription
    ? rawDescription.length > 240
      ? rawDescription.slice(0, 237) + "…"
      : rawDescription
    : "Hosted by Beyond Code Collective.";

  return {
    id: eb.id,
    title: eb.name.text,
    date: dateOnly,
    time,
    format,
    partner: "Beyond Code Collective",
    pathway,
    pathwayColor: color,
    location,
    description,
    url: eb.url,
    imageUrl: eb.logo?.original.url,
  };
}

// ── Order resolution (registration funnel) ───────────────────────────────
// The embedded checkout widget hands us only an order ID client-side (no PII),
// and the order.placed webhook is likewise a thin pointer — both resolve the
// buyer's email through this server-side call. Reuses EVENTBRITE_API_TOKEN (the
// same private token already used for the org event feed above). Never expose it
// to the browser.

export type EventbriteOrder = {
  orderId: string;
  email: string;
  /** Buyer's display name from the attendee profile, if present. */
  name: string | null;
  eventId: string;
  eventName: string | null;
  /** ISO 8601 UTC, e.g. "2026-07-09T18:00:00Z". Null if the event has no set time. */
  eventStartUtc: string | null;
  eventEndUtc: string | null;
  /** Local wall-clock start ("2026-07-09T14:00:00") + IANA tz, for human display. */
  eventStartLocal: string | null;
  eventTimezone: string | null;
  /** "placed", "refunded", etc. */
  status: string;
};

/** Pull the order id out of the webhook payload's api_url
 *  (".../orders/1234567890/"). Returns null if it doesn't match. */
export function orderIdFromApiUrl(apiUrl: string | undefined): string | null {
  if (!apiUrl) return null;
  const m = apiUrl.match(/orders\/(\d+)/);
  return m ? m[1] : null;
}

/** Resolve a full order (buyer email + which event they registered for). Returns
 *  null on any failure — callers treat that as "couldn't provision, skip". */
export async function fetchEventbriteOrder(
  orderId: string,
): Promise<EventbriteOrder | null> {
  const token = process.env.EVENTBRITE_API_TOKEN;
  if (!token) {
    console.error("[eventbrite] EVENTBRITE_API_TOKEN not set — cannot resolve order");
    return null;
  }

  const url = `https://www.eventbriteapi.com/v3/orders/${orderId}/?expand=attendees,event`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch (e) {
    console.error("[eventbrite] order fetch threw", orderId, e);
    return null;
  }
  if (!res.ok) {
    console.error("[eventbrite] order fetch failed", orderId, res.status);
    return null;
  }

  const data = (await res.json()) as Record<string, unknown>;
  const attendees = Array.isArray(data.attendees)
    ? (data.attendees as Array<Record<string, unknown>>)
    : [];
  const profile = (attendees[0]?.profile ?? {}) as Record<string, unknown>;
  const event = (data.event ?? {}) as Record<string, unknown>;
  const start = event.start as { utc?: string; local?: string; timezone?: string } | undefined;
  const end = event.end as { utc?: string } | undefined;

  return {
    orderId: String(data.id ?? orderId),
    email: String(data.email ?? profile.email ?? "").trim().toLowerCase(),
    name: (profile.name as string | undefined)?.trim() || null,
    eventId: String(data.event_id ?? event.id ?? ""),
    eventName: (event.name as { text?: string } | undefined)?.text ?? null,
    eventStartUtc: start?.utc ?? null,
    eventEndUtc: end?.utc ?? null,
    eventStartLocal: start?.local ?? null,
    eventTimezone: start?.timezone ?? null,
    status: String(data.status ?? "placed"),
  };
}

export async function getEvents(): Promise<Event[]> {
  const token = process.env.EVENTBRITE_API_TOKEN;
  if (!token) return fallbackEvents;

  try {
    const url = new URL(
      `https://www.eventbriteapi.com/v3/organizers/${ORGANIZER_ID}/events/`,
    );
    url.searchParams.set("expand", "venue,logo");
    url.searchParams.set("status", "live");
    url.searchParams.set("order_by", "start_asc");
    // Eventbrite expects ISO without milliseconds (e.g. 2026-05-03T01:30:45Z).
    url.searchParams.set(
      "start_date.range_start",
      new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    );

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 900 },
    });

    if (!res.ok) {
      console.error(`Eventbrite API ${res.status}: ${res.statusText}`);
      return fallbackEvents;
    }

    const data = (await res.json()) as EventbriteResponse;
    if (!data.events?.length) return fallbackEvents;
    // Eventbrite's order_by isn't always honored; sort soonest-first ourselves.
    return data.events
      .map(normalize)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error("Eventbrite fetch failed:", err);
    return fallbackEvents;
  }
}
