import Image from "next/image";
import { ApexEntry } from "@/components/apex-entry";
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
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-true-black px-6">
      {/* BCC hero clip behind everything (plays on desktop AND mobile), with a
         dark overlay so the logo and copy stay legible. */}
      <HeroVideo />
      <div className="absolute inset-0 bg-true-black/70" aria-hidden />

      <div className="relative z-10 flex w-full max-w-2xl mx-auto flex-1 flex-col items-center justify-center gap-10 py-16">
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

        {/* Pick a path → reveal only the matching form (sign-in or newsletter). */}
        <ApexEntry programs={loginPrograms} />
      </div>

      <footer className="relative z-10 flex flex-col items-center gap-1 pb-6 text-center text-xs text-neutral-400 sm:flex-row sm:justify-center sm:gap-4">
        <p>© 2026 Beyond Code Collective</p>
        <nav className="flex items-center gap-4">
          <a href="/privacy" className="underline-offset-2 hover:text-white hover:underline">
            Privacy
          </a>
          <a href="/terms" className="underline-offset-2 hover:text-white hover:underline">
            Terms
          </a>
        </nav>
      </footer>
    </div>
  );
}
