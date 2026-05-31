"use client";

import { useState } from "react";

/**
 * Admin-only convenience: shows on the track overview so an admin viewing
 * a track can copy that track's signup URL without going back to the admin
 * panel. The URL pattern is `/join/{programSlug}?track={trackSlug}`; the
 * auth callback auto-enrolls new signups in just that track.
 */
export function CopyInviteLink({
  programSlug,
  trackSlug,
  fallbackDomain,
}: {
  programSlug: string;
  trackSlug: string;
  /** Domain used server-side; client-side we prefer window.location.origin. */
  fallbackDomain: string;
}) {
  const [copied, setCopied] = useState(false);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : `https://${fallbackDomain}`;
  const url = `${baseUrl}/join/${programSlug}?track=${trackSlug}`;

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard API can fail in non-secure contexts.
        }
      }}
      title={url}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        copied
          ? "border-green-300 bg-green-50 text-green-700"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
      }`}
    >
      {copied ? <span aria-hidden>✓</span> : <span aria-hidden>🔗</span>}
      {copied ? "Copied invite link" : "Copy invite link"}
    </button>
  );
}
