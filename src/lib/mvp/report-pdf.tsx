import "server-only";
import React from "react";
import path from "node:path";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { mvpExportRecords, type MvpReport } from "./report-export";
import { MvpReportDocument } from "./report-document";

// Local bundled fonts avoid network font requests during confidential exports.
Font.register({ family: "MvpReport", fonts: [
  { src: path.join(process.cwd(), "public/fonts/patika/Patika-Regular.otf") },
  { src: path.join(process.cwd(), "public/fonts/patika/Patika-Bold.otf"), fontWeight: 700 },
] });
export async function renderMvpPdf(report: MvpReport, view: "overview" | "programs" = "overview"): Promise<Buffer> {
  const records = mvpExportRecords(report);
  // Fail rather than clip an oversized unbreakable row or exhaust the renderer.
  if (records.length > 5000 || records.some(record => Object.values(record).join(" ").length > 1800)) {
    throw new Error("Report exceeds PDF layout limits; narrow the selection or use CSV.");
  }
  return renderToBuffer(<MvpReportDocument report={report} view={view} />);
}
