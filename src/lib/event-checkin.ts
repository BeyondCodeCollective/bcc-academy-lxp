import crypto from "node:crypto";

// Self check-in key for in-person events. The QR code carries
// /events/check-in/<event id>?k=<key>; the key is an HMAC of the event id, so
// no column is needed and a printed QR stays valid for that event only.

function secret(): string {
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error("Event check-in secret is not configured");
  return crypto.createHash("sha256").update("event-checkin:" + base).digest("hex");
}

export function eventCheckinKey(eventId: string): string {
  return crypto.createHmac("sha256", secret()).update(eventId).digest("base64url").slice(0, 22);
}

export function verifyEventCheckinKey(eventId: string, key: string): boolean {
  if (!key) return false;
  const a = Buffer.from(eventCheckinKey(eventId));
  const b = Buffer.from(key);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const HOUR = 60 * 60 * 1000;

// Self check-in is open from two hours before the start until three hours
// after the end (four hours after the start when no end is set).
export function checkinWindowState(
  event: { starts_at: string; ends_at: string | null },
  now = Date.now(),
): "early" | "open" | "closed" {
  const start = Date.parse(event.starts_at);
  const end = event.ends_at ? Date.parse(event.ends_at) : start + 4 * HOUR;
  if (now < start - 2 * HOUR) return "early";
  if (now > end + 3 * HOUR) return "closed";
  return "open";
}
