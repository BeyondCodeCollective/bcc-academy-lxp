import { Video } from "lucide-react";
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

// Recording display for a track week. The player is always visible — no
// poster/intro step, no extra click. Mirrors the Lunch & Learn *detail*
// page (iframe + title) rather than the L&L hub *list* (poster cards),
// because the week page already commits the user to a single recording.
// Supports YouTube, Google Drive share links, and Supabase Storage uploads.
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
  const isVideoFile = isUploadedRecording(url);

  return (
    <div className="mb-4 overflow-hidden border border-rule bg-surface-elevated">
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <Video size={15} className="text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">{title}</p>
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
      {youtubeEmbed ? (
        <div className="relative w-full aspect-video">
          <iframe
            src={youtubeEmbed}
            title={title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : driveEmbed ? (
        <div className="relative w-full aspect-video">
          <iframe
            src={driveEmbed}
            title={title}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      ) : isVideoFile ? (
        <video src={toVideoProxyUrl(url)} controls className="w-full" preload="metadata" />
      ) : (
        <div className="p-6 text-center">
          <p className="text-sm text-neutral-600">This recording can&rsquo;t be embedded.</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 bg-neutral-900 text-white text-xs font-semibold px-4 py-2.5 transition-colors hover:bg-neutral-700"
          >
            Open recording
          </a>
        </div>
      )}
    </div>
  );
}
