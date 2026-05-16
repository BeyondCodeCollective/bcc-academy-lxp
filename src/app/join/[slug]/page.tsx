import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPrograms, getProgramBySlug } from "@/lib/programs";
import { JoinForm } from "./join-form";

export function generateStaticParams() {
  return getAllPrograms().map((p) => ({ slug: p.slug }));
}

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ track?: string }>;
}) {
  const { slug } = await params;
  const { track } = await searchParams;

  const allSlugs = new Set(getAllPrograms().map((p) => p.slug));
  if (!allSlugs.has(slug)) notFound();

  const program = getProgramBySlug(slug);
  const needsInvite = program.requireInviteLink === true && !track;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#1a1a1a]">
      <header className="flex items-center px-8 py-6 md:px-12 md:py-8">
        <Link
          href="/"
          className="font-display text-sm font-bold uppercase tracking-tight text-white md:text-base"
        >
          BCC{" "}
          <span className="text-[#E5F701]">[</span>Academy
          <span className="text-[#E5F701]">]</span>
        </Link>
      </header>

      <div className="flex flex-1 items-center px-8 pb-12 md:px-12 lg:px-16">
        <div className="w-full max-w-xl">
          <p className="mb-2 text-xs font-mono uppercase tracking-[0.3em] text-[#E5F701]">
            [ Join Program ]
          </p>
          <h1 className="mb-2 text-3xl font-bold uppercase leading-[0.9] tracking-tight text-white md:text-5xl font-display">
            {program.name}
          </h1>
          <p className="mb-8 text-base text-white/60 md:text-lg">
            {program.tagline}
          </p>

          {needsInvite ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                <p className="text-sm leading-relaxed text-white/70">
                  {program.name} requires an invite link to join. Ask your
                  instructor for a link that looks like:
                </p>
                <p className="mt-2 rounded bg-white/5 px-3 py-2 font-mono text-xs text-white/40">
                  bccacademy.io/join/{slug}?track=...
                </p>
              </div>
              <Link
                href="/login"
                className="text-sm text-white/40 transition-colors hover:text-white"
              >
                Already have an account? Sign in
              </Link>
            </div>
          ) : (
            <JoinForm programSlug={slug} trackSlug={track ?? null} />
          )}
        </div>
      </div>
    </div>
  );
}
