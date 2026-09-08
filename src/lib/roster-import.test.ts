import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parseRoster } from "./roster-import";

/** A minimal but real .xlsx: shared strings plus a sheet that references them,
 *  which is how Excel actually stores text. */
async function xlsx(values: string[]): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "xl/sharedStrings.xml",
    `<?xml version="1.0"?><sst>${values.map((v) => `<si><t>${v.replace(/&/g, "&amp;")}</t></si>`).join("")}</sst>`,
  );
  zip.file(
    "xl/worksheets/sheet1.xml",
    `<?xml version="1.0"?><worksheet><sheetData>${values
      .map((_, i) => `<row><c t="s"><v>${i}</v></c></row>`)
      .join("")}</sheetData></worksheet>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("parseRoster", () => {
  it("pulls emails out of a spreadsheet regardless of column layout", async () => {
    const buf = await xlsx([
      "Student Name", "Email Address", "Cohort",       // a header row
      "Ama Rolle", "ama.rolle@example.bs", "Spring",
      "Kofi Bain", "kofi.bain@example.bs", "Spring",
    ]);
    const res = await parseRoster("forte-roster.xlsx", buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.parse.emails).toEqual(["ama.rolle@example.bs", "kofi.bain@example.bs"]);
  });

  it("lowercases and de-duplicates", async () => {
    const buf = await xlsx(["A@Example.com", "a@example.com", "b@example.com"]);
    const res = await parseRoster("r.xlsx", buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.parse.emails).toEqual(["a@example.com", "b@example.com"]);
    expect(res.parse.duplicates).toEqual(["a@example.com"]);
  });

  it("reads a CSV too", async () => {
    const csv = Buffer.from("name,email\nAma,ama@example.bs\nKofi,kofi@example.bs\n");
    const res = await parseRoster("roster.csv", csv);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.parse.emails).toEqual(["ama@example.bs", "kofi@example.bs"]);
  });

  it("finds an address even when it shares a cell with other text", async () => {
    const buf = await xlsx(["contact: ama@example.bs (guardian)"]);
    const res = await parseRoster("r.xlsx", buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.parse.emails).toEqual(["ama@example.bs"]);
  });

  it("tells you to convert a legacy .xls instead of failing cryptically", async () => {
    const res = await parseRoster("roster.xls", Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain("Save As");
  });

  it("says so when a file has no emails at all", async () => {
    const buf = await xlsx(["Name", "Cohort", "Notes"]);
    const res = await parseRoster("r.xlsx", buf);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain("No email addresses");
  });

  it("rejects an unsupported file type", async () => {
    const res = await parseRoster("roster.pdf", Buffer.from("x"));
    expect(res.ok).toBe(false);
  });
});
