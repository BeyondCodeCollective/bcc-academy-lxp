import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parseRoster } from "./roster-import";

/** A real .xlsx shape: shared strings plus a sheet whose cells reference them
 *  by index and carry their true column in r="B2". Rows are arrays of cells. */
async function xlsx(rows: string[][]): Promise<Buffer> {
  const flat: string[] = [];
  const idx = (v: string) => {
    const i = flat.indexOf(v);
    if (i >= 0) return i;
    flat.push(v);
    return flat.length - 1;
  };
  const body = rows
    .map((row, r) => {
      const cells = row
        .map((v, c) =>
          v === ""
            ? ""
            : `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="s"><v>${idx(v)}</v></c>`,
        )
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");
  const zip = new JSZip();
  zip.file(
    "xl/sharedStrings.xml",
    `<?xml version="1.0"?><sst>${flat.map((v) => `<si><t>${v.replace(/&/g, "&amp;")}</t></si>`).join("")}</sst>`,
  );
  zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0"?><worksheet><sheetData>${body}</sheetData></worksheet>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("parseRoster", () => {
  it("pairs a single Name column with the email", async () => {
    const buf = await xlsx([
      ["Name", "Email", "Cohort"],
      ["Ama Rolle", "ama.rolle@example.bs", "Spring"],
      ["Kofi Bain", "kofi.bain@example.bs", "Spring"],
    ]);
    const res = await parseRoster("forte.xlsx", buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.parse.people).toEqual([
      { email: "ama.rolle@example.bs", firstName: "Ama", lastName: "Rolle" },
      { email: "kofi.bain@example.bs", firstName: "Kofi", lastName: "Bain" },
    ]);
  });

  it("handles separate First and Last columns", async () => {
    const buf = await xlsx([
      ["First Name", "Last Name", "Email Address"],
      ["Ama", "Rolle", "ama@example.bs"],
    ]);
    const res = await parseRoster("r.xlsx", buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.parse.people[0]).toEqual({ email: "ama@example.bs", firstName: "Ama", lastName: "Rolle" });
  });

  it('reads "Rolle, Ama" the way an export writes it', async () => {
    const buf = await xlsx([["Name", "Email"], ["Rolle, Ama", "ama@example.bs"]]);
    const res = await parseRoster("r.xlsx", buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.parse.people[0]).toMatchObject({ firstName: "Ama", lastName: "Rolle" });
  });

  it("does not care which column the email sits in", async () => {
    const buf = await xlsx([
      ["Cohort", "Email", "Name", "Notes"],
      ["Spring", "ama@example.bs", "Ama Rolle", "paid"],
    ]);
    const res = await parseRoster("r.xlsx", buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.parse.people[0]).toEqual({ email: "ama@example.bs", firstName: "Ama", lastName: "Rolle" });
  });

  it("still imports when there is no header row, names left blank-ish", async () => {
    const buf = await xlsx([["ama@example.bs"], ["kofi@example.bs"]]);
    const res = await parseRoster("r.xlsx", buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.parse.people.map((p) => p.email)).toEqual(["ama@example.bs", "kofi@example.bs"]);
  });

  it("lowercases and de-duplicates", async () => {
    const buf = await xlsx([["Name", "Email"], ["A", "A@Example.com"], ["A again", "a@example.com"]]);
    const res = await parseRoster("r.xlsx", buf);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.parse.people.map((p) => p.email)).toEqual(["a@example.com"]);
    expect(res.parse.duplicates).toEqual(["a@example.com"]);
  });

  it("reads a CSV with a Name column", async () => {
    const csv = Buffer.from('Name,Email\n"Rolle, Ama",ama@example.bs\nKofi Bain,kofi@example.bs\n');
    const res = await parseRoster("roster.csv", csv);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.parse.people).toEqual([
      { email: "ama@example.bs", firstName: "Ama", lastName: "Rolle" },
      { email: "kofi@example.bs", firstName: "Kofi", lastName: "Bain" },
    ]);
  });

  it("tells you to convert a legacy .xls", async () => {
    const res = await parseRoster("roster.xls", Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toContain("Save As");
  });

  it("says so when a file has no emails at all", async () => {
    const buf = await xlsx([["Name", "Cohort"], ["Ama", "Spring"]]);
    const res = await parseRoster("r.xlsx", buf);
    expect(res.ok).toBe(false);
  });
});
