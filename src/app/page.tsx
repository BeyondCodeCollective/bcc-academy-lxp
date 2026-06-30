import Image from "next/image";
import Link from "next/link";
import { LearnMoreForm } from "@/components/learn-more-form";
import { HeroVideo } from "@/components/hero-video";

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-true-black px-6">
      {/* BCC hero clip behind everything, with a dark overlay so the logo and
         copy stay legible. bg-true-black is the fallback while the video loads. */}
      <HeroVideo />
      <div className="absolute inset-0 bg-true-black/70" aria-hidden />

      {/* Sign in — so people can just go to bccacademy.io and get into the
         portal without needing to know the /login URL. */}
      <Link
        href="/login"
        className="absolute right-5 top-5 z-20 inline-flex items-center rounded-full border border-white/25 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:border-electric-green hover:text-electric-green sm:right-6 sm:top-6"
      >
        Sign in
      </Link>

      <div className="relative z-10 flex flex-col items-center gap-10">
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

        {/* Updates capture for prospects — NOT account creation. The "Keep me
           posted" framing + heading keep visitors from mistaking it for student
           sign-in (which lives in the explicit link below + the top-right pill). */}
        <div className="flex w-full max-w-sm flex-col items-center gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">
            New here? Get program updates
          </p>
          <LearnMoreForm />
        </div>

        <p className="text-sm text-neutral-400">
          Already a student?{" "}
          <Link
            href="/login"
            className="font-semibold text-white underline-offset-4 transition-colors hover:text-electric-green hover:underline"
          >
            Sign in &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
}
