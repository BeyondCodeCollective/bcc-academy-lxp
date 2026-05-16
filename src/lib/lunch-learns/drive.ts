// Google Meet recordings end up as Drive share links. To embed, we swap
// `/view` (or `/edit`) for `/preview` on the file URL. The file ID is the
// path segment after `/d/`. If the URL doesn't match the expected shape,
// callers fall back to a "Open in Drive" link.

export function toDriveEmbedUrl(shareUrl: string): string | null {
  const match = shareUrl.match(/\/file\/d\/([^/]+)/);
  if (!match) return null;
  return `https://drive.google.com/file/d/${match[1]}/preview`;
}
