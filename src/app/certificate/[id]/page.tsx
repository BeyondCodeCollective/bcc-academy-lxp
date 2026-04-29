import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getProgramBySlug } from "@/lib/programs";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

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

  const program = programRow
    ? getProgramBySlug(programRow.slug)
    : null;

  const trackConfig = program?.tracks.find(
    (t) => t.slug === completion.track_slug
  );
  const trackName = trackConfig?.name ?? completion.track_slug;
  const studentName = student
    ? `${student.first_name} ${student.last_name}`
    : "Student";
  const completedDate = new Date(
    completion.completed_at
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const orgName = program?.organization ?? "Beyond Code Collective";
  const programName = program?.name ?? programRow?.name ?? "BCC Academy";
  const primaryColor = program?.colors.primary ?? "#1a1a1a";

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 print:p-0 print:bg-white">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg print:shadow-none overflow-hidden">
        {/* Header bar */}
        <div
          className="px-8 py-6 text-center"
          style={{ backgroundColor: primaryColor }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-white/70">
            Certificate of Completion
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">
            {programName}
          </h1>
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
                {trackConfig.totalWeeks}-week program ·{" "}
                {trackConfig.instructor}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-100">
            <p className="text-sm text-neutral-600">{completedDate}</p>
          </div>

          <div className="pt-2">
            <p className="text-xs text-neutral-400">{orgName}</p>
            <p className="mt-1 text-[10px] text-neutral-300 font-mono">
              ID: {id}
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
