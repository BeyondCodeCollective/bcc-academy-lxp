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
    <div className="relative min-h-[100dvh] bg-true-black text-white lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      {/* LEFT — brand panel over the hero video (plays on desktop AND mobile). */}
      <section className="relative flex min-h-[46vh] flex-col justify-between overflow-hidden p-6 sm:p-9 lg:min-h-[100dvh] lg:p-14">
        <HeroVideo />
        {/* Legibility gradient, a cobalt corner wash, and a faint grain feel. */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-true-black via-true-black/60 to-true-black/20"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-tr from-cobalt/30 via-transparent to-transparent"
          aria-hidden
        />

        {/* Wordmark, top-left */}
        <span className="relative z-10 font-display text-2xl font-bold uppercase tracking-tight">
          BCC <span className="text-electric-green">[</span>Academy
          <span className="text-electric-green">]</span>
        </span>

        {/* Statement, anchored bottom-left */}
        <div className="relative z-10 max-w-xl">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.32em] text-electric-green">
            Beyond Code · For Everyone
          </p>
          <h1 className="font-display text-[clamp(3.25rem,9vw,8.5rem)] font-bold uppercase leading-[0.84] tracking-tight">
            Human in
            <br />
            the <span className="text-electric-green">Lead</span>
          </h1>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            A community-based learning ecosystem where every generation builds
            together — from beginners to wisdom learners.
          </p>

          {/* Signature 7 → 77 range device — the intergenerational spectrum. */}
          <div className="mt-8 flex max-w-xs items-center gap-4">
            <span className="font-display text-xl font-bold leading-none text-white">7</span>
            <span className="h-px flex-1 bg-gradient-to-r from-white/30 to-electric-green" aria-hidden />
            <span className="font-display text-xl font-bold leading-none text-electric-green">77</span>
          </div>
          <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.28em] text-white/45">
            every generation · one community
          </p>
        </div>
      </section>

      {/* RIGHT — solid matte entry panel (forms are readable, not floating). */}
      <section className="relative flex flex-col bg-[#121212] lg:border-l lg:border-white/10">
        <div className="flex flex-1 items-center px-6 py-14 sm:px-10 lg:px-16">
          <ApexEntry programs={loginPrograms} />
        </div>
        <footer className="flex flex-col items-center gap-2 px-6 pb-6 text-center text-xs text-white/40 sm:flex-row sm:justify-between sm:px-10 lg:px-16">
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
