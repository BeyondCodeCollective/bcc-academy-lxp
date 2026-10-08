import { NextResponse, type NextRequest } from "next/server";
import { requireCapability } from "@/app/dashboard/admin/actions-shared";
import { getProgramId } from "@/lib/programs/server";

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
  rating: number;
  would_recommend: boolean | null;
  enjoyed: string | null;
  improve: string | null;
  submitted_at: string;
  event_registrations: { parent_first_name: string; parent_last_name: string; parent_email: string } | null;
};

// Post-event survey responses for one event. Same gate as the roster.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let svc;
  try {
    ({ svc } = await requireCapability("manage_students"));
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return new NextResponse("Not authorized", { status: 403 });
  }

  const { id } = await ctx.params;
  const programId = await getProgramId();
  const { data: event } = await svc
    .from("events")
    .select("id, slug")
    .eq("id", id)
    .eq("program_id", programId)
    .maybeSingle<{ id: string; slug: string }>();
  if (!event) return new NextResponse("Not found", { status: 404 });

  const { data } = await svc
    .from("event_survey_responses")
    .select("rating, would_recommend, enjoyed, improve, submitted_at, event_registrations(parent_first_name, parent_last_name, parent_email)")
    .eq("event_id", event.id)
    .order("submitted_at", { ascending: true });

  const lines = [
    ["Parent first name", "Parent last name", "Parent email", "Rating (1-5)", "Would recommend", "Enjoyed most", "Could be better", "Submitted at"]
      .map(escapeCsvCell)
      .join(","),
  ];
  for (const r of (data ?? []) as unknown as Row[]) {
    const p = r.event_registrations;
    lines.push(
      [p?.parent_first_name, p?.parent_last_name, p?.parent_email, r.rating, r.would_recommend, r.enjoyed, r.improve, r.submitted_at]
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
