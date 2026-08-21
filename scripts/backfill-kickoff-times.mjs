// Backfill track_overrides.kickoff_time_utc for courses whose schedule was
// saved before applyWeeklyScheduleAction started writing it.
//
// Those courses show a real time in their header ("Saturdays 12:00 PM–1:00 PM
// ET", stored as prose in session_times) while the absolute instant the
// countdown and .ics feed read was never set — so Launch Readiness reported
// "kickoff time missing" on a course that visibly has a time.
//
// Source of truth is the earliest DATED unit in week_summaries, which carries
// its own `date` + `time` (ET wall clock) — the same pair the action now uses.
// A course with no dated unit, or a unit with no time, is genuinely unknown and
// is skipped rather than guessed at.
//
// Read-only unless --write is passed.
//
//   node --env-file=.env.local scripts/backfill-kickoff-times.mjs
//   node --env-file=.env.local scripts/backfill-kickoff-times.mjs --write

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

/** Eastern wall-clock -> UTC instant. Mirrors easternToUtc in src/lib/utils.ts:
 *  two passes so DST changeover days resolve correctly. */
function easternToUtc(date, time) {
  const naive = Date.parse(`${date}T${time}:00Z`);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const offsetAt = (ms) => {
    const p = Object.fromEntries(
      dtf.formatToParts(new Date(ms)).map((x) => [x.type, x.value]),
    );
    const wall = Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +(p.hour === "24" ? "00" : p.hour),
      +p.minute,
      +p.second,
    );
    return wall - ms;
  };
  let guess = naive - offsetAt(naive);
  guess = naive - offsetAt(guess);
  return new Date(guess).toISOString();
}

const res = await fetch(
  `${URL_BASE}/rest/v1/track_overrides?select=id,track_slug,name,start_date,kickoff_time_utc,session_times,week_summaries&kickoff_time_utc=is.null`,
  { headers },
);
if (!res.ok) {
  console.error("Read failed:", res.status, await res.text());
  process.exit(1);
}
const rows = await res.json();

let fixed = 0;
let skipped = 0;

for (const t of rows) {
  const dated = (t.week_summaries ?? [])
    .filter((w) => w && w.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const first = dated[0];
  if (!first || !first.time) {
    // No dated unit, or no time on it. Unknown is a valid answer here.
    console.log(`skip  ${t.track_slug} — no dated unit with a time`);
    skipped++;
    continue;
  }
  const iso = easternToUtc(first.date, first.time);
  const label = (t.session_times ?? []).join(" & ") || "(no schedule text)";
  console.log(
    `${WRITE ? "write" : "would"} ${t.track_slug} — ${first.date} ${first.time} ET -> ${iso}   [header: ${label}]`,
  );
  if (WRITE) {
    const up = await fetch(`${URL_BASE}/rest/v1/track_overrides?id=eq.${t.id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ kickoff_time_utc: iso }),
    });
    if (!up.ok) {
      console.error(`  FAILED ${t.track_slug}:`, up.status, await up.text());
      continue;
    }
  }
  fixed++;
}

console.log(
  `\n${WRITE ? "Updated" : "Would update"} ${fixed} course(s); skipped ${skipped}.` +
    (WRITE ? "" : "  Re-run with --write to apply."),
);
