import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { numberedUnitCount } from "@/lib/programs/unit-display";
import { COHORT_TIME_ZONE } from "@/lib/utils";

// Course-Builder tracks (e.g. comptia-security) live only in the DB, so they
// have no static TrackConfig and thus no `certificateName`. Without this the
// certificate would print the raw slug ("comptia-security"). Keyed by slug to
// the official credential name, with correct trademark capitalization.
const DB_TRACK_CREDENTIAL_NAMES: Record<string, string> = {
  "comptia-security": "CompTIA Security+",
  "comptia-network": "CompTIA Network+",
};

export type CertificateData = {
  id: string;
  studentName: string;
  trackName: string;
  /** "10-week program · Ashley Morgan"; null when the track has no config. */
  programLine: string | null;
  programName: string;
  orgName: string;
  primaryColor: string;
  completedDate: string;
  completedYear: string;
};

/** Everything a certificate prints, shared by the public page and the PDF. */
export async function loadCertificate(id: string): Promise<CertificateData | null> {
  const svc = createServiceClient();
  const { data: completion } = await svc
    .from("track_completions")
    .select(
      "*, students(first_name, last_name), programs(slug, name)"
    )
    .eq("certificate_id", id)
    .maybeSingle();

  if (!completion) return null;

  const student = completion.students as {
    first_name: string;
    last_name: string;
  } | null;
  const programRow = completion.programs as {
    slug: string;
    name: string;
  } | null;
  // Overrides included so builder-created courses (their only record is a
  // track_overrides row) print their real name instead of the raw slug.
  const program = programRow
    ? await getProgramWithOverrides(programRow.slug)
    : null;
  const trackConfig = program?.tracks.find(
    (t) => t.slug === completion.track_slug
  );

  // Certificates print the credential name, not the partnership-branded
  // display name: the issuing org is already in the header.
  const trackName =
    trackConfig?.certificateName ??
    trackConfig?.name ??
    DB_TRACK_CREDENTIAL_NAMES[completion.track_slug] ??
    completion.track_slug;
  // A name-less account (bulk invite before name capture) would print a lone
  // space, so fall back to "Student" whenever the trimmed name is empty.
  const studentName =
    `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim() || "Student";

  // Pin to the cohort timezone: the server's zone can flip a completion
  // recorded near midnight to the wrong calendar day.
  const completedDate = new Date(
    completion.completed_at
  ).toLocaleDateString("en-US", {
    timeZone: COHORT_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const completedYear = new Date(completion.completed_at).toLocaleDateString(
    "en-US",
    { timeZone: COHORT_TIME_ZONE, year: "numeric" },
  );

  // Program length in the track's own unit ("3-day program", "9-week program").
  const unitLower = (trackConfig?.unitLabel || "week").toLowerCase();
  // A placeholder instructor has no place on a credential.
  const instructor =
    trackConfig && !["", "tbd", "tba"].includes(trackConfig.instructor.trim().toLowerCase())
      ? trackConfig.instructor
      : null;
  const programLine = trackConfig
    ? `${numberedUnitCount(trackConfig.weekSummaries, trackConfig.totalWeeks)}-${unitLower} program` +
      (instructor ? ` · ${instructor}` : "")
    : null;

  return {
    id,
    studentName,
    trackName,
    programLine,
    programName: program?.name ?? programRow?.name ?? "BCC Academy",
    orgName: program?.organization ?? "Beyond Code Collective",
    primaryColor: program?.colors.primary ?? "#1a1a1a",
    completedDate,
    completedYear,
  };
}
