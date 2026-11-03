import { stateFromZip } from "@/lib/zip-to-state";

// US ZIP → city/state. The platform never stores a city, only the ZIP people
// enter on landing forms and surveys. City comes from a public ZIP service,
// cached per server instance; state falls back to the offline prefix table
// when the service is slow or down, so a lookup never blocks an export.

export type ZipPlace = { city: string; state: string };

const cache = new Map<string, ZipPlace | null>();

async function lookupZip(zip: string): Promise<ZipPlace | null> {
  if (cache.has(zip)) return cache.get(zip) ?? null;
  let result: ZipPlace | null = null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (r.ok) {
      const j = (await r.json()) as { places?: { "place name": string; "state abbreviation": string }[] };
      const p = j.places?.[0];
      if (p) result = { city: p["place name"], state: p["state abbreviation"] };
    }
  } catch {
    // Offline or slow: state still comes from the prefix table, city stays blank.
  }
  cache.set(zip, result);
  return result;
}

/** The 5-digit ZIP, or null when the value isn't one. */
export function zip5(raw: string | null | undefined): string | null {
  const z = (raw ?? "").trim().slice(0, 5);
  return /^\d{5}$/.test(z) ? z : null;
}

/** Resolve every distinct ZIP once, a few at a time. */
export async function lookupZips(raw: (string | null | undefined)[]): Promise<Map<string, ZipPlace | null>> {
  const zips = [...new Set(raw.map(zip5).filter((z): z is string => !!z))];
  for (let i = 0; i < zips.length; i += 8) {
    await Promise.all(zips.slice(i, i + 8).map(lookupZip));
  }
  return new Map(zips.map((z) => [z, cache.get(z) ?? null]));
}

/** City and state for a ZIP from a `lookupZips` result; state falls back to the prefix table. */
export function placeFor(places: Map<string, ZipPlace | null>, raw: string | null | undefined): { city: string; state: string } {
  const z = zip5(raw);
  const hit = z ? places.get(z) : null;
  return { city: hit?.city ?? "", state: hit?.state ?? stateFromZip(z) ?? "" };
}
