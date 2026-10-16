import { getMvpReportData } from "@/lib/mvp/report-queries";
import { MvpExportInputError, parseMvpExportRequest, renderMvpCsv } from "@/lib/mvp/report-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const maxBodyBytes = 16_384;

// Bound streamed input too; Content-Length alone is neither required nor trusted.
async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new MvpExportInputError("An export selection is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBodyBytes) {
        await reader.cancel();
        throw new MvpExportInputError("The export request is too large.");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof MvpExportInputError) throw error;
    throw new MvpExportInputError("Provide a valid JSON export selection.");
  } finally { reader.releaseLock(); }
}

// Always reload authorized data. No supplied rows, layout HTML, SQL, or totals
// are accepted. Files are returned directly, not uploaded or saved on the server.
export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return Response.json({ error: "Use application/json." }, { status: 415, headers });
  }
  try {
    const { format, filters, selection } = parseMvpExportRequest(await readBody(request));
    const report = await getMvpReportData(filters, selection);
    const content = format === "csv" ? renderMvpCsv(report)
      : new Uint8Array(await (await import("@/lib/mvp/report-pdf")).renderMvpPdf(report));
    return new Response(content, { headers: { ...headers,
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/pdf",
      "Content-Disposition": `attachment; filename="mvp-report-${new Date().toISOString().slice(0, 10)}.${format}"`,
    } });
  } catch (error) {
    if (error instanceof MvpExportInputError) return Response.json({ error: error.message }, { status: 400, headers });
    if (error instanceof Error && ["MVP access is required.", "The selected program is unavailable.", "The selected course is unavailable."].includes(error.message)) {
      return Response.json({ error: "This report is not available for your account." }, { status: 403, headers });
    }
    return Response.json({ error: "Unable to generate a complete report. Please try again." }, { status: 500, headers });
  }
}
