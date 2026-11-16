import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, allowedTrackSlugsForActor } from "@/app/dashboard/admin/actions-shared";
import { getAllSubmissions } from "@/app/dashboard/admin/actions-misc";
import { toCsv, fileSlug } from "@/lib/csv";
import { getProgramBySlug, getTrackBySlug } from "@/lib/programs";

export const dynamic = "force-dynamic";

function isRedirect(e: unknown): boolean {
  return !!e && typeof e === "object" && "digest" in e &&
    String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}

export async function GET(req: NextRequest) {
  let actor;
  try {
    actor = await requireAdmin();
  } catch (e) {
    if (isRedirect(e)) throw e;
    return new NextResponse("Not authorized", { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const program = params.get("program");
  if (!program) return new NextResponse("Missing program", { status: 400 });
  const track = params.get("track") || undefined;
  const weekParam = params.get("week");
  const week = weekParam ? Number(weekParam) : null;
  if (week !== null && !Number.isInteger(week)) {
    return new NextResponse("Bad week", { status: 400 });
  }

  const allowed = await allowedTrackSlugsForActor(actor, actor.svc);
  if (track && allowed && !allowed.has(track)) {
    return new NextResponse("Not authorized", { status: 403 });
  }

  let rows;
  try {
    // Same program-scoped query the Submissions tab renders from.
    rows = await getAllSubmissions(program, track);
  } catch (e) {
    if (isRedirect(e)) throw e;
    return new NextResponse("Not authorized", { status: 403 });
  }
  rows = rows.filter(
    (r) => (!allowed || allowed.has(r.track_slug)) && (week === null || r.week_number === week),
  );

  // Course names: DB record first, legacy TS config second, slug last.
  const slugs = [...new Set(rows.map((r) => r.track_slug))];
  const { data: overrides } = slugs.length
    ? await actor.svc.from("track_overrides").select("track_slug, name").in("track_slug", slugs)
    : { data: [] };
  const nameBySlug = new Map(
    ((overrides ?? []) as { track_slug: string; name: string | null }[])
      .filter((o) => o.name)
      .map((o) => [o.track_slug, o.name as string]),
  );
  const tsProgram = getProgramBySlug(program);
  const courseName = (slug: string) =>
    nameBySlug.get(slug) ?? getTrackBySlug(tsProgram, slug)?.name ?? slug;

  const csv = toCsv(
    ["Learner", "Email", "Course", "Week", "Description", "Prompt responses", "Submitted"],
    rows.map((r) => [
      r.student_name,
      r.student_email,
      courseName(r.track_slug),
      r.week_number,
      r.description,
      Object.entries(r.prompt_responses).map(([q, a]) => `${q}: ${a}`).join("\n\n"),
      r.submitted_at ? r.submitted_at.slice(0, 10) : "",
    ]),
  );
  const name = ["submissions", track ?? program, week !== null ? `week-${week}` : null]
    .filter(Boolean)
    .join("-");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileSlug(name)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
