"use client";

import { useState } from "react";
import { FileText, Link as LinkIcon, Video, PlayCircle } from "@phosphor-icons/react";
import { logResourceOpen } from "@/app/dashboard/track/actions";
import { getResourceEmbedUrl, isStorageUrl, isUploadedVideo } from "@/lib/storage-utils";
import type { SessionResource } from "@/app/dashboard/admin/actions";

/** One resource on the week page. Logs an open when the learner clicks (or
 *  loads an inline embed) so staff can see who got through each module. The
 *  log is fire-and-forget: it never delays or blocks opening the resource. */
export function ResourceLink({
  resource: r,
  trackSlug,
  weekNum,
}: {
  resource: SessionResource;
  trackSlug: string;
  weekNum: number;
}) {
  const [playing, setPlaying] = useState(false);
  const isFile = r.type === "file" || isStorageUrl(r.url);
  const isVid = isUploadedVideo(r);
  const Icon = isVid ? Video : isFile ? FileText : LinkIcon;
  const embedUrl = r.embed ? getResourceEmbedUrl(r.url) : null;
  const log = () => void logResourceOpen(trackSlug, weekNum, r.url, r.name || r.url);

  if (embedUrl) {
    return (
      <div className="panel px-4 py-4 text-sm sm:col-span-2">
        <div className="flex items-center gap-4">
          <PlayCircle size={22} aria-hidden className="shrink-0 text-ink-faint" />
          <span className="flex-1 font-semibold leading-snug text-ink">{r.name || r.url}</span>
          {!playing && (
            <button
              type="button"
              onClick={() => {
                log();
                setPlaying(true);
              }}
              className="shrink-0 text-xs font-bold uppercase tracking-wide text-primary"
            >
              Watch here
            </button>
          )}
        </div>
        {r.note && <p className="mt-2 pl-[38px] text-sm text-ink-soft">{r.note}</p>}
        {playing && (
          <div className="mt-3 aspect-video w-full overflow-hidden">
            <iframe
              src={embedUrl}
              title={r.name || "Video"}
              className="h-full w-full"
              allow="accelerometer; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {playing && (
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block pl-[38px] text-xs font-semibold text-primary underline"
          >
            Open on YouTube
          </a>
        )}
      </div>
    );
  }

  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      download={isFile ? (r.name || true) : undefined}
      onClick={log}
      className="group flex min-h-[60px] items-center gap-4 panel px-4 py-4 text-sm font-semibold text-ink transition-colors hover:border-primary hover:bg-paper-tint-soft"
    >
      <Icon
        size={22}
        aria-hidden
        className="shrink-0 text-ink-faint transition-colors group-hover:text-ink-soft"
      />
      <span className="flex-1 leading-snug">
        {r.name || r.url}
        {r.note && <span className="mt-1 block text-xs font-normal text-ink-soft">{r.note}</span>}
      </span>
      <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-primary opacity-0 transition-opacity group-hover:opacity-100">
        {isFile ? "Download" : "Open"}
      </span>
    </a>
  );
}
