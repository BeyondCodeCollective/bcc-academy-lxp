import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import { getProgram } from "@/lib/programs/server";
import { PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import { TextScaleToggle } from "@/components/text-scale-toggle";
import { ReadAloudButton } from "@/components/read-aloud-button";
import { PublicNetworkPlusSurvey } from "./public-network-plus-survey";
import { PublicWorkshopSurvey } from "./public-workshop-survey";
import { PublicLearnerIntake } from "./public-learner-intake";

// Public survey route. Outside /dashboard/* so the proxy/middleware does not
// gate it — anyone who lands on catalyst.bccacademy.io/survey/network-plus-post
// can fill it out without logging in.
//
// Survey config is resolved from the current program first, then falls back to
// platform-level public surveys (defined in src/lib/surveys/platform.ts).
//
// Adding a new public survey: register its component in SURVEY_COMPONENTS
// below. If it's program-specific, add its config to the program file. If it's
// platform-wide, add its config to PLATFORM_PUBLIC_SURVEYS.

export const dynamic = "force-dynamic";

type SurveyProps = { surveyId: string; programSlug: string };

const SURVEY_COMPONENTS: Record<string, ComponentType<SurveyProps>> = {
  "network-plus-post": PublicNetworkPlusSurvey,
  "bcc-workshop": PublicWorkshopSurvey,
  "bcc-learner-intake": PublicLearnerIntake,
};

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await getProgram();
  const survey =
    (program.surveys ?? []).find((s) => s.id === id) ??
    PLATFORM_PUBLIC_SURVEYS[id];

  if (!survey) notFound();

  const SurveyComponent = SURVEY_COMPONENTS[id];
  if (!SurveyComponent) notFound();

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-end gap-2 px-5 pt-4">
        <ReadAloudButton label="Read aloud" />
        <TextScaleToggle />
      </div>
      <div className="mx-auto w-full max-w-2xl px-5 pt-6 pb-6">
        <p className="text-xs font-medium tracking-wide text-[#E54D2E] uppercase">
          {program.organization}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900 sm:text-3xl">
          {survey.title}
        </h1>
        <p className="mt-2 text-sm text-neutral-700">{survey.description}</p>
      </div>
      <SurveyComponent surveyId={survey.id} programSlug={program.slug} />
    </main>
  );
}
