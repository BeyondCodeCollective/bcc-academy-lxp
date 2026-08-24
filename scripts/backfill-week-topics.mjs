// Backfill track_overrides.week_summaries[].topic from session_content.title.
//
// These are two stores of the same idea. session_content.title is what a
// learner sees; week_summaries[].topic is the last-resort fallback behind it,
// and it used to be typed by hand in a second admin form. Editing a session
// title left the topic stale, so courses accumulated placeholders — MASS Fall
// 2026 read "Week 1"…"Week 8" in one panel while the other listed the real
// session names.
//
// saveSessionContent now mirrors the title on every write, so this only has to
// clean up what is already there.
//
// Only fills a topic that is EMPTY or a placeholder ("Week 3", "Session 2",
// "Day 1" — the unit label plus its number). A topic somebody deliberately
// wrote differently from the session title is left alone: it may be wrong, but
// overwriting a human's words because they disagree with another field is not
// this script's call.
//
// Read-only unless --write is passed.
//
//   node --env-file=.env.local scripts/backfill-week-topics.mjs
//   node --env-file=.env.local scripts/backfill-week-topics.mjs --write

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WRITE = process.argv.includes("--write");

if (!URL_BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

const get = async (path) => {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
};

/** Is this topic a generic stand-in rather than a real one? */
function isPlaceholder(topic, unitLabel, week) {
  const t = (topic ?? "").trim();
  if (!t) return true;
  const label = (unitLabel || "Week").trim();
  // "Week 3", "week 3", "Session 3", "Day 3" — the label and its number.
  return new RegExp(`^(week|session|day|unit|module|${escape(label)})\\s*0*${week}$`, "i").test(t);
}
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const overrides = await get(
  "track_overrides?select=id,track_slug,unit_label,week_summaries",
);
const content = await get("session_content?select=track,week_number,title");

// track slug → week number → title
const titles = new Map();
for (const c of content) {
  if (!c.title) continue;
  if (!titles.has(c.track)) titles.set(c.track, new Map());
  titles.get(c.track).set(c.week_number, c.title);
}

let changed = 0;
let skipped = 0;

for (const t of overrides) {
  const summaries = t.week_summaries;
  if (!Array.isArray(summaries) || summaries.length === 0) continue;
  const byWeek = titles.get(t.track_slug);
  if (!byWeek) continue;

  const updates = [];
  const next = summaries.map((w) => {
    const title = byWeek.get(w.week);
    if (!title) return w;
    if (!isPlaceholder(w.topic, t.unit_label, w.week)) {
      if ((w.topic ?? "").trim() !== title.trim()) skipped++;
      return w;
    }
    updates.push(`${w.week}: ${JSON.stringify(w.topic ?? "")} -> ${JSON.stringify(title)}`);
    return { ...w, topic: title };
  });

  if (updates.length === 0) continue;
  changed += updates.length;
  console.log(`${WRITE ? "write" : "would"}  ${t.track_slug}`);
  for (const u of updates) console.log(`         ${u}`);

  if (WRITE) {
    const res = await fetch(`${URL_BASE}/rest/v1/track_overrides?id=eq.${t.id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ week_summaries: next }),
    });
    if (!res.ok) console.error(`  FAILED ${t.track_slug}:`, res.status, await res.text());
  }
}

console.log(
  `\n${WRITE ? "Updated" : "Would update"} ${changed} unit topic(s).` +
    (skipped ? `  Left ${skipped} hand-written topic(s) alone.` : "") +
    (WRITE ? "" : "  Re-run with --write to apply."),
);
