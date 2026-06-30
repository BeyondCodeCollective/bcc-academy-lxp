import Image from "next/image";
import { LearnMoreForm } from "@/components/learn-more-form";
import { CentralLoginForm } from "@/components/central-login-form";
import { HeroVideo } from "@/components/hero-video";
import { getJoinablePrograms } from "@/lib/programs";

export default function HomePage() {
  // Same program list the /login page surfaces on the "No account found" CTA.
  const loginPrograms = getJoinablePrograms()
    .filter((p) => p.tracks.length > 0)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      defaultTrack:
        p.requireInviteLink === true && p.tracks[0] ? p.tracks[0].slug : null,
    }));

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-true-black px-6 py-16">
      {/* BCC hero clip behind everything (plays on desktop AND mobile), with a
         dark overlay so the logo and copy stay legible. */}
      <HeroVideo />
      <div className="absolute inset-0 bg-true-black/70" aria-hidden />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-10">
        <Image
          src="/catalyst/logo.svg"
          alt="BCC Academy"
          width={420}
          height={56}
          priority
          className="w-64 sm:w-80 md:w-[420px]"
        />

        <div className="text-center space-y-3">
          <p className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white uppercase tracking-tight">
            Human in the Lead
          </p>
          <p className="mx-auto max-w-md text-sm sm:text-base text-neutral-300">
            Intergenerational by design — from beginners to wisdom learners,
            everyone builds together.
          </p>
          <p className="font-mono text-sm text-electric-green tracking-[0.25em] uppercase">
            7 → 77
          </p>
        </div>

        {/* Two-door fork — both paths act inline (no redirect): students get a
           sign-in link by email, newcomers subscribe to the newsletter. */}
        <div className="grid w-full gap-4 sm:grid-cols-2 sm:items-stretch">
          {/* Returning students — inline magic-link sign-in */}
          <div className="flex flex-col gap-4 rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-electric-green">
                I&apos;m a student
              </p>
              <p className="mt-1 font-display text-lg font-bold text-white">
                Sign in to your dashboard
              </p>
              <p className="mt-1 text-sm text-neutral-300">
                Pick up right where you left off.
              </p>
            </div>
            <CentralLoginForm compact programs={loginPrograms} />
          </div>

          {/* Newcomers — newsletter signup */}
          <div className="flex flex-col gap-4 rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-electric-green">
                New here?
              </p>
              <p className="mt-1 font-display text-lg font-bold text-white">
                Sign up for our newsletter
              </p>
              <p className="mt-1 text-sm text-neutral-300">
                Programs, events, and ways to get involved.
              </p>
            </div>
            <LearnMoreForm />
          </div>
        </div>
      </div>
    </div>
  );
}
