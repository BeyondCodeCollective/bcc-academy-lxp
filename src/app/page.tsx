import Link from "next/link";
import { getProgram } from "@/lib/programs/server";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const program = await getProgram();

  if (program.slug === "catalyst") {
    return <CatalystLanding programName={program.name} organization={program.organization} />;
  }

  return (
    <LoginForm
      logo={program.logo}
      programName={program.name}
      tagline={program.tagline}
      taglineColor={program.colors.tagline}
      organization={program.organization}
    />
  );
}

function CatalystLanding({
  programName,
  organization,
}: {
  programName: string;
  organization: string;
}) {
  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-5 pt-20 pb-10 sm:pt-28">
        <p className="text-xs font-medium tracking-wide text-[#E54D2E] uppercase">
          {organization}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900 sm:text-4xl">
          {programName}
        </h1>
        <p className="mt-4 text-base text-neutral-600">
          You just finished CompTIA Network+. Before you move on, we want to
          hear from you — how this program worked (and didn't), what you'd
          change, and what's next.
        </p>
        <p className="mt-3 text-base text-neutral-600">
          It takes about 10 minutes. Your responses shape how we build the next
          cohort and what we offer beyond Network+.
        </p>
        <div className="mt-8">
          <Link
            href="/survey/network-plus-post"
            className="inline-flex items-center justify-center rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2a2a2a]"
          >
            Start the post-survey
          </Link>
        </div>
      </div>
    </main>
  );
}
