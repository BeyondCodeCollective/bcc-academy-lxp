import type { ReactNode } from "react";

/**
 * Temporary placeholder for features that are discoverable (nav, search) but
 * not yet live. Renders inside the dashboard shell. White-forward, skin-aware.
 */
export function ComingSoon({
  title,
  message,
  icon,
}: {
  title: string;
  message?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16">
      <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
        {icon && <div className="text-ink-faint" aria-hidden>{icon}</div>}
        <span className="rounded-full bg-primary/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          Coming soon
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {message && (
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft">{message}</p>
        )}
      </div>
    </div>
  );
}
