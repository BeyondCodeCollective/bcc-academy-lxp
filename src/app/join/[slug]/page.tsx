import { notFound } from "next/navigation";
import Link from "next/link";
import { getJoinablePrograms, getProgramBySlug, getTrackBySlug, getHomeProgramForTrack } from "@/lib/programs";
import type { ProgramConfig } from "@/lib/programs";
import { fetchDynamicProgram } from "@/lib/programs/server";
import { JoinForm } from "./join-form";

// Deploy the join page (and its server actions) to both Frankfurt and
// US-East. Vercel routes each request to the nearest region, so users in
// Europe hit a Frankfurt function instead of crossing the Atlantic to
// IAD. Supabase still lives in the US, so the function→DB hop is still
// transatlantic, but we drop the user→function leg (~120ms RTT for an
// EU user) which is the biggest chunk of the slow-signup report from
// Portugal. Auto-falls back to a single region on Hobby plans.
export const preferredRegion = ["fra1", "iad1"];

export function generateStaticParams() {
  return getJoinablePrograms().map((p) => ({ slug: p.slug }));
}

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ track?: string }>;
}) {
  const { slug } = await params;
  const { track: trackParam } = await searchParams;

  const tsSlugSet = new Set(getJoinablePrograms().map((p) => p.slug));
  let program: ProgramConfig;
  if (tsSlugSet.has(slug)) {
    program = getProgramBySlug(slug);
  } else {
    const dynamic = await fetchDynamicProgram(slug);
    if (!dynamic) notFound();
    program = dynamic;
  }
  const track = trackParam ? getTrackBySlug(program, trackParam) : undefined;
  const needsInvite = program.requireInviteLink === true && !track;
  // When a track is selected, label it with its home program (the original
  // config it lives in) rather than whichever program slug the visitor
  // hit. Catalyst spreads tracks from ATG/Forge/Upskill Bahamas, so
  // /join/catalyst?track=ai-literacy used to read "Join Track · Catalyst"
  // when "Upskill Bahamas" is the actual owner.
  const trackHomeProgram = track ? getHomeProgramForTrack(track.slug) : undefined;
  const trackLabelProgram = trackHomeProgram ?? program;

  // Track-aware mode: when a real track is named, lead with what they're
  // actually signing up for instead of the generic program copy.
  const overviewCopy = track
    ? track.description ?? track.weeks[0]?.description ?? ""
    : "";

  const startLabel = track
    ? new Date(track.startDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

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
        <div className="w-full max-w-5xl mx-auto">
          {track ? (
            <div className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:items-start">
              {/* Track hero — left column */}
              <div>
                {/* whitespace-nowrap stops the closing bracket from
                   falling to a second line on narrow phones; tighter
                   tracking on mobile keeps the line fitting at 375px
                   without forcing horizontal scroll. */}
                <p className="mb-2 whitespace-nowrap text-[10px] font-mono uppercase tracking-[0.18em] text-[#E5F701] sm:text-xs sm:tracking-[0.3em]">
                  [ Join Track · {trackLabelProgram.name} ]
                </p>
                <h1 className="mb-3 text-3xl font-bold uppercase leading-[0.95] tracking-tight text-white md:text-5xl font-display">
                  {track.name}
                </h1>
                <p className="text-base text-white/60 md:text-lg">
                  {track.totalWeeks}-week track with {track.instructor}
                  {track.sessionsPerWeek > 1 ? ` · ${track.sessionsPerWeek}×/wk` : ""}
                </p>

                {overviewCopy && (
                  <p className="mt-5 text-[15px] leading-[1.6] text-white/80 max-w-[55ch]">
                    {overviewCopy}
                  </p>
                )}

                {/* Compact weeks preview */}
                {track.weekSummaries.length > 0 && (
                  <div className="mt-8">
                    <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
                      What you&apos;ll cover
                    </p>
                    <ol className="divide-y divide-white/10 border-y border-white/10">
                      {track.weekSummaries.map((ws) => (
                        <li
                          key={ws.week}
                          className="flex items-center gap-3 py-2"
                        >
                          <span className="w-10 shrink-0 text-[11px] font-medium tabular-nums text-white/40">
                            Wk {ws.week}
                          </span>
                          <span className="flex-1 text-[14px] text-white/80">
                            {ws.topic}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {!track.selfPaced && (
                  <p className="mt-6 text-[12px] uppercase tracking-wider text-white/40">
                    Starts {track.startDateTbd ? "TBD" : startLabel}
                  </p>
                )}
              </div>

              {/* Sign-up form — right column */}
              <div className="md:sticky md:top-8">
                <div className="bg-white/5 p-6 md:p-8 ring-1 ring-white/10">
                  <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#E5F701]">
                    [ Step 1 of 1 ]
                  </p>
                  <h2 className="mb-1 text-xl font-bold uppercase tracking-tight text-white font-display">
                    Claim your spot
                  </h2>
                  <p className="mb-6 text-sm text-white/60">
                    Enter your email — we&apos;ll send a sign-in link. No password needed.
                  </p>
                  <JoinForm
                    programSlug={slug}
                    trackSlug={trackParam ?? null}
                    trackName={track.name}
                  />
                </div>
              </div>
            </div>
          ) : (
            // Generic program page (no track param) — kept for the
            // "invite required" pathway. With requireInviteLink: true, this
            // is what a prospect sees if they hit /join/catalyst with no track.
            <div className="max-w-xl">
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
                  <div className="border border-white/10 bg-white/5 p-5">
                    <p className="text-sm leading-relaxed text-white/70">
                      {program.name} is invite-only. You should have received a
                      link from your program coordinator — it looks like:
                    </p>
                    <p className="mt-2 rounded bg-white/5 px-3 py-2 font-mono text-xs text-white/40">
                      bccacademy.io/join/{slug}?track=...
                    </p>
                    <p className="mt-3 text-sm text-white/60">
                      Don&apos;t have one? Reach out to your coordinator or sign
                      up at{" "}
                      <a
                        href="mailto:hello@wearebgc.org"
                        className="text-[#E5F701] hover:underline"
                      >
                        hello@wearebgc.org
                      </a>
                      .
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
                <JoinForm programSlug={slug} trackSlug={null} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
