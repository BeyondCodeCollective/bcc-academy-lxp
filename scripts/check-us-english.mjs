// Fails if British spellings appear in the source. BCC Academy writes US
// English; a stray "organisation" in course copy reads as someone else's
// platform. Runs in `pnpm lint`, so a PR carrying one is caught before merge.
//
//   node scripts/check-us-english.mjs
//
// Database content is a separate surface — scan it with
// scripts/find-british-spellings.mjs.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

// Docs count too: DESIGN.md and the playbook are read by people and by AI
// features, and "colour" slipped into DESIGN.md precisely because the guard
// only looked at code.
const ROOTS = ["src", "scripts", "evals", "docs", "DESIGN.md", "CLAUDE.md", "AGENTS.md"];
const EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".css", ".html", ".sql", ".md"]);
// `docs/superpowers/plans` holds dated records of plans as they were written.
// They are history, not living copy — rewriting them would be falsifying a log.
const SKIP_DIRS = new Set(["node_modules", ".next", "archive", "dist", "build", "plans"]);

// [pattern, correction]. Deliberately excludes `grey`, which is an established
// design-token name (--color-grey-1/2/3), not prose — renaming those is a
// styling refactor, not a spelling fix.
const RULES = [
  [/\b[Oo]rganis(e|ed|es|ing|ation|ations|ational)\b/, "organiz-"],
  [/\b[Rr]ecognis(e|ed|es|ing|able)\b/, "recogniz-"],
  [/\b[Rr]ealis(e|ed|es|ing|ation)\b/, "realiz-"],
  [/\b[Aa]nalys(e|ed|es|ing)\b/, "analyz-"],
  [/\b[A-Za-z]*(customis|personalis|optimis|utilis|specialis|categoris|prioritis|summaris|apologis|minimis|maximis|authoris|standardis|normalis|initialis|serialis|visualis|familiaris)(e|ed|es|ing|ation)\b/, "-ize/-ization"],
  [/\b[Cc]olour(s|ed|ing|ful|less)?\b/, "color"],
  [/\b[Bb]ehaviour(s|al|ally)?\b/, "behavior"],
  [/\b[Ff]avour(s|ed|ing|ite|ites|able)?\b/, "favor"],
  [/\b[Hh]onour(s|ed|ing|able)?\b/, "honor"],
  [/\b[Ll]abour(s|ed|ing)?\b/, "labor"],
  [/\b[Nn]eighbour(s|hood|hoods|ing)?\b/, "neighbor"],
  [/\b[Ff]lavour(s|ed|ing)?\b/, "flavor"],
  [/\b[Hh]umour(ous)?\b/, "humor"],
  [/\b[Cc]entre(s|d)?\b/, "center"],
  [/\b[Tt]heatre(s)?\b/, "theater"],
  [/\b[Ff]ibre(s)?\b/, "fiber"],
  [/\b[Dd]efence(s)?\b/, "defense"],
  [/\b[Oo]ffence(s)?\b/, "offense"],
  [/\b[Pp]ractis(e|ed|es|ing)\b/, "practice/practicing"],
  [/\b[Tt]ravell(ed|ing|er|ers)\b/, "travel-"],
  [/\b[Ll]abell(ed|ing)\b/, "label-"],
  [/\b[Mm]odell(ed|ing)\b/, "model-"],
  [/\b[Cc]ancell(ing|ation|ations)\b/, "cancel-"],
  [/\b[Pp]rogramme(s|d)?\b/, "program"],
  [/\b[Cc]atalogue(s|d)?\b/, "catalog"],
  [/\b[Ee]nrolment(s)?\b/, "enrollment"],
  [/\b[Ee]nrol\b/, "enroll"],
  [/\b[Ff]ulfil(s|ment|ments)?\b/, "fulfill"],
  [/\b[Ss]kilful(ly)?\b/, "skillful"],
  [/\b[Jj]udgement(s)?\b/, "judgment"],
  [/\b[Aa]cknowledgement(s)?\b/, "acknowledgment"],
  [/\b[Ww]hilst\b/, "while"],
  [/\b[Aa]mongst\b/, "among"],
  [/\b[Ll]earnt\b/, "learned"],
  [/\b[Ss]pelt\b/, "spelled"],
  [/\b[Mm]aths\b/, "math"],
  [/\b[Tt]yre(s)?\b/, "tire"],
  [/\b[Mm]ould(s|ed|ing|y)?\b/, "mold"],
  [/\b[Aa]luminium\b/, "aluminum"],
  [/\b[Ss]ulphur\b/, "sulfur"],
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTS.has(extname(path))) yield path;
  }
}

const findings = [];
for (const root of ROOTS) {
  let exists = true;
  try {
    statSync(root);
  } catch {
    exists = false;
  }
  if (!exists) continue;

  const files = statSync(root).isDirectory() ? walk(root) : [root];
  for (const file of files) {
    // This file lists the patterns it bans; so does the DB scanner.
    if (file.includes("check-us-english") || file.includes("find-british-spellings")) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      // The AI system prompts spell out the banned words as examples of what
      // NOT to write. Mark those lines `us-english-allow` rather than making
      // the prompts vaguer than the rule they teach.
      if (line.includes("us-english-allow")) return;
      for (const [pattern, correction] of RULES) {
        const match = line.match(pattern);
        if (match) findings.push({ file, line: i + 1, word: match[0], correction });
      }
    });
  }
}

if (findings.length === 0) {
  console.log("✓ US English: no British spellings found.");
  process.exit(0);
}

console.error(`✗ ${findings.length} British spelling${findings.length === 1 ? "" : "s"} found:\n`);
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  "${f.word}" → ${f.correction}`);
}
console.error("\nBCC Academy writes US English. Fix these, or add a rule exception if a proper noun.");
process.exit(1);
