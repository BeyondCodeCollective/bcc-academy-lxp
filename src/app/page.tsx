import Image from "next/image";
import Link from "next/link";
import { LearnMoreForm } from "@/components/learn-more-form";
import { HeroVideo } from "@/components/hero-video";

export default function HomePage() {
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

        {/* Two-door fork — students sign in, newcomers subscribe. Each path has
           its own clearly-labeled action, so the newsletter form can't be
           mistaken for student sign-in. */}
        <div className="grid w-full gap-4 sm:grid-cols-2 sm:items-stretch">
          {/* Returning students */}
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
            <ul className="space-y-2.5 text-sm text-neutral-300">
              {[
                "Your courses & progress",
                "Live sessions & office hours",
                "Certificates & resources",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-electric-green" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="mt-auto inline-flex w-full items-center justify-center bg-electric-green px-4 py-3 text-sm font-bold uppercase tracking-wide text-true-black transition-opacity hover:opacity-90"
            >
              Sign in &rarr;
            </Link>
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
