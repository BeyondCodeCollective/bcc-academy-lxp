"use client";

import { useState } from "react";
import { Link as LinkIcon, Check } from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui";

/** Copies the event's public registration URL on the current origin. */
export function CopyEventLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={`${buttonClass("secondary", "sm")} ml-2 align-middle`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${path}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard API can fail in non-secure contexts.
        }
      }}
    >
      {copied ? <Check size={12} weight="bold" /> : <LinkIcon size={12} weight="bold" />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
