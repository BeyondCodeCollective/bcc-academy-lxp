"use client";

import { downloadCsv, type CsvValue } from "@/lib/csv";

/** "Download CSV" link for an admin list. The page decides which rows (its
 *  filters, its scope); this only formats and saves them. */
export function DownloadCsvButton({
  fileName,
  header,
  rows,
  className = "font-medium text-primary hover:underline",
}: {
  fileName: string;
  header: CsvValue[];
  rows: CsvValue[][];
  className?: string;
}) {
  return (
    <button type="button" onClick={() => downloadCsv(fileName, header, rows)} className={className}>
      Download CSV
    </button>
  );
}
