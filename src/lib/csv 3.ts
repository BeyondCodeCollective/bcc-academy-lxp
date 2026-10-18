// One CSV format for every admin export, so a file opens the same way in
// Excel and Google Sheets wherever it was downloaded from.

export type CsvValue = string | number | boolean | null | undefined;

/** Quote every cell, and defuse text a spreadsheet would run as a formula
 *  (free-text answers starting with = + - @). Plain numbers stay numbers. */
export function csvCell(v: CsvValue): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Rows to CSV text, with a byte-order mark so Excel reads accents and
 *  non-Latin names as UTF-8. */
export function toCsv(header: CsvValue[], rows: CsvValue[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Browser only: save rows as a .csv download. */
export function downloadCsv(fileName: string, header: CsvValue[], rows: CsvValue[][]): void {
  const url = URL.createObjectURL(new Blob([toCsv(header, rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** "Catalyst Labs: Oct 14" → "catalyst-labs-oct-14", for file names. */
export function fileSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
