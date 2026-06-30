import Image from "next/image";
import Link from "next/link";
import { LearnMoreForm } from "@/components/learn-more-form";
import { HeroVideo } from "@/components/hero-video";

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-true-black px-6 py-16">
      {/* BCC hero clip behind everything, with a dark overlay so the logo and
         copy stay legible. bg-true-black is the fallback while the video loads. */}
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

        {/* Two-door fork — visitors self-sort into "student" vs "new" before
           touching any input, so the updates list can't be mistaken for student
           sign-in. Replaces the single email form + redundant sign-in links. */}
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <Link
            href="/login"
            className="group flex flex-col gap-2 rounded-2xl border border-white/20 bg-white/5 p-6 text-left backdrop-blur transition-colors hover:border-electric-green"
          >
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-electric-green">
              I&apos;m a student
            </span>
            <span className="font-display text-lg font-bold text-white">
              Sign in to your dashboard
            </span>
            <span className="mt-1 inline-flex items-center text-sm text-neutral-300 transition-colors group-hover:text-white">
              Continue your courses
              <span className="ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
            </span>
          </Link>

          <Link
            href="/quiz"
            className="group flex flex-col gap-2 rounded-2xl border border-white/20 bg-white/5 p-6 text-left backdrop-blur transition-colors hover:border-electric-green"
          >
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-electric-green">
              I&apos;m new here
            </span>
            <span className="font-display text-lg font-bold text-white">
              Find your path
            </span>
            <span className="mt-1 inline-flex items-center text-sm text-neutral-300 transition-colors group-hover:text-white">
              Take the 2-minute career quiz
              <span className="ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
            </span>
          </Link>
        </div>

        {/* Updates capture, demoted behind a native disclosure so it never
           competes with the two doors. No client JS. */}
        <details className="group w-full max-w-sm text-center">
          <summary className="cursor-pointer list-none text-sm text-neutral-400 transition-colors hover:text-white">
            Not ready to start? {" "}
            <span className="font-semibold text-white group-open:hidden">
              Get program updates &rarr;
            </span>
          </summary>
          <div className="mt-4 flex flex-col items-center">
            <LearnMoreForm />
          </div>
        </details>
      </div>
    </div>
  );
}
