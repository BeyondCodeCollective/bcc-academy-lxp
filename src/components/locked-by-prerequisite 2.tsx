import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

/**
 * What a phase looks like before you've earned it.
 *
 * Deliberately not a dead end: the one thing a locked page must do is say
 * exactly what opens it and put that one click on the screen. A lock with no
 * door is how people decide a platform is broken.
 */
export function LockedByPrerequisite({
  trackName,
  requiredSlug,
  requiredName,
}: {
  trackName: string;
  requiredSlug: string;
  requiredName: string;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl py-4">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink transition-colors mb-2 py-2 px-4 sm:px-5"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="rounded-2xl border border-line bg-surface p-8 sm:p-10">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-ink/5 text-ink-soft">
          <Lock size={20} aria-hidden />
        </span>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
          {trackName} opens after {requiredName}
        </h1>

        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          This one builds directly on what you do there, so it stays closed until that
          part is finished. Nothing to request — finish it and this unlocks on its own.
        </p>

        <Link
          href={`/dashboard/track/${requiredSlug}`}
          className="mt-7 inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
        >
          Go to {requiredName}
        </Link>
      </div>
    </div>
  );
}
