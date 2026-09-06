// Seeds media_library with curated Pexels photos so the auto-pick always has
// a real database to choose from — nobody hunts for photos, ever. Re-runnable:
// rows are keyed by pexels/<id>, so existing photos are skipped, and each run
// tops the library back up as queries or curation evolve.
//
//   node --env-file=.env.local scripts/seed-photo-library.mjs
//
// Photos are hotlinked from the Pexels CDN (permitted by their API terms and
// already allowlisted in next.config images). Captions come from Pexels' own
// alt text plus the query, which is what the picker matches against.

const PEXELS_KEY = process.env.PEXELS_API_KEY;
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!PEXELS_KEY || !SUPA_URL || !SUPA_KEY) {
  console.error("Missing PEXELS_API_KEY / SUPABASE env.");
  process.exit(1);
}

// Curated for what BCC Academy actually teaches and who it serves: Black and
// brown youth + adult learners, coding, cybersecurity, gaming, robotics,
// community programs (ATG basketball, Forte Bahamas), classrooms, mentorship.
const QUERIES = [
  "black student coding laptop",
  "black girl computer science",
  "black woman programmer",
  "black teen technology",
  "diverse students classroom computers",
  "kids robotics workshop",
  "teen gaming esports",
  "young people coding class",
  "black man teaching classroom",
  "mentorship meeting office",
  "cybersecurity computer screen",
  "code on screen dark",
  "circuit board closeup",
  "community center workshop",
  "basketball court youth",
  "graduation celebration black students",
  "adult education classroom",
  "caribbean island city",
  "hands typing keyboard",
  "team collaboration whiteboard",
];
const PER_QUERY = 12;

const supaHeaders = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  "Content-Type": "application/json",
};

const { count: before } = await head("media_library");

let added = 0;
let skipped = 0;
for (const query of QUERIES) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=${PER_QUERY}`,
    { headers: { Authorization: PEXELS_KEY } },
  );
  if (!res.ok) {
    console.error(`✗ "${query}": Pexels ${res.status}`);
    continue;
  }
  const { photos = [] } = await res.json();

  const rows = photos
    .filter((p) => p.src?.large2x || p.src?.large)
    .map((p) => ({
      url: p.src.large2x ?? p.src.large,
      path: `pexels/${p.id}`,
      source: "pexels",
      description: [p.alt, `(search: ${query})`].filter(Boolean).join(" "),
      tags: [...new Set(query.split(" "))],
    }));

  // ignore-duplicates: re-runs and overlapping queries skip existing rows.
  const ins = await fetch(`${SUPA_URL}/rest/v1/media_library?on_conflict=path`, {
    method: "POST",
    headers: { ...supaHeaders, Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });
  if (!ins.ok) {
    console.error(`✗ "${query}": insert ${ins.status} ${await ins.text()}`);
    continue;
  }
  const inserted = (await ins.json()).length;
  added += inserted;
  skipped += rows.length - inserted;
  console.log(`✓ "${query}": ${inserted} added${inserted < rows.length ? ` (${rows.length - inserted} already there)` : ""}`);
}

const { count: after } = await head("media_library");
console.log(`\nDone: ${added} added, ${skipped} already present. Library: ${before} → ${after} photos.`);

async function head(table) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?select=id`, {
    method: "HEAD",
    headers: { ...supaHeaders, Prefer: "count=exact" },
  });
  return { count: Number(res.headers.get("content-range")?.split("/")[1] ?? 0) };
}
