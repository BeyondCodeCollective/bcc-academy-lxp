import "server-only";
import React from "react";
import path from "node:path";
import { Document, Page, Text, View, Font, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { mvpExportRecords, type MvpReport } from "./report-export";

// Local bundled fonts avoid network font requests during confidential exports.
Font.register({ family: "MvpReport", fonts: [
  { src: path.join(process.cwd(), "public/fonts/patika/Patika-Regular.otf") },
  { src: path.join(process.cwd(), "public/fonts/patika/Patika-Bold.otf"), fontWeight: 700 },
] });
const styles = StyleSheet.create({
  page: { padding: 40, paddingBottom: 58, fontFamily: "MvpReport", fontSize: 10, color: "#202329", lineHeight: 1.45 },
  brand: { fontSize: 9, color: "#3558b8", marginBottom: 5 },
  title: { fontSize: 23, fontWeight: 700, marginBottom: 16 },
  section: { fontSize: 14, fontWeight: 700, marginTop: 15, marginBottom: 7 },
  row: { borderBottomWidth: 0.5, borderBottomColor: "#e0e3ea", paddingVertical: 7 },
  label: { fontWeight: 700 },
  context: { fontSize: 9, color: "#525965", marginBottom: 3 },
  reason: { fontSize: 9, color: "#525965", marginTop: 3 },
  footer: { position: "absolute", top: 806, left: 40, right: 40, height: 16, fontSize: 8, color: "#525965" },
});

// Vertical metric rows wrap across pages without shrinking a wide spreadsheet.
// Repeat offering context per metric so a page break never loses its scope.
export async function renderMvpPdf(report: MvpReport): Promise<Buffer> {
  const records = mvpExportRecords(report);
  // Fail rather than clip an oversized unbreakable row or exhaust the renderer.
  if (records.length > 5000 || records.some(record => Object.values(record).join(" ").length > 1800)) {
    throw new Error("Report exceeds PDF layout limits; narrow the selection or use CSV.");
  }
  return renderToBuffer(<Document title="MVP Program Performance Report" author="Beyond Code Collective">
    <Page size="A4" style={styles.page} wrap>
      <Text fixed style={styles.footer}>BCC | Internal report</Text>
      <Text style={styles.brand}>BEYOND CODE COLLECTIVE</Text>
      <Text style={styles.title}>Program performance report</Text>
      {records.flatMap((record, index) => [
        ...(records[index - 1]?.section !== record.section ? [<Text key={`heading-${index}`} style={styles.section} minPresenceAhead={100}>{record.section}</Text>] : []),
        <View key={index} style={styles.row} wrap={false}>
          {record.program && <Text style={styles.context}>{record.program} / {record.course}{"\n"}
            {record.start} to {record.end} | Status: {record.status}</Text>}
          <Text><Text style={styles.label}>{record.label}: </Text>{String(record.value)}{record.unit ? ` (${record.unit})` : ""}</Text>
          {record.reason && <Text style={styles.reason}>{record.reason}</Text>}
        </View>,
      ])}
    </Page>
  </Document>);
}
