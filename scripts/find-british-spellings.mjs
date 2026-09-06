// Scans every learner- and staff-facing text column in the database for
// British spellings. BCC Academy writes US English; a stray "organisation" in
// a course description reads as someone else's copy.
//
//   node --env-file=.env.local scripts/find-british-spellings.mjs          # report
//   node --env-file=.env.local scripts/find-british-spellings.mjs --fix    # rewrite
//
// Deep-walks JSONB (week_summaries, body_sections, objectives, questions…)
// so nested copy is covered, and preserves case (Organisation -> Organization).

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Missing SUPABASE env.");
  process.exit(1);
}
const FIX = process.argv.includes("--fix");

const headers = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  "Content-Type": "application/json",
};

// [British pattern, American replacement]. Patterns are matched case-
// insensitively with word boundaries; replacements re-apply the original case.
const RULES = [
  [/\b(organis)(e|ed|es|ing|ation|ations|ational|er|ers)\b/gi, "organiz$2"],
  [/\b(recognis)(e|ed|es|ing|able)\b/gi, "recogniz$2"],
  [/\b(realis)(e|ed|es|ing|ation)\b/gi, "realiz$2"],
  [/\b(analys)(e|ed|es|ing)\b/gi, "analyz$2"],
  [/\b(customis|personalis|optimis|utilis|specialis|categoris|prioritis|summaris|apologis|minimis|maximis|authoris|standardis|normalis|initialis|serialis|visualis|familiaris|emphasis)(e|ed|es|ing|ation|ations)\b/gi, "$1z$2"],
  [/\bcolour(s|ed|ing|ful|less)?\b/gi, "color$1"],
  [/\bfavour(s|ed|ing|ite|ites|able|ably)?\b/gi, "favor$1"],
  [/\bbehaviour(s|al|ally)?\b/gi, "behavior$1"],
  [/\bhonour(s|ed|ing|able)?\b/gi, "honor$1"],
  [/\blabour(s|ed|ing)?\b/gi, "labor$1"],
  [/\bneighbour(s|hood|hoods|ing)?\b/gi, "neighbor$1"],
  [/\bflavour(s|ed|ing)?\b/gi, "flavor$1"],
  [/\bhumour(ous)?\b/gi, "humor$1"],
  [/\brumour(s)?\b/gi, "rumor$1"],
  [/\bendeavour(s|ed|ing)?\b/gi, "endeavor$1"],
  [/\bcentre(s|d)?\b/gi, "center$1"],
  [/\btheatre(s)?\b/gi, "theater$1"],
  [/\bmetre(s)?\b/gi, "meter$1"],
  [/\bfibre(s)?\b/gi, "fiber$1"],
  [/\blitre(s)?\b/gi, "liter$1"],
  [/\bdefence(s)?\b/gi, "defense$1"],
  [/\boffence(s)?\b/gi, "offense$1"],
  [/\bpretence\b/gi, "pretense"],
  [/\bpractis(e|ed|es|ing)\b/gi, "practic$1"],
  [/\btravell(ed|ing|er|ers)\b/gi, "travel$1"],
  [/\blabell(ed|ing)\b/gi, "label$1"],
  [/\bmodell(ed|ing)\b/gi, "model$1"],
  [/\bcancell(ing|ation|ations)\b/gi, "cancel$1"],
  [/\bfuell(ed|ing)\b/gi, "fuel$1"],
  [/\bprogramme(s|d)?\b/gi, "program$1"],
  [/\bcatalogue(s|d)?\b/gi, "catalog$1"],
  [/\benrolment(s)?\b/gi, "enrollment$1"],
  [/\bfulfil(s|ment|ments)?\b/gi, "fulfill$1"],
  [/\bskilful(ly)?\b/gi, "skillful$1"],
  [/\bjudgement(s)?\b/gi, "judgment$1"],
  [/\backnowledgement(s)?\b/gi, "acknowledgment$1"],
  [/\bwhilst\b/gi, "while"],
  [/\bamongst\b/gi, "among"],
  [/\blearnt\b/gi, "learned"],
  [/\bspelt\b/gi, "spelled"],
  [/\bmaths\b/gi, "math"],
  [/\bgrey(ish)?\b/gi, "gray$1"],
  [/\bkerb(s)?\b/gi, "curb$1"],
  [/\btyre(s)?\b/gi, "tire$1"],
  [/\bstorey(s)?\b/gi, "story$1"],
  [/\bmould(s|ed|ing|y)?\b/gi, "mold$1"],
  [/\baluminium\b/gi, "aluminum"],
  [/\bsulphur\b/gi, "sulfur"],
  [/\baeroplane(s)?\b/gi, "airplane$1"],
];

/** Re-apply the source word's casing to the replacement: ALL CAPS stays all
 *  caps, Leading Cap stays capitalized, everything else lowercases. */
function matchCase(source, replacement) {
  if (source === source.toUpperCase() && /[A-Z]{2,}/.test(source)) return replacement.toUpperCase();
  if (/^[A-Z]/.test(source)) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

export function americanize(text) {
  let out = text;
  for (const [pattern, replacement] of RULES) {
    out = out.replace(pattern, (match, ...groups) => {
      const args = groups.slice(0, -2);
      const built = replacement.replace(/\$(\d)/g, (_, n) => args[Number(n) - 1] ?? "");
      return matchCase(match, built);
    });
  }
  return out;
}

/** Deep-walk any JSON value, rewriting every string. Returns [value, hits]. */
function walk(value, path, hits) {
  if (typeof value === "string") {
    const fixed = americanize(value);
    if (fixed !== value) hits.push({ path, before: value, after: fixed });
    return fixed;
  }
  if (Array.isArray(value)) return value.map((v, i) => walk(v, `${path}[${i}]`, hits));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, walk(v, `${path}.${k}`, hits)]),
    );
  }
  return value;
}

// Table -> the primary key used to address a row for updates.
const TABLES = [
  ["track_overrides", "id"],
  ["session_content", "id"],
  ["landing_pages", "slug"],
  ["applications", "slug"],
  ["announcements", "id"],
  ["programs", "id"],
  ["media_library", "id"],
];

let totalHits = 0;
let rowsChanged = 0;

for (const [table, pk] of TABLES) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?select=*`, { headers });
  if (!res.ok) {
    console.log(`· ${table}: skipped (${res.status})`);
    continue;
  }
  const rows = await res.json();

  for (const row of rows) {
    const hits = [];
    const patched = {};
    for (const [column, value] of Object.entries(row)) {
      if (column === pk) continue;
      const before = hits.length;
      const fixed = walk(value, column, hits);
      if (hits.length > before) patched[column] = fixed;
    }
    if (!hits.length) continue;

    totalHits += hits.length;
    rowsChanged++;
    console.log(`\n${table} [${pk}=${row[pk]}]`);
    for (const h of hits) {
      // Show just the changed neighborhood, not whole paragraphs.
      const idx = [...h.before].findIndex((c, i) => c !== h.after[i]);
      const from = Math.max(0, idx - 40);
      console.log(`  ${h.path}: …${h.before.slice(from, idx + 40)}…`);
      console.log(`         → …${h.after.slice(from, idx + 40)}…`);
    }

    if (FIX) {
      const patch = await fetch(
        `${SUPA_URL}/rest/v1/${table}?${pk}=eq.${encodeURIComponent(row[pk])}`,
        { method: "PATCH", headers, body: JSON.stringify(patched) },
      );
      if (!patch.ok) console.error(`  ✗ update failed: ${patch.status} ${await patch.text()}`);
    }
  }
}

console.log(
  `\n${totalHits} British spelling${totalHits === 1 ? "" : "s"} across ${rowsChanged} row${rowsChanged === 1 ? "" : "s"}.` +
    (FIX ? " Rewritten." : " Re-run with --fix to rewrite."),
);
