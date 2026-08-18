"use client";

import { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";

/** Copies a URL to the clipboard; the icon confirms for a beat. */
export function CopyLinkButton({ url, title = "Copy link" }: { url: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard can be unavailable in non-secure contexts; nothing to do.
        }
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-paper-tint hover:text-ink"
    >
      {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
    </button>
  );
}
