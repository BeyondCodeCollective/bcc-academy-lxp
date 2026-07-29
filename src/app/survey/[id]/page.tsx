import { notFound, redirect } from "next/navigation";
import type { ComponentType } from "react";
import { getProgram } from "@/lib/programs/server";
import { getJoinablePrograms } from "@/lib/programs";
import { PLATFORM_PUBLIC_SURVEYS } from "@/lib/surveys/platform";
import { TextScaleToggle } from "@/components/text-scale-toggle";
import { ReadAloudButton } from "@/components/read-aloud-button";
import { PublicNetworkPlusSurvey } from "./public-network-plus-survey";
import { PublicWorkshopSurvey } from "./public-workshop-survey";
import { PublicLearnerIntake } from "./public-learner-intake";
import { PublicPreSurvey } from "./public-pre-survey";
import { PublicPostSurvey } from "./public-post-survey";
import { PublicImpactSurvey } from "./public-impact-survey";

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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const titles: Record<string, string> = {
    "bcc-learner-intake": "Learner Intake Survey",
    "bcc-workshop": "Workshop Feedback",
    "network-plus-post": "CompTIA Network+ End-of-Cohort Survey",
    "pre-survey-spring-2026": "Pre-Program Survey",
    "post-survey-spring-2026": "Post-Program Survey",
    "ai-impact-survey-2026": "Program Impact Survey",
  };
  const title = titles[id] ?? "Survey";
  return {
    title: `${title} — BCC Academy`,
    description: `Complete the ${title.toLowerCase()} for BCC Academy.`,
    openGraph: { title: `${title} — BCC Academy`, description: `Complete the ${title.toLowerCase()}.` },
  };
}

type SurveyProps = { surveyId: string; programSlug: string };

const SURVEY_COMPONENTS: Record<string, ComponentType<SurveyProps>> = {
  "network-plus-post": PublicNetworkPlusSurvey,
  "bcc-workshop": PublicWorkshopSurvey,
  "bcc-learner-intake": PublicLearnerIntake,
  "pre-survey-spring-2026": PublicPreSurvey,
  "post-survey-spring-2026": PublicPostSurvey,
  "ai-impact-survey-2026": PublicImpactSurvey,
};

// post-survey-spring-2026 is retired: it's no longer assigned to a program, so
// its config no longer resolves and the shared link would 404. Send it to the
// instrument that replaced it rather than breaking a URL already in the wild.
const RETIRED_SURVEY_REDIRECTS: Record<string, string> = {
  "post-survey-spring-2026": "ai-impact-survey-2026",
};

// Surveys that MOVED to the authenticated route. #870 shipped the Security+
// midpoint with a public form; #872 consolidated it to one authenticated
// version — correct, since every respondent is an enrolled learner and the
// answer should save against their account rather than re-ask their name. But
// links copied in between now 404, which is what staff hit when they shared it.
// Send them to the real page instead of a dead end; the login gate there
// returns them to the survey afterwards.
const MOVED_TO_AUTHENTICATED: Record<string, string> = {
  "security-plus-midpoint": "/dashboard/survey/security-plus-midpoint",
};

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const replacement = RETIRED_SURVEY_REDIRECTS[id];
  if (replacement) redirect(`/survey/${replacement}`);
  const authRoute = MOVED_TO_AUTHENTICATED[id];
  if (authRoute) redirect(authRoute);
  const program = await getProgram();
  // Resolve from the current program first, then ANY program (so a Catalyst
  // survey link still works on the marketing apex / a different program
  // context), then platform-wide public surveys.
  const survey =
    (program.surveys ?? []).find((s) => s.id === id) ??
    getJoinablePrograms()
      .flatMap((p) => p.surveys ?? [])
      .find((s) => s.id === id) ??
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
        <p className="text-xs font-medium tracking-wide text-primary uppercase">
          {survey.organization ?? program.organization}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
          {survey.title}
        </h1>
        <p className="mt-2 text-sm text-ink">{survey.description}</p>
      </div>
      <SurveyComponent surveyId={survey.id} programSlug={program.slug} />
    </main>
  );
}
