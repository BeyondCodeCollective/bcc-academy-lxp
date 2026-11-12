"use client";

import { useState } from "react";
import { ArrowUpRight, FileText, Link as LinkIcon, Video, PlayCircle } from "@phosphor-icons/react";
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
      <div className="py-3">
        <div className="flex min-h-[36px] items-center gap-3">
          <PlayCircle size={20} aria-hidden className="shrink-0" />
          <span className="min-w-0 flex-1 font-medium leading-snug text-ink">{r.name || r.url}</span>
          {!playing && (
            <button
              type="button"
              onClick={() => {
                log();
                setPlaying(true);
              }}
              className="-my-1 min-h-[44px] shrink-0 text-sm font-medium text-primary underline-offset-[3px] hover:underline"
            >
              Watch here
            </button>
          )}
        </div>
        {r.note && <p className="pl-8 text-[13px] leading-snug text-ink-faint">{r.note}</p>}
        {playing && (
          <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg bg-ink">
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
            className="mt-2 inline-block text-sm font-medium text-primary underline underline-offset-[3px]"
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
      className="group flex min-h-[52px] items-center gap-3 py-2 font-medium text-ink transition-colors hover:text-primary"
    >
      <Icon size={20} aria-hidden className="shrink-0" />
      <span className="min-w-0 flex-1 leading-snug">
        {r.name || r.url}
        {r.note && (
          <span className="block text-[13px] font-normal leading-snug text-ink-faint">{r.note}</span>
        )}
      </span>
      <ArrowUpRight size={16} aria-hidden className="shrink-0 text-ink-faint" />
    </a>
  );
}
