import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="mx-auto max-w-md text-center">
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-faint mb-4">
          404
        </p>
        <h1 className="text-2xl font-bold text-ink mb-3">
          Page not found
        </h1>
        <p className="text-sm text-ink-soft mb-6 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-ink-soft"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
