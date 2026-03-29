/**
 * Utilities for distinguishing Supabase Storage URLs from external links.
 * Safe to import in both server and client components.
 */

import type { SessionResource } from "@/app/dashboard/admin/actions";

/** Returns true if the URL is a Supabase Storage public URL (an uploaded file). */
export function isStorageUrl(url: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return supabaseUrl.length > 0 && url.startsWith(supabaseUrl + "/storage/v1/object/public/");
}

/** Returns true if a resource is an uploaded video file in Supabase Storage. */
export function isUploadedVideo(resource: SessionResource): boolean {
  if (!isStorageUrl(resource.url)) return false;
  const videoExts = [".mp4", ".mov", ".webm", ".avi", ".mkv"];
  return videoExts.some((ext) => resource.url.toLowerCase().endsWith(ext));
}

/**
 * Returns true if the recording URL is a Supabase Storage video
 * (i.e., it should be rendered as a <video> tag instead of an external link).
 */
export function isUploadedRecording(url: string): boolean {
  if (!isStorageUrl(url)) return false;
  const videoExts = [".mp4", ".mov", ".webm", ".avi", ".mkv"];
  return videoExts.some((ext) => url.toLowerCase().endsWith(ext));
}
