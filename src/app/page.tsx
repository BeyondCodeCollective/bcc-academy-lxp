import Image from "next/image";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-true-black gap-10 px-6">
      <Image
        src="/images/bcc/logos/bcc-stacked-white-official.svg"
        alt="Beyond Code Collective"
        width={400}
        height={400}
        priority
        className="w-64 sm:w-80 md:w-[400px]"
      />

      <div className="text-center space-y-3">
        <p className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white uppercase tracking-tight">
          Human in the Loop
        </p>
        <p className="font-mono text-sm text-electric-green tracking-[0.25em] uppercase">
          7 → 77
        </p>
      </div>
    </div>
  );
}
