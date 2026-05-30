/**
 * Convert a program/course name to a URL-safe slug.
 * Handles accented characters (café → cafe) via NFD normalization.
 */
export function toSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
