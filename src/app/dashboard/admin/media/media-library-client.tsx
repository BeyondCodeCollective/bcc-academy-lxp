"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LibraryPhoto } from "@/lib/media-library";
import { buttonClass } from "@/components/ui";
import { uploadLibraryPhotoAction, deleteLibraryPhotoAction } from "./actions";

export function MediaLibraryClient({ photos }: { photos: LibraryPhoto[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  // "3 of 12" while a pack uploads; null when idle.
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setErrors([]);
    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setProgress(`${i + 1} of ${files.length}`);
      const fd = new FormData();
      fd.set("file", files[i]);
      try {
        const res = await uploadLibraryPhotoAction(fd);
        if (!res.success) failed.push(res.error);
      } catch {
        failed.push(`${files[i].name}: upload failed.`);
      }
    }
    setProgress(null);
    setErrors(failed);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          className="sr-only"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={progress !== null}
          onClick={() => inputRef.current?.click()}
          className={buttonClass("primary", "md")}
        >
          {progress ? `Uploading ${progress}…` : "Upload photos"}
        </button>
        <p className="text-xs text-ink-soft">
          JPG, PNG, or WebP · up to 12MB each · captioned automatically
        </p>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      {photos.length === 0 ? (
        <p className="rounded-lg border border-ink/10 bg-surface-muted px-4 py-6 text-center text-sm text-ink-soft">
          No photos yet. Upload a Death to Stock pack to start — the course
          builder picks from here automatically.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <figure
              key={p.id}
              className="group relative overflow-hidden rounded-lg border border-ink/10 bg-surface-muted"
            >
              {/* Plain img: library photos are admin-only thumbnails; the
                  next/image loader would re-optimize hundreds of them for a
                  page one person opens monthly. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.description ?? ""}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              <figcaption className="space-y-1 px-3 py-2">
                <p className="line-clamp-2 text-xs text-ink-soft">
                  {p.description ?? "Not captioned yet"}
                </p>
                {p.tags.length > 0 && (
                  <p className="line-clamp-1 font-mono text-micro text-ink-soft/70">
                    {p.tags.join(" · ")}
                  </p>
                )}
              </figcaption>
              <button
                type="button"
                disabled={deleting === p.id}
                onClick={async () => {
                  setDeleting(p.id);
                  await deleteLibraryPhotoAction(p.id);
                  setDeleting(null);
                  router.refresh();
                }}
                aria-label="Delete photo"
                className="absolute right-2 top-2 hidden rounded-md bg-black/60 px-2 py-1 text-xs text-white transition-colors hover:bg-black/80 group-hover:block"
              >
                {deleting === p.id ? "…" : "Delete"}
              </button>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
