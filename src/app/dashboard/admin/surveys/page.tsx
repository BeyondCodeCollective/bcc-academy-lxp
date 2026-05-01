import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { canSwitchPrograms } from "@/lib/roles";
import { getBCCSurveyStats } from "../actions";
import { PLATFORM_AUTH_SURVEYS, PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import { getAllPrograms } from "@/lib/programs";
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

  const [stats] = await Promise.all([getBCCSurveyStats()]);

  const platformSurveys = [
    ...Object.values(PLATFORM_AUTH_SURVEYS),
    ...Object.values(PLATFORM_PUBLIC_SURVEYS),
  ].filter(
    (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i, // dedupe bcc-learner-intake
  );

  const allPrograms = getAllPrograms().map((p) => ({ slug: p.slug, name: p.name }));

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-5xl space-y-6 px-5 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#E54D2E] uppercase mb-1">
            Beyond Code Collective
          </p>
          <h1 className="text-2xl font-bold text-neutral-900">Surveys</h1>
        </div>
        <a
          href="/dashboard/admin"
          className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          ← Back to admin
        </a>
      </div>
      <BCCSurveysView
        surveys={platformSurveys}
        stats={stats}
        allPrograms={allPrograms}
      />
    </div>
  );
}
