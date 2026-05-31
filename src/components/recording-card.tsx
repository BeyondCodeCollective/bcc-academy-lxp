"use client";

import { MarkVideoWatchedButton } from "@/components/mark-video-watched-button";
import { getYouTubeEmbedUrl, VIDEO_EXTENSIONS } from "@/lib/storage-utils";
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
  const youtubeEmbed = getYouTubeEmbedUrl(url);
  const driveEmbed = toDriveEmbedUrl(url);
  const isVideoFile =
    !youtubeEmbed && !driveEmbed &&
    VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));

  return (
    <div className="mb-4 overflow-hidden border border-rule bg-surface-elevated">
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 min-h-[52px]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900">
            <span className="text-white ml-0.5 text-sm">▶</span>
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-neutral-900 truncate">{title}</p>
            {subtitle && <p className="text-xs text-neutral-500 truncate">{subtitle}</p>}
          </div>
        </div>
        {showWatchButton && (
          <MarkVideoWatchedButton
            trackSlug={trackSlug}
            weekNumber={weekNumber}
            initialWatched={initialWatched}
          />
        )}
      </div>

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
            src={url}
            controls
            playsInline
            className="w-full max-h-[480px] bg-neutral-900"
            preload="metadata"
          />
        ) : (
          <div className="px-4 py-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-500 underline"
            >
              Open recording ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
