// Turns whatever an admin pastes into the import box — a Google Doc link, an
// Eventbrite link, or raw text — into plain text for the parser, plus any
// structured facts we can get for free.
//
// Structured facts matter: an Eventbrite event gives us the exact start time,
// timezone, and cover image. Those are the fields most likely to be wrong if a
// language model infers them from prose, so we take the API's answer and let
// the model fill in only the descriptive copy.

export type EventbriteFacts = {
  eventId: string;
  name: string;
  startLocal: string; // "2026-07-20T11:00:00"
  endLocal: string;
  timezone: string; // IANA, e.g. "America/New_York"
  coverImageUrl?: string;
  attendeeEmails: string[];
};

export type ImportSource =
  | { kind: "text"; text: string }
  | { kind: "google-doc"; text: string; docId: string }
  | { kind: "eventbrite"; text: string; facts: EventbriteFacts }
  // Uploaded files (see ./file.ts). PDFs carry the raw bytes — Gemini reads
  // them natively, so we never extract text from a PDF ourselves. DOCX/PPTX
  // arrive as text we pulled out of the Office XML.
  | { kind: "pdf"; text: string; dataBase64: string; fileName: string }
  | { kind: "file"; text: string; fileName: string };

export type SourceResult =
  | { ok: true; source: ImportSource }
  | { ok: false; error: string; needsPaste?: boolean };

const GOOGLE_DOC_RE = /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/;
const EVENTBRITE_RE = /eventbrite\.[a-z.]+\/e\/[^/?#]*?(\d{10,})/;

function looksLikeUrl(input: string): boolean {
  const t = input.trim();
  return !t.includes("\n") && /^https?:\/\//i.test(t);
}

/**
 * Google Docs shared as "anyone with the link" expose a plain-text export with
 * no auth. Workspace-restricted docs return HTML sign-in page or a 401/403.
 * We deliberately do NOT treat that as a hard failure — the caller falls back
 * to asking the admin to paste the text, so the feature works for both sharing
 * modes without blocking on a service account.
 */
async function fetchGoogleDoc(docId: string): Promise<SourceResult> {
  let res: Response;
  try {
    res = await fetch(
      `https://docs.google.com/document/d/${docId}/export?format=txt`,
      { redirect: "follow" },
    );
  } catch {
    return {
      ok: false,
      needsPaste: true,
      error: "Could not reach Google Docs.",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      needsPaste: true,
      error:
        "This doc isn't shared publicly, so the app can't read it. Open the doc, copy the text, and paste it here instead.",
    };
  }

  const text = await res.text();

  // A restricted doc can still answer 200 with an HTML sign-in page rather than
  // the text export. Detect that instead of feeding login markup to the model.
  if (/^\s*<(!doctype|html)/i.test(text)) {
    return {
      ok: false,
      needsPaste: true,
      error:
        "This doc isn't shared publicly, so the app can't read it. Open the doc, copy the text, and paste it here instead.",
    };
  }

  if (!text.trim()) {
    return { ok: false, needsPaste: true, error: "That doc appears to be empty." };
  }

  return { ok: true, source: { kind: "google-doc", text, docId } };
}

async function eventbriteGet(path: string): Promise<unknown | null> {
  const token = process.env.EVENTBRITE_API_TOKEN;
  if (!token) return null;
  const res = await fetch(`https://www.eventbriteapi.com/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchEventbrite(eventId: string): Promise<SourceResult> {
  const event = (await eventbriteGet(`/events/${eventId}/?expand=logo`)) as {
    name?: { text?: string };
    description?: { text?: string };
    start?: { local?: string; timezone?: string };
    end?: { local?: string };
    logo?: { original?: { url?: string }; url?: string };
  } | null;

  if (!event?.start?.local || !event.start.timezone) {
    return {
      ok: false,
      needsPaste: true,
      error:
        "Could not read that Eventbrite event. Check the link, or paste the event text instead.",
    };
  }

  // Attendee emails are a bonus, not a requirement — a failure here shouldn't
  // sink the import. Note: this endpoint rejects a page_size param.
  const attendees = (await eventbriteGet(`/events/${eventId}/attendees/`)) as {
    attendees?: Array<{ cancelled?: boolean; profile?: { email?: string } }>;
  } | null;

  const attendeeEmails = [
    ...new Set(
      (attendees?.attendees ?? [])
        .filter((a) => !a.cancelled)
        .map((a) => a.profile?.email?.trim().toLowerCase())
        .filter((e): e is string => Boolean(e)),
    ),
  ];

  const facts: EventbriteFacts = {
    eventId,
    name: event.name?.text ?? "",
    startLocal: event.start.local,
    endLocal: event.end?.local ?? "",
    timezone: event.start.timezone,
    coverImageUrl: event.logo?.original?.url ?? event.logo?.url,
    attendeeEmails,
  };

  const text = [event.name?.text ?? "", event.description?.text ?? ""]
    .filter(Boolean)
    .join("\n\n");

  return { ok: true, source: { kind: "eventbrite", text, facts } };
}

export async function resolveSource(input: string): Promise<SourceResult> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Paste a link or some text first." };

  if (looksLikeUrl(trimmed)) {
    const doc = trimmed.match(GOOGLE_DOC_RE);
    if (doc) return fetchGoogleDoc(doc[1]);

    const eb = trimmed.match(EVENTBRITE_RE);
    if (eb) return fetchEventbrite(eb[1]);

    return {
      ok: false,
      needsPaste: true,
      error:
        "That link isn't a Google Doc or an Eventbrite event. Paste the text instead.",
    };
  }

  return { ok: true, source: { kind: "text", text: trimmed } };
}
