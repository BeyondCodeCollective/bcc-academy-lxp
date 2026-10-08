// CSV parsing and column mapping for registration imports (Hivebrite export
// or this platform's roster CSV). Pure functions; the server action in
// dashboard/admin/events/[id]/import/actions.ts does the writes.

export type Field =
  | "parent_first" | "parent_last" | "parent_email" | "parent_phone" | "city_state" | "zip"
  | "first_name" | "last_name" | "date_of_birth" | "grade" | "school_name" | "school_type" | "gender"
  | "race_ethnicity" | "tshirt_size" | "allergies" | "emergency_contact_name" | "emergency_contact_phone"
  | "experience_level" | "eligibility" | "attended";

// Header patterns, checked in order; the first match wins per column.
const HEADER_RULES: [Field, RegExp][] = [
  ["first_name", /participant.*first|attendee.*first|child.*first|student.*first/i],
  ["last_name", /participant.*last|attendee.*last|child.*last|student.*last/i],
  ["date_of_birth", /birth|dob/i],
  ["parent_first", /parent.*first|^first ?name$/i],
  ["parent_last", /parent.*last|^last ?name$/i],
  ["parent_email", /e-?mail/i],
  ["parent_phone", /parent.*phone|cell|^phone/i],
  ["emergency_contact_phone", /emergency.*phone/i],
  ["emergency_contact_name", /emergency/i],
  ["city_state", /city/i],
  ["zip", /zip|postal/i],
  ["grade", /grade/i],
  ["school_type", /school type/i],
  ["school_name", /school/i],
  ["gender", /gender/i],
  ["race_ethnicity", /race|ethnic/i],
  ["tshirt_size", /shirt/i],
  ["allergies", /allerg|restriction/i],
  ["experience_level", /experience/i],
  ["eligibility", /qualify|eligib/i],
  ["attended", /attended|checked.?in|check-in|^status$/i],
];

export function mapHeaders(headers: string[]): Partial<Record<Field, number>> {
  const map: Partial<Record<Field, number>> = {};
  headers.forEach((h, i) => {
    for (const [field, re] of HEADER_RULES) {
      if (map[field] == null && re.test(h)) {
        map[field] = i;
        return;
      }
    }
  });
  return map;
}

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

const TRUTHY = /^(yes|y|true|1|attended|checked.?in|present)$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toIsoDate(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

export type ImportAttendee = { attended: boolean; cols: Record<string, string | null> };
export type ImportFamily = { parent: Record<string, string | null>; attendees: ImportAttendee[] };

export type ImportPlan =
  | { ok: true; headers: string[]; map: Partial<Record<Field, number>>; families: Map<string, ImportFamily>; skipped: string[]; rowCount: number }
  | { ok: false; error: string };

export function buildImportPlan(csv: string): ImportPlan {
  if (csv.length > 2_000_000) return { ok: false, error: "That file is too large. Split it into smaller exports." };
  const rows = parseCsv(csv);
  if (rows.length < 2) return { ok: false, error: "Paste a CSV with a header row and at least one registration." };
  const headers = rows[0].map((h) => h.trim());
  const map = mapHeaders(headers);
  if (map.parent_email == null) return { ok: false, error: "Could not find an email column." };
  if (map.first_name == null || map.last_name == null) {
    return { ok: false, error: "Could not find the attendee first and last name columns (e.g. \"Participant's First Name\")." };
  }
  const cell = (r: string[], f: Field) => (map[f] == null ? "" : (r[map[f] as number] ?? "").trim());
  const families = new Map<string, ImportFamily>();
  const skipped: string[] = [];
  rows.slice(1).forEach((r, idx) => {
    const email = cell(r, "parent_email").toLowerCase();
    const first = cell(r, "first_name");
    const last = cell(r, "last_name");
    if (!EMAIL_RE.test(email) || !first || !last) {
      skipped.push(`Row ${idx + 2}: missing email or attendee name`);
      return;
    }
    const fam = families.get(email) ?? {
      parent: {
        parent_first_name: cell(r, "parent_first") || first,
        parent_last_name: cell(r, "parent_last") || last,
        parent_email: email,
        parent_phone: cell(r, "parent_phone") || null,
        city_state: cell(r, "city_state") || null,
        zip: cell(r, "zip") || null,
      },
      attendees: [],
    };
    fam.attendees.push({
      attended: TRUTHY.test(cell(r, "attended")),
      cols: {
        first_name: first,
        last_name: last,
        date_of_birth: toIsoDate(cell(r, "date_of_birth")),
        grade: cell(r, "grade") || null,
        school_name: cell(r, "school_name") || null,
        school_type: cell(r, "school_type") || null,
        gender: cell(r, "gender") || null,
        race_ethnicity: cell(r, "race_ethnicity") || null,
        tshirt_size: cell(r, "tshirt_size") || null,
        allergies: cell(r, "allergies") || null,
        emergency_contact_name: cell(r, "emergency_contact_name") || null,
        emergency_contact_phone: cell(r, "emergency_contact_phone") || null,
        experience_level: cell(r, "experience_level") || null,
        eligibility: cell(r, "eligibility") || null,
      },
    });
    families.set(email, fam);
  });
  return { ok: true, headers, map, families, skipped, rowCount: rows.length - 1 };
}

export type ImportPreview = {
  headers: string[];
  mapped: Partial<Record<Field, string>>;
  rows: number;
  families: number;
  attendees: number;
  attended: number;
  skipped: string[];
};
