/**
 * Utilities for distinguishing Supabase Storage URLs from external links.
 * Safe to import in both server and client components.
 */

import type { SessionResource } from "@/app/dashboard/admin/actions";

export const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".avi", ".mkv"];

/** Returns true if the URL is a Supabase Storage public URL (an uploaded file). */
export function isStorageUrl(url: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return supabaseUrl.length > 0 && url.startsWith(supabaseUrl + "/storage/v1/object/public/");
}

/** Returns true if a resource is an uploaded video file in Supabase Storage. */
export function isUploadedVideo(resource: SessionResource): boolean {
  if (!isStorageUrl(resource.url)) return false;
  return VIDEO_EXTENSIONS.some((ext) => resource.url.toLowerCase().endsWith(ext));
}

/**
 * Returns true if the recording URL is a Supabase Storage video
 * (i.e., it should be rendered as a <video> tag instead of an external link).
 */
export function isUploadedRecording(url: string): boolean {
  if (!isStorageUrl(url)) return false;
  return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
}

/** Extracts a YouTube embed URL from various YouTube URL formats. */
export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
      if (parts[0] === "live" && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
    }
  } catch {
    // Invalid URL
  }
  return null;
}

/** Returns a YouTube thumbnail URL for any supported YouTube URL format, or
 *  null if the URL isn't recognized. `hqdefault` always exists; `maxresdefault`
 *  may 404 on older or unavailable videos, so we default to hqdefault. */
export function getYouTubeThumbnailUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1);
    } else if (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") {
      videoId = u.searchParams.get("v");
      if (!videoId) {
        const parts = u.pathname.split("/").filter(Boolean);
        if ((parts[0] === "embed" || parts[0] === "live") && parts[1]) {
          videoId = parts[1];
        }
      }
    }
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}
