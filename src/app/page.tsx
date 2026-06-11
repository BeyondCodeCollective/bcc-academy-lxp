import Image from "next/image";
import { LearnMoreForm } from "@/components/learn-more-form";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-true-black gap-10 px-6">
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
        <p className="mx-auto max-w-md text-sm sm:text-base text-neutral-400">
          Intergenerational by design — from beginners to wisdom learners,
          everyone builds together.
        </p>
        <p className="font-mono text-sm text-electric-green tracking-[0.25em] uppercase">
          7 → 77
        </p>
      </div>

      <LearnMoreForm />
    </div>
  );
}
