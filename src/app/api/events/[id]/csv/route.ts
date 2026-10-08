import { NextResponse, type NextRequest } from "next/server";
import { requireCapability } from "@/app/dashboard/admin/actions-shared";
import { getProgramId } from "@/lib/programs/server";

export const dynamic = "force-dynamic";

function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const COLUMNS: [string, string][] = [
  ["Attendee first name", "first_name"],
  ["Attendee last name", "last_name"],
  ["Date of birth", "date_of_birth"],
  ["Grade", "grade"],
  ["School", "school_name"],
  ["School type", "school_type"],
  ["Gender", "gender"],
  ["Race / ethnicity", "race_ethnicity"],
  ["T-shirt size", "tshirt_size"],
  ["Allergies", "allergies"],
  ["Emergency contact", "emergency_contact_name"],
  ["Emergency phone", "emergency_contact_phone"],
  ["Coding experience", "experience_level"],
  ["Eligibility", "eligibility"],
  ["Ticket", "ticket_code"],
  ["Status", "status"],
  ["Registered at", "created_at"],
];
const PARENT_COLUMNS: [string, string][] = [
  ["Parent first name", "parent_first_name"],
  ["Parent last name", "parent_last_name"],
  ["Parent email", "parent_email"],
  ["Parent phone", "parent_phone"],
  ["City, state", "city_state"],
  ["Zip", "zip"],
];

// Full roster export for one event: every attendee field plus the parent's
// contact on each row. Same gate as the roster page (manage_students).
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

  const { data: attendees } = await svc
    .from("event_attendees")
    .select(
      `${COLUMNS.map(([, k]) => k).join(", ")}, event_registrations(${PARENT_COLUMNS.map(([, k]) => k).join(", ")})`,
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: true });

  const header = [...PARENT_COLUMNS, ...COLUMNS].map(([label]) => label);
  const lines = [header.map(escapeCsvCell).join(",")];
  for (const row of (attendees ?? []) as unknown as Record<string, unknown>[]) {
    const parent = (row.event_registrations ?? {}) as Record<string, unknown>;
    lines.push(
      [
        ...PARENT_COLUMNS.map(([, k]) => escapeCsvCell(parent[k])),
        ...COLUMNS.map(([, k]) => escapeCsvCell(row[k])),
      ].join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-roster.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
