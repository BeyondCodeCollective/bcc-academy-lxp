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
    <div className="relative min-h-[100dvh] bg-true-black text-white lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* LEFT — brand panel over the hero video (plays on desktop AND mobile). */}
      <section className="relative flex min-h-[44vh] flex-col justify-between overflow-hidden p-6 sm:p-9 lg:min-h-[100dvh] lg:p-12">
        <HeroVideo />
        {/* Legibility gradient + a subtle cobalt brand wash. */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-true-black via-true-black/60 to-true-black/25"
          aria-hidden
        />
        <div className="absolute inset-0 bg-cobalt/[0.08]" aria-hidden />

        {/* Wordmark, top-left */}
        <span className="relative z-10 font-display text-2xl font-bold uppercase tracking-tight">
          BCC <span className="text-electric-green">[</span>Academy
          <span className="text-electric-green">]</span>
        </span>

        {/* Statement, anchored bottom-left */}
        <div className="relative z-10 max-w-xl">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-electric-green">
            [ Beyond Code · For Everyone ]
          </p>
          <h1 className="font-display text-5xl font-bold uppercase leading-[0.88] tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
            Human in
            <br />
            the Lead
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            Intergenerational by design — from beginners to wisdom learners,
            everyone builds together.
          </p>
          <p className="mt-4 font-mono text-sm uppercase tracking-[0.3em] text-electric-green">
            7 → 77
          </p>
        </div>
      </section>

      {/* RIGHT — solid matte entry panel (forms are readable, not floating). */}
      <section className="relative flex flex-col bg-[#121212] lg:border-l lg:border-white/10">
        <div className="flex flex-1 items-center px-6 py-12 sm:px-10 lg:px-14">
          <ApexEntry programs={loginPrograms} />
        </div>
        <footer className="flex flex-col items-center gap-2 px-6 pb-6 text-center text-xs text-white/40 sm:flex-row sm:justify-between sm:px-10 lg:px-14">
          <p>© 2026 Beyond Code Collective</p>
          <nav className="flex items-center gap-4">
            <a href="/privacy" className="underline-offset-2 transition-colors hover:text-white hover:underline">
              Privacy
            </a>
            <a href="/terms" className="underline-offset-2 transition-colors hover:text-white hover:underline">
              Terms
            </a>
          </nav>
        </footer>
      </section>
    </div>
  );
}
