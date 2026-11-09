import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, allowedTrackSlugsForActor } from "@/app/dashboard/admin/actions-shared";
import { toCsv, fileSlug } from "@/lib/csv";
import { loadExitSurveyResults } from "@/lib/exit-survey-results";
import { HOURS_PROMPT, UNCLEAR_PROMPT, UNDERSTANDING_PROMPT } from "@/lib/exit-survey";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let actor;
  try {
    actor = await requireAdmin();
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return new NextResponse("Not authorized", { status: 403 });
  }

  const track = req.nextUrl.searchParams.get("track");
  if (!track) return new NextResponse("Missing track", { status: 400 });
  const allowed = await allowedTrackSlugsForActor(actor, actor.svc);
  if (allowed && !allowed.has(track)) return new NextResponse("Not authorized", { status: 403 });

  const rows = await loadExitSurveyResults(actor.svc, track);
  const csv = toCsv(
    // Anonymous like the results page: no code, name or timestamp per row.
    ["Week", "Session", UNDERSTANDING_PROMPT, UNCLEAR_PROMPT, HOURS_PROMPT],
    rows.map((r) => [
      r.week_number,
      r.session_number,
      r.understanding,
      r.unclear_text,
      r.hours_text,
    ]),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="exit-survey-${fileSlug(track)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
