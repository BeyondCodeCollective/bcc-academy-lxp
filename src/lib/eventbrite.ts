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
