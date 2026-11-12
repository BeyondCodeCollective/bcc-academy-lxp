"use client";

import { Video } from "lucide-react";
import { MarkVideoWatchedButton } from "@/components/mark-video-watched-button";
import { getYouTubeEmbedUrl, VIDEO_EXTENSIONS } from "@/lib/storage-utils";
import { toDriveEmbedUrl } from "@/lib/lunch-learns/drive";
import { SessionDisclosure } from "@/components/session-disclosure";

// Class recordings open on black (Zoom's first frames), so the player showed a
// large black box until someone pressed play. A plain ink frame with a play
// mark reads as "video, ready" instead. Inline so it costs no request.
const RECORDING_POSTER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">' +
      '<rect width="1600" height="900" fill="#1a1a1a"/>' +
      '<circle cx="800" cy="450" r="64" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="4"/>' +
      '<path d="M782 418 L782 482 L834 450 Z" fill="#ffffff" fill-opacity="0.85"/>' +
      "</svg>",
  );

type Props = {
  url: string;
  title: string;
  subtitle?: string;
  trackSlug: string;
  weekNumber: number;
  showWatchButton: boolean;
  initialWatched: boolean;
  /** "row" renders as an expandable line inside a session row on the week
   *  page instead of a full-width card. */
  variant?: "card" | "row";
  /** Row variant only: start expanded. */
  defaultOpen?: boolean;
};

export function RecordingCard({
  url,
  title,
  subtitle,
  trackSlug,
  weekNumber,
  showWatchButton,
  initialWatched,
  variant = "card",
  defaultOpen = false,
}: Props) {
  const youtubeEmbed = getYouTubeEmbedUrl(url);
  const driveEmbed = toDriveEmbedUrl(url);
  // Match on the PATH, not the whole URL. A signed Supabase URL carries
  // `?token=…`, so an endsWith(".mp4") test on the full string says "not a
  // video" and the imported class recording would render as a bare link
  // instead of a player.
  const pathname = (() => {
    try {
      return new URL(url, "https://x.invalid").pathname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  })();
  const isVideoFile =
    !youtubeEmbed && !driveEmbed &&
    VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));

  const player = (
    <>
        {youtubeEmbed ? (
          <div className="relative w-full aspect-video bg-ink">
            <iframe
              src={youtubeEmbed}
              title={title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : driveEmbed ? (
          <div className="relative w-full aspect-video bg-ink">
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
            poster={RECORDING_POSTER}
            className="w-full aspect-video max-h-[480px] bg-ink"
            preload="none"
          />
        ) : (
          <div className="px-4 py-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ink-soft underline"
            >
              Open recording ↗
            </a>
          </div>
        )}
    </>
  );
  const watchButton = (
    <>
        {showWatchButton && (
          <MarkVideoWatchedButton
            trackSlug={trackSlug}
            weekNumber={weekNumber}
            initialWatched={initialWatched}
          />
        )}
    </>
  );

  if (variant === "row") {
    return (
      <SessionDisclosure label="Recording" defaultOpen={defaultOpen}>
        <div className="max-w-3xl">
          <div className="overflow-hidden rounded-lg border border-rule">{player}</div>
          {showWatchButton && <div className="mt-3 flex justify-end">{watchButton}</div>}
        </div>
      </SessionDisclosure>
    );
  }

  return (
    <div className="mb-4 overflow-hidden panel">
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 min-h-[52px]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink">
            <Video size={16} className="text-white" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-ink truncate">{title}</p>
            {subtitle && <p className="text-xs text-ink-soft truncate">{subtitle}</p>}
          </div>
        </div>
        {watchButton}
      </div>

      <div className="border-t border-rule">{player}</div>
    </div>
  );
}
