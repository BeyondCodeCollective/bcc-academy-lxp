import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgramWithOverrides } from "@/lib/programs/server";
import { numberedUnitCount } from "@/lib/programs/unit-display";
import { COHORT_TIME_ZONE } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

// Course-Builder tracks (e.g. comptia-security) live only in the DB, so they
// have no static TrackConfig and thus no `certificateName`. Without this the
// certificate would print the raw slug ("comptia-security"). Keyed by slug →
// the official credential name, with correct trademark capitalization.
const DB_TRACK_CREDENTIAL_NAMES: Record<string, string> = {
  "comptia-security": "CompTIA Security+",
  "comptia-network": "CompTIA Network+",
};

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const svc = createServiceClient();

  const { data: completion } = await svc
    .from("track_completions")
    .select(
      "*, students(first_name, last_name), programs(slug, name)"
    )
    .eq("certificate_id", id)
    .maybeSingle();

  if (!completion) notFound();

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
  // display name — the issuing org is already in the header.
  const trackName =
    trackConfig?.certificateName ??
    trackConfig?.name ??
    DB_TRACK_CREDENTIAL_NAMES[completion.track_slug] ??
    completion.track_slug;
  // A name-less account (bulk invite before name capture) would print a lone
  // space — fall back to "Student" whenever the trimmed name is empty.
  const studentName =
    `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim() || "Student";
  // Pin to the cohort timezone — the server's zone can flip a completion
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
  const orgName = program?.organization ?? "Beyond Code Collective";
  const programName = program?.name ?? programRow?.name ?? "BCC Academy";
  const primaryColor = program?.colors.primary ?? "#1a1a1a";
  // Program length in the track's own unit ("3-day program", "9-week program").
  const unitLower = (trackConfig?.unitLabel || "week").toLowerCase();
  // A placeholder instructor has no place on a credential.
  const instructor =
    trackConfig && !["", "tbd", "tba"].includes(trackConfig.instructor.trim().toLowerCase())
      ? trackConfig.instructor
      : null;

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 print:p-0 print:bg-white">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg print:shadow-none overflow-hidden">
        {/* Header bar — relative so the seal can sit on the seam below it */}
        <div
          className="relative px-8 py-6 text-center"
          style={{ backgroundColor: primaryColor }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-white/70">
            Certificate of Completion
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">
            {programName}
          </h1>

          {/* Official seal — stamped over the header/body seam */}
          <div
            className="absolute -bottom-12 right-6 h-24 w-24 -rotate-6"
            aria-hidden="true"
          >
            <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-sm">
              {/* Scalloped rosette edge */}
              <circle
                cx="60" cy="60" r="54"
                fill="#ffffff"
                stroke={primaryColor}
                strokeWidth="7"
                strokeDasharray="2.4 4.1"
                strokeLinecap="round"
              />
              {/* Solid outer ring */}
              <circle cx="60" cy="60" r="48" fill={primaryColor} />
              {/* Inner hairline ring framing the circular text */}
              <circle
                cx="60" cy="60" r="41"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.75"
              />
              <circle
                cx="60" cy="60" r="27"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.75"
              />
              {/* Circular text between the rings */}
              <path
                id="sealArc"
                d="M 60,60 m -34,0 a 34,34 0 1,1 68,0 a 34,34 0 1,1 -68,0"
                fill="none"
              />
              <text
                fill="#ffffff"
                fontSize="7.8"
                fontWeight="700"
                style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
              >
                {/* textLength pins the text to the arc's exact circumference
                    so it distributes evenly instead of overlapping itself */}
                <textPath href="#sealArc" startOffset="0" textLength="211" lengthAdjust="spacing">
                  OFFICIAL CERTIFICATE ★ VERIFIED ★
                </textPath>
              </text>
              {/* Center: star + year */}
              <path
                d="M 60 40 L 63.5 50.5 L 74.5 50.5 L 65.7 57 L 69 67.5 L 60 61 L 51 67.5 L 54.3 57 L 45.5 50.5 L 56.5 50.5 Z"
                fill="#ffffff"
              />
              <text
                x="60" y="80"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="700"
                letterSpacing="1"
                style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
              >
                {completedYear}
              </text>
            </svg>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-10 text-center space-y-6">
          <div>
            <p className="text-sm text-neutral-500">
              This certifies that
            </p>
            <p className="mt-2 text-3xl font-bold text-neutral-900">
              {studentName}
            </p>
          </div>

          <div>
            <p className="text-sm text-neutral-500">
              has successfully completed
            </p>
            <p className="mt-2 text-xl font-semibold text-neutral-800">
              {trackName}
            </p>
            {trackConfig && (
              <p className="mt-1 text-sm text-neutral-500">
                {numberedUnitCount(trackConfig.weekSummaries, trackConfig.totalWeeks)}-{unitLower} program
                {instructor ? <> · {instructor}</> : null}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-100">
            <p className="text-sm text-neutral-600">{completedDate}</p>
          </div>

          <div className="pt-2">
            <p className="text-xs text-neutral-400">{orgName}</p>
            <p className="mt-1 text-[10px] text-neutral-300 font-mono">
              Verify at bccacademy.io/certificate/{id}
            </p>
          </div>
        </div>

        {/* Print button (hidden in print) */}
        <div className="px-8 pb-6 text-center print:hidden">
          <PrintButton />
        </div>
      </div>
    </div>
  );
}
