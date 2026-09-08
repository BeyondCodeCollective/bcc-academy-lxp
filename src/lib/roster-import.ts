// Pulls people out of a roster file so nobody has to open a spreadsheet and
// hand-copy columns. Forte Bahamas sends theirs as an attachment and no two
// partners format one the same way.
//
// Two passes, on purpose:
//   1. Read the grid. Cells are placed by their real column letter, a header
//      row names the email/first/last/name columns when there is one, and each
//      data row becomes one person — that is what carries NAMES.
//   2. If the grid yields nothing usable, fall back to scanning every string
//      in the file for addresses. Layout-proof, names blank. Better to import
//      twenty emails without names than to fail on an odd sheet.

import JSZip from "jszip";

export type RosterPerson = {
  email: string;
  firstName: string;
  lastName: string;
};

export type RosterParse = {
  people: RosterPerson[];
  /** Addresses seen more than once, listed once each. */
  duplicates: string[];
  /** Things that looked like an address but were not valid. */
  rejected: string[];
};

export type RosterResult =
  | { ok: true; parse: RosterParse }
  | { ok: false; error: string };

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
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

/** "C" -> 2, "AA" -> 26. Cells carry their column in the r attribute, and a
 *  sheet omits empty cells entirely — so position has to be read, not counted. */
function colIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

async function xlsxGrid(buf: Buffer): Promise<string[][]> {
  const zip = await JSZip.loadAsync(buf);

  const shared: string[] = [];
  const sharedFile = zip.file("xl/sharedStrings.xml");
  if (sharedFile) {
    const xml = await sharedFile.async("string");
    // One <si> per string; its text may be split across <r><t> runs.
    for (const si of xml.split("</si>")) {
      const runs = [...si.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]);
      if (runs.length) shared.push(decodeEntities(runs.join("")));
    }
  }

  const sheetName = Object.keys(zip.files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort()[0];
  if (!sheetName) return [];

  const xml = await zip.file(sheetName)!.async("string");
  const grid: string[][] = [];
  for (const rowXml of xml.split("</row>")) {
    if (!rowXml.includes("<c ")) continue;
    const row: string[] = [];
    for (const m of rowXml.matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = m[1];
      const body = m[2];
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1] ?? "A1";
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      let value = "";
      if (type === "s") {
        const idx = Number(/<v>([^<]*)<\/v>/.exec(body)?.[1] ?? "-1");
        value = shared[idx] ?? "";
      } else if (type === "inlineStr") {
        value = decodeEntities(
          [...body.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((x) => x[1]).join(""),
        );
      } else {
        value = decodeEntities(/<v>([^<]*)<\/v>/.exec(body)?.[1] ?? "");
      }
      row[colIndex(ref)] = value;
    }
    if (row.length) grid.push([...row].map((c) => c ?? ""));
  }
  return grid;
}

/** Split a CSV line, honoring simple double-quoted fields. */
function csvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function splitFullName(full: string): { firstName: string; lastName: string } {
  const clean = full.replace(/\s+/g, " ").trim();
  if (!clean) return { firstName: "", lastName: "" };
  // "Rolle, Ama" is as common in an export as "Ama Rolle".
  if (clean.includes(",")) {
    const [last, first] = clean.split(",", 2).map((x) => x.trim());
    return { firstName: first ?? "", lastName: last ?? "" };
  }
  const parts = clean.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/** Read a grid into people, using a header row when the sheet has one. */
function peopleFromGrid(grid: string[][]): RosterPerson[] {
  if (grid.length === 0) return [];

  const headerIdx = grid.findIndex((row) =>
    row.some((c) => /e-?mail/i.test(c ?? "")),
  );

  let emailCol = -1;
  let firstCol = -1;
  let lastCol = -1;
  let nameCol = -1;

  if (headerIdx >= 0) {
    grid[headerIdx].forEach((raw, i) => {
      const h = (raw ?? "").trim().toLowerCase();
      if (emailCol < 0 && /e-?mail/.test(h)) emailCol = i;
      else if (firstCol < 0 && /^first|given/.test(h)) firstCol = i;
      else if (lastCol < 0 && /^last|surname|family/.test(h)) lastCol = i;
      else if (nameCol < 0 && /name/.test(h)) nameCol = i;
    });
  }

  const people: RosterPerson[] = [];
  grid.forEach((row, i) => {
    if (i === headerIdx) return;

    // Prefer the named column; fall back to any address in the row so a sheet
    // with no header still yields people.
    const emailCell =
      emailCol >= 0 && row[emailCol] ? row[emailCol] : row.find((c) => EMAIL.test(c ?? "") && (EMAIL.lastIndex = 0) === 0);
    const email = (emailCell ?? "").match(EMAIL)?.[0]?.trim().toLowerCase() ?? "";
    if (!email) return;

    let firstName = "";
    let lastName = "";
    if (firstCol >= 0 || lastCol >= 0) {
      firstName = (row[firstCol] ?? "").trim();
      lastName = (row[lastCol] ?? "").trim();
    } else if (nameCol >= 0) {
      ({ firstName, lastName } = splitFullName(row[nameCol] ?? ""));
    } else {
      // No header to go on: the first text cell in the row that is not the
      // address and not a number is the best available guess at a name.
      const guess = row.find(
        (c, idx) =>
          idx !== row.indexOf(emailCell ?? "") &&
          (c ?? "").trim() &&
          !(c ?? "").includes("@") &&
          !/^[\d\s./-]+$/.test(c ?? ""),
      );
      if (guess) ({ firstName, lastName } = splitFullName(guess));
    }

    people.push({ email, firstName, lastName });
  });
  return people;
}

/** Extract people from a roster file. Nothing is written anywhere. */
export async function parseRoster(
  fileName: string,
  buf: Buffer,
): Promise<RosterResult> {
  const lower = fileName.toLowerCase();
  let grid: string[][];

  if (lower.endsWith(".xlsx")) {
    try {
      grid = await xlsxGrid(buf);
    } catch {
      return { ok: false, error: "Could not read that spreadsheet. Re-save it as .xlsx or export a CSV." };
    }
  } else if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    grid = buf
      .toString("utf8")
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map(csvLine);
  } else if (lower.endsWith(".xls")) {
    return {
      ok: false,
      error:
        "That is an older .xls file. Open it and use File → Save As → .xlsx (or CSV), then upload again.",
    };
  } else {
    return { ok: false, error: "Upload a .xlsx spreadsheet or a .csv file." };
  }

  const seen = new Set<string>();
  const people: RosterPerson[] = [];
  const duplicates: string[] = [];
  const rejected: string[] = [];

  for (const p of peopleFromGrid(grid)) {
    if (!VALID.test(p.email)) {
      if (!rejected.includes(p.email)) rejected.push(p.email);
      continue;
    }
    if (seen.has(p.email)) {
      if (!duplicates.includes(p.email)) duplicates.push(p.email);
      continue;
    }
    seen.add(p.email);
    people.push(p);
  }

  if (people.length === 0) {
    return {
      ok: false,
      error: "No email addresses found in that file. Check it has a column of emails.",
    };
  }
  return { ok: true, parse: { people, duplicates, rejected } };
}
