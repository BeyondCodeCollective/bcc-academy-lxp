import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";

export const dynamic = "force-dynamic";

// Internal presentation page: the platform architecture as an explorable
// isometric atlas (structures, chapters, data flows). Like /platform-map it
// enumerates internal systems — including table names and open questions —
// so it's a signed-in staff surface. Standalone self-contained HTML generated
// from 2nd-brain/output/lxp/atlas/data.mjs; regenerate there and re-copy
// rather than editing atlas.html by hand.
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx || !canAccessAdminPanel(ctx.student?.role ?? "")) {
    redirect("/login");
  }
  const html = await readFile(
    path.join(process.cwd(), "src/app/platform-atlas/atlas.html"),
    "utf8",
  );
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}
