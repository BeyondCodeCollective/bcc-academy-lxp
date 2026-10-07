"use client";

/** Downloads the rows on screen as a CSV, for staff who email signups from
 *  their own tools. The page decides which rows (course, session, no
 *  internal tests); this only formats and saves them. */
export function DownloadCsvButton({ fileName, header, rows }: { fileName: string; header: string[]; rows: string[][] }) {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return (
    <button
      type="button"
      onClick={() => {
        const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }}
      className="font-medium text-primary hover:underline"
    >
      Download CSV
    </button>
  );
}
