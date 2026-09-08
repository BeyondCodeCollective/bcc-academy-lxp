// Pulls the email addresses out of a roster file so nobody has to open a
// spreadsheet and hand-copy a column. Forte Bahamas sends theirs as an
// attachment; every column layout is different, so this deliberately does NOT
// try to understand the grid.
//
// It reads every string in the sheet and keeps the ones that are email
// addresses. That is layout-proof: headers, extra columns, merged cells,
// notes rows and a "Sheet1" full of formatting all survive it, and the
// allowlist is keyed on email alone (names come from the learner at signup),
// so an email is the whole job.

import JSZip from "jszip";

export type RosterParse = {
  emails: string[];
  /** Addresses that appeared more than once, listed once each. */
  duplicates: string[];
  /** Rows/cells that looked like an address but were not valid. */
  rejected: string[];
};

export type RosterResult =
  | { ok: true; parse: RosterParse }
  | { ok: false; error: string };

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Same shape the allowlist enforces, applied before anything is offered.
const VALID = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

/** Every <t> run in an Office XML part, joined per element. */
function textRuns(xml: string): string[] {
  return [...xml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => decodeEntities(m[1]));
}

async function xlsxStrings(buf: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buf);
  const out: string[] = [];

  // Shared strings hold most text in a real spreadsheet.
  const shared = zip.file("xl/sharedStrings.xml");
  if (shared) out.push(...textRuns(await shared.async("string")));

  // Inline strings live in the sheets themselves.
  for (const name of Object.keys(zip.files)) {
    if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) continue;
    out.push(...textRuns(await zip.file(name)!.async("string")));
  }
  return out;
}

/** Extract addresses from a roster file. Nothing is written anywhere. */
export async function parseRoster(
  fileName: string,
  buf: Buffer,
): Promise<RosterResult> {
  const lower = fileName.toLowerCase();
  let haystack: string[];

  if (lower.endsWith(".xlsx")) {
    try {
      haystack = await xlsxStrings(buf);
    } catch {
      return { ok: false, error: "Could not read that spreadsheet. Re-save it as .xlsx or export a CSV." };
    }
  } else if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    haystack = buf.toString("utf8").split(/\r?\n/);
  } else if (lower.endsWith(".xls")) {
    // Pre-2007 binary .xls is a different format entirely, not a zip. Say so
    // plainly instead of failing with a parse error.
    return {
      ok: false,
      error:
        "That is an older .xls file. Open it and use File → Save As → .xlsx (or CSV), then upload again.",
    };
  } else {
    return { ok: false, error: "Upload a .xlsx spreadsheet or a .csv file." };
  }

  const seen = new Set<string>();
  const emails: string[] = [];
  const duplicates: string[] = [];
  const rejected: string[] = [];

  for (const cell of haystack) {
    for (const raw of cell.match(EMAIL) ?? []) {
      const email = raw.trim().toLowerCase();
      if (!VALID.test(email)) {
        if (!rejected.includes(raw)) rejected.push(raw);
        continue;
      }
      if (seen.has(email)) {
        if (!duplicates.includes(email)) duplicates.push(email);
        continue;
      }
      seen.add(email);
      emails.push(email);
    }
  }

  if (emails.length === 0) {
    return {
      ok: false,
      error: "No email addresses found in that file. Check it has a column of emails.",
    };
  }
  return { ok: true, parse: { emails, duplicates, rejected } };
}
