import { notFound } from "next/navigation";
import { getProgram } from "@/lib/programs/server";
import { TextScaleToggle } from "@/components/text-scale-toggle";
import { PublicNetworkPlusSurvey } from "./public-network-plus-survey";

// Public survey route. Outside /dashboard/* so the proxy/middleware does not
// gate it — anyone who lands on catalyst.bccacademy.io/survey/network-plus-post
// can fill it out without logging in. The survey config is sourced from the
// current program (resolved by host header); missing survey IDs 404.

export const dynamic = "force-dynamic";

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await getProgram();
  const survey = (program.surveys ?? []).find((s) => s.id === id);

  if (!survey) notFound();

  // For the initial launch we only have one public survey — the Network+
  // post-survey on Catalyst. Future public surveys will need their own
  // components or a declarative config-driven wizard.
  if (id !== "network-plus-post") notFound();

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex w-full max-w-2xl justify-end px-5 pt-4">
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
      <PublicNetworkPlusSurvey
        surveyId={survey.id}
        programSlug={program.slug}
      />
    </main>
  );
}
