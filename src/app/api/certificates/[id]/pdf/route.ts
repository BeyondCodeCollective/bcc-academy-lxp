import { NextResponse } from "next/server";
import { allowedProgramIdsForActor, requireManager } from "@/app/dashboard/admin/actions-shared";
import { loadCertificate } from "@/lib/certificates/data";
import { certificateFileName, renderCertificatePdf } from "@/lib/certificates/pdf";

// The certificate as a PDF, for admins to file or forward. Same scope as the
// Certificates panel: a program admin gets their own programs' certificates.

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let actor;
  try {
    actor = await requireManager();
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return new NextResponse("Not authorized", { status: 403 });
  }

  const { data: row } = await actor.svc
    .from("track_completions")
    .select("program_id")
    .eq("certificate_id", id)
    .maybeSingle<{ program_id: string | null }>();
  const allowed = allowedProgramIdsForActor(actor);
  if (!row || (allowed && (!row.program_id || !allowed.includes(row.program_id)))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const cert = await loadCertificate(id);
  if (!cert) return new NextResponse("Not found", { status: 404 });
  const pdf = await renderCertificatePdf(cert);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${certificateFileName(cert).replace(/"/g, "")}"`,
      "cache-control": "private, no-store",
    },
  });
}
