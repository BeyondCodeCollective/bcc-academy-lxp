"use client";

import { useState } from "react";
import { updateOrganizationBrandingAction } from "./actions";
import { uploadLandingImageAction } from "../landing/actions";
import { buttonClass, fieldInput } from "@/components/ui";

/**
 * Inline branding controls for one organization row: accent color + logo.
 * Saves to the programs row; the portal skin picks it up on the next request.
 */
export function OrgBrandingEditor({
  slug,
  initialAccent,
  initialLogoUrl,
}: {
  slug: string;
  initialAccent: string | null;
  initialLogoUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState(initialAccent ?? "#1D59FF");
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-primary hover:underline"
      >
        Branding
      </button>
    );
  }

  async function save() {
    setPending(true);
    setStatus(null);
    try {
      const res = await updateOrganizationBrandingAction(slug, { accent, logoUrl });
      setStatus(
        res.success
          ? { kind: "ok", msg: "Saved" }
          : { kind: "error", msg: res.error ?? "Failed to save." },
      );
      if (res.success) setTimeout(() => setOpen(false), 800);
    } catch {
      setStatus({ kind: "error", msg: "Failed to save." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 w-full space-y-3 rounded-lg border border-rule bg-paper-tint-soft p-3">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#1D59FF"}
          onChange={(e) => setAccent(e.target.value)}
          aria-label="Brand color"
          className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-rule bg-white p-1"
        />
        <input
          type="text"
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          placeholder="#1D59FF"
          aria-label="Brand color hex"
          className={`${fieldInput} font-mono`}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="Logo URL (optional)"
          aria-label="Logo URL"
          className={fieldInput}
        />
        <label className={`${buttonClass("secondary", "sm")} shrink-0 cursor-pointer`}>
          {uploading ? "Uploading…" : "Upload"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploading(true);
              setStatus(null);
              try {
                const fd = new FormData();
                fd.set("file", file);
                const res = await uploadLandingImageAction(fd);
                if (res.success) setLogoUrl(res.url);
                else setStatus({ kind: "error", msg: res.error });
              } catch {
                setStatus({ kind: "error", msg: "Upload failed. Please try again." });
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || uploading}
          className={buttonClass("primary", "sm")}
        >
          {pending ? "Saving…" : "Save branding"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={buttonClass("secondary", "sm")}
        >
          Cancel
        </button>
        {status && (
          <span className={`text-xs ${status.kind === "ok" ? "text-ink-soft" : "text-red-600"}`}>
            {status.msg}
          </span>
        )}
      </div>
    </div>
  );
}
