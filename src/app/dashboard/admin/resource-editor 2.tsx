"use client";

import { useState, useRef } from "react";
import type { SessionResource } from "./actions";
import { Plus, X, Link as LinkIcon, UploadSimple as Upload, CircleNotch as Loader2, FileText } from "@phosphor-icons/react";
import { buttonClass, fieldInput } from "@/components/ui";
import { isStorageUrl } from "@/lib/storage-utils";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

// ─── Upload Button (generic) ────────────────────────────────────────────────

export type UploadState = "idle" | "uploading" | "error";
export function UploadButton({
  track,
  week,
  accept,
  label,
  icon: Icon,
  onUploaded,
}: {
  track: string;
  week: number;
  accept: string;
  label: string;
  icon: typeof Upload;
  onUploaded: (result: { url: string; name: string }) => void;
}) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadState("uploading");
    setErrorMsg("");

    try {
      const supabase = createBrowserClient();
      const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
      const storagePath = `${track}/${week}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("session-files")
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/session-files/${storagePath}`;

      onUploaded({ url: publicUrl, name: file.name });
      setUploadState("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
      setUploadState("error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={uploadState === "uploading"}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploadState === "uploading"}
        className={`${buttonClass("secondary", "sm")} min-h-[36px]`}
      >
        {uploadState === "uploading" ? (
          <><Loader2 size={11} className="animate-spin" /> Uploading…</>
        ) : (
          <><Icon size={11} /> {label}</>
        )}
      </button>
      {uploadState === "error" && (
        <p className="text-micro text-red-500">{errorMsg}</p>
      )}
    </div>
  );
}
export const FILE_ACCEPT = ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.mp4,.mov,.webm,.zip";
export const VIDEO_ACCEPT = ".mp4,.mov,.webm,.avi,.mkv";
// ─── Resource Editor ──────────────────────────────────────────────────────────

export function ResourceEditor({
  resources,
  track,
  week,
  onChange,
}: {
  resources: SessionResource[];
  track: string;
  week: number;
  onChange: (updated: SessionResource[]) => void;
}) {
  function addLink() {
    onChange([...resources, { name: "", url: "", type: "link" }]);
  }

  function updateResource(index: number, field: keyof SessionResource, value: string) {
    onChange(resources.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function removeResource(index: number) {
    onChange(resources.filter((_, i) => i !== index));
  }

  function handleFileUploaded({ url, name }: { url: string; name: string }) {
    onChange([...resources, { name, url, type: "file" as const }]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-xs font-medium text-ink-soft">Resources</label>
        <div className="flex items-center gap-1.5">
          <UploadButton accept={FILE_ACCEPT} label="Upload File" icon={Upload} track={track} week={week} onUploaded={handleFileUploaded} />
          <button
            type="button"
            onClick={addLink}
            className={`${buttonClass("secondary", "sm")} min-h-[36px]`}
          >
            <Plus size={11} />
            Add Link
          </button>
        </div>
      </div>

      {resources.length === 0 && (
        <p className="text-micro text-ink-faint pl-0.5">No resources yet</p>
      )}

      {resources.map((r, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="mt-2 shrink-0">
            {r.type === "file" || isStorageUrl(r.url) ? (
              <FileText size={12} className="text-ink-faint" />
            ) : (
              <LinkIcon size={12} className="text-ink-faint" />
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={r.name}
              onChange={(e) => updateResource(i, "name", e.target.value)}
              placeholder="Display name"
              className={fieldInput}
            />
            {r.type === "file" || isStorageUrl(r.url) ? (
              <div className="border border-rule-soft bg-muted-bg px-3 py-2 text-xs text-ink-faint truncate">
                {r.url.split("/").pop() ?? r.url}
              </div>
            ) : (
              <input
                type="url"
                value={r.url}
                onChange={(e) => updateResource(i, "url", e.target.value)}
                placeholder="https://..."
                className={fieldInput}
              />
            )}
          </div>

          <button
            type="button"
            onClick={() => removeResource(i)}
            className="mt-2 text-ink-faint hover:text-red-400 transition-colors shrink-0"
            title="Remove resource"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
