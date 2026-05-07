import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { canSwitchPrograms } from "@/lib/roles";
import { getDashboardSurveyStats } from "../actions";
import { PLATFORM_AUTH_SURVEYS, PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import { getAllPrograms } from "@/lib/programs";
import type { SurveyConfig } from "@/lib/programs/types";
import { BCCSurveysView } from "./bcc-surveys-view";

export default async function BCCSurveysPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect("/");

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (!canSwitchPrograms(student?.role ?? "student")) redirect("/dashboard/admin");

  const stats = await getDashboardSurveyStats();

  // Collect every survey config — platform-level plus program-specific —
  // then dedupe by id so the dashboard list shows ATG mid-program, Forge
  // pre-survey, etc., not just the BCC platform surveys.
  const programSurveys: SurveyConfig[] = getAllPrograms().flatMap(
    (p) => p.surveys ?? [],
  );
  const allSurveysById = new Map<string, SurveyConfig>();
  for (const s of [
    ...Object.values(PLATFORM_AUTH_SURVEYS),
    ...Object.values(PLATFORM_PUBLIC_SURVEYS),
    ...programSurveys,
  ]) {
    if (!allSurveysById.has(s.id)) allSurveysById.set(s.id, s);
  }
  const surveys = Array.from(allSurveysById.values()).filter((s) =>
    stats.some((r) => r.survey_type === s.id),
  );

  const allPrograms = getAllPrograms().map((p) => ({ slug: p.slug, name: p.name }));

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl space-y-6 px-5 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#E54D2E] uppercase mb-1">
            Beyond Code Collective
          </p>
          <h1 className="text-2xl font-bold text-neutral-900">Surveys</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/admin/surveys/all"
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 transition-colors"
          >
            All-surveys overview
          </Link>
          <Link
            href="/dashboard/admin"
            className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            ← Back to admin
          </Link>
        </div>
      </div>
      <BCCSurveysView
        surveys={surveys}
        stats={stats}
        allPrograms={allPrograms}
      />
    </div>
  );
}
