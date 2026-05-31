"use client";

import { useState } from "react";
import { MarkVideoWatchedButton } from "@/components/mark-video-watched-button";
import {
  getYouTubeEmbedUrl,
  isUploadedRecording,
  toVideoProxyUrl,
} from "@/lib/storage-utils";
import { toDriveEmbedUrl } from "@/lib/lunch-learns/drive";

type Props = {
  url: string;
  title: string;
  subtitle?: string;
  trackSlug: string;
  weekNumber: number;
  showWatchButton: boolean;
  initialWatched: boolean;
};

export function RecordingCard({
  url,
  title,
  subtitle,
  trackSlug,
  weekNumber,
  showWatchButton,
  initialWatched,
}: Props) {
  const [open, setOpen] = useState(false);

  const youtubeEmbed = getYouTubeEmbedUrl(url);
  const driveEmbed = toDriveEmbedUrl(url);
  const isVideoFile = isUploadedRecording(url);
  const canEmbed = !!(youtubeEmbed || driveEmbed || isVideoFile);

  return (
    <div className="mb-4 overflow-hidden border border-rule bg-surface-elevated">
      {/* Header row — always visible, click to toggle player */}
      <button
        onClick={() => canEmbed && setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 min-h-[52px] transition-colors ${canEmbed ? "hover:bg-neutral-50 cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900">
            <span className="text-white ml-0.5 text-sm">▶</span>
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-neutral-900 truncate">{title}</p>
            {subtitle && <p className="text-xs text-neutral-500 truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {showWatchButton && (
            <span onClick={(e) => e.stopPropagation()}>
              <MarkVideoWatchedButton
                trackSlug={trackSlug}
                weekNumber={weekNumber}
                initialWatched={initialWatched}
              />
            </span>
          )}
          {canEmbed && (
            <span className="text-xs text-neutral-400 font-medium">
              {open ? "Hide" : "Play"}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-rule">
          {youtubeEmbed ? (
            <div className="relative w-full aspect-video bg-neutral-900">
              <iframe
                src={youtubeEmbed}
                title={title}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : driveEmbed ? (
            <div className="relative w-full aspect-video bg-neutral-900">
              <iframe
                src={driveEmbed}
                title={title}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          ) : isVideoFile ? (
            <video
              src={toVideoProxyUrl(url)}
              controls
              playsInline
              className="w-full max-h-[480px] bg-neutral-900"
              preload="metadata"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
