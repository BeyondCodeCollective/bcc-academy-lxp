import Image from "next/image";
import { LearnMoreForm } from "@/components/learn-more-form";
import { HeroVideo } from "@/components/hero-video";

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-true-black px-6">
      {/* BCC hero clip behind everything, with a dark overlay so the logo and
         copy stay legible. bg-true-black is the fallback while the video loads. */}
      <HeroVideo />
      <div className="absolute inset-0 bg-true-black/70" aria-hidden />

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

        <LearnMoreForm />

        {/* Follow-along QR — scans to the (unlisted) BGC × BCC operating-system
           deck. White card so the code reads cleanly against the dark hero.
           Remove this block when the session is over. */}
        <a
          href="/follow/empower-7ee93ad328.html"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-2.5 rounded-2xl bg-white p-5 shadow-2xl transition-transform hover:scale-[1.02]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/follow/qr.svg"
            alt="Scan to follow along"
            width={150}
            height={150}
            className="h-[150px] w-[150px]"
          />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-true-black">
            Scan to follow along
          </span>
        </a>
      </div>
    </div>
  );
}
