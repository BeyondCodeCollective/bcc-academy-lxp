import { describe, expect, it } from "vitest";
import { csvCell, fileSlug, toCsv } from "./csv";

describe("csv", () => {
  it("quotes every cell and doubles quotes", () => {
    expect(csvCell('Smith, "Jo"')).toBe('"Smith, ""Jo"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(42)).toBe('"42"');
  });

  it("defuses formulas but keeps negative numbers", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell("@cmd")).toBe(`"'@cmd"`);
    expect(csvCell("+1 555")).toBe(`"'+1 555"`);
    expect(csvCell("-3.5")).toBe('"-3.5"');
  });

  it("writes a BOM and CRLF rows", () => {
    expect(toCsv(["A", "B"], [["1", "x"]])).toBe('﻿"A","B"\r\n"1","x"\r\n');
  });

  it("slugs file names", () => {
    expect(fileSlug("Catalyst Labs: Oct 14")).toBe("catalyst-labs-oct-14");
  });
});
