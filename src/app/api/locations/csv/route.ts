import { NextResponse } from "next/server";
import { requireCapability } from "@/app/dashboard/admin/actions-shared";
import { resolveTrackLengths } from "@/lib/programs/scope";
import { lookupZips, placeFor } from "@/lib/zip-to-city";

// Participant locations as a CSV: one row per hub learner with name, email,
// city, state, ZIP, program, and courses. City/state come from the ZIP the
// learner entered at signup or in a survey (the platform never stores a city
// directly). State is resolved offline by ZIP prefix; city is looked up from a
// public ZIP service and cached per server instance, with the learner's
// free-text "location" as the fallback when there is no ZIP. Same hub scope as
// the Participant Locations page: Catalyst + Beyond the Game + Beyond Code
// Centers. Forte and BGC are standalone and stay out.

export const dynamic = "force-dynamic";

const HUB_SLUGS = ["catalyst", "atg", "beyond-code-centers"];

function csvCell(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

type StudentRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  zip: string | null;
  location: string | null;
  program_id: string;
  role: string | null;
  is_staff: boolean | null;
  is_test: boolean | null;
};

export async function GET() {
  let svc;
  try {
    ({ svc } = await requireCapability("view_insights"));
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    return new NextResponse("Not authorized", { status: 403 });
  }

  const { data: programs } = await svc.from("programs").select("id, slug, name").in("slug", HUB_SLUGS);
  const programName = new Map((programs ?? []).map((p) => [p.id as string, p.name as string]));

  const { data: studentRows } = await svc
    .from("students")
    .select("id, email, first_name, last_name, zip, location, program_id, role, is_staff, is_test")
    .in("program_id", [...programName.keys()]);
  const students = ((studentRows ?? []) as StudentRow[]).filter(
    (s) => !s.is_staff && !s.is_test && (s.role ?? "student") === "student",
  );

  const { data: enrollments } = students.length
    ? await svc.from("student_tracks").select("student_id, track_slug").in("student_id", students.map((s) => s.id))
    : { data: [] as { student_id: string; track_slug: string }[] };
  const slugs = [...new Set(((enrollments ?? []) as { track_slug: string }[]).map((e) => e.track_slug))];
  const names = await resolveTrackLengths(slugs);
  const coursesBy = new Map<string, string[]>();
  for (const e of (enrollments ?? []) as { student_id: string; track_slug: string }[]) {
    coursesBy.set(e.student_id, [...(coursesBy.get(e.student_id) ?? []), names.get(e.track_slug)?.name ?? e.track_slug]);
  }

  const places = await lookupZips(students.map((s) => s.zip));

  const rows = students.map((s) => {
    const { city: zipCity, state } = placeFor(places, s.zip);
    const city = zipCity || (state ? "" : (s.location ?? "").trim());
    return {
      name: [s.first_name, s.last_name].filter(Boolean).join(" ").trim() || s.email,
      email: s.email,
      city,
      state,
      zip: s.zip ?? "",
      program: programName.get(s.program_id) ?? "",
      courses: (coursesBy.get(s.id) ?? []).join("; "),
    };
  });
  rows.sort(
    (a, b) =>
      (a.state || "zz").localeCompare(b.state || "zz") ||
      a.city.localeCompare(b.city) ||
      a.name.localeCompare(b.name),
  );

  const header = ["Name", "Email", "City", "State", "ZIP", "Program", "Courses"];
  const csv = [
    header.join(","),
    ...rows.map((r) => [r.name, r.email, r.city, r.state, r.zip, r.program, r.courses].map(csvCell).join(",")),
  ].join("\n");

  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="participant-locations-${day}.csv"`,
    },
  });
}
