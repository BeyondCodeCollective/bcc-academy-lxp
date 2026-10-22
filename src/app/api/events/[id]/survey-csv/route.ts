import { NextResponse, type NextRequest } from "next/server";
import type { SurveyAnswer } from "@/lib/event-survey";
import { requireCapability, allowedProgramIdsForActor } from "@/app/dashboard/admin/actions-shared";

export const dynamic = "force-dynamic";

function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  const str = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

type Row = {
  rating: number | null;
  answers: SurveyAnswer[] | null;
  would_recommend: boolean | null;
  enjoyed: string | null;
  improve: string | null;
  submitted_at: string;
  event_registrations: { parent_first_name: string; parent_last_name: string; parent_email: string } | null;
};

// Post-event survey responses for one event. Same gate as the roster.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let svc;
  let allowedIds: string[] | null;
  try {
    const actor = await requireCapability("manage_students");
    svc = actor.svc;
    allowedIds = allowedProgramIdsForActor(actor);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return new NextResponse("Not authorized", { status: 403 });
  }

  const { id } = await ctx.params;
  const { data: event } = await svc
    .from("events")
    .select("id, slug, program_id")
    .eq("id", id)
    .maybeSingle<{ id: string; slug: string; program_id: string }>();
  if (!event || (allowedIds !== null && !allowedIds.includes(event.program_id))) return new NextResponse("Not found", { status: 404 });

  const { data } = await svc
    .from("event_survey_responses")
    .select("rating, answers, would_recommend, enjoyed, improve, submitted_at, event_registrations(parent_first_name, parent_last_name, parent_email)")
    .eq("event_id", event.id)
    .order("submitted_at", { ascending: true });

  // Custom surveys add one column per question prompt, after the default four.
  const rowsData = (data ?? []) as unknown as Row[];
  const prompts = [...new Set(rowsData.flatMap((r) => (r.answers ?? []).map((a) => a.prompt)))];
  const lines = [
    ["Parent first name", "Parent last name", "Parent email", "Rating (1-5)", "Would recommend", "Enjoyed most", "Could be better", ...prompts, "Submitted at"]
      .map(escapeCsvCell)
      .join(","),
  ];
  for (const r of rowsData) {
    const p = r.event_registrations;
    const byPrompt = new Map((r.answers ?? []).map((a) => [a.prompt, a.value]));
    lines.push(
      [p?.parent_first_name, p?.parent_last_name, p?.parent_email, r.rating, r.would_recommend, r.enjoyed, r.improve, ...prompts.map((q) => byPrompt.get(q)), r.submitted_at]
        .map(escapeCsvCell)
        .join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-survey.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
