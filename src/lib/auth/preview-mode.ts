import { cookies } from "next/headers";
import { canAccessAdminPanel } from "@/lib/roles";

export const PREVIEW_COOKIE = "preview-as-student";

/** Special sentinel slug for previewing the Lunch & Learns hub (not a real
 *  track — staff users land on the L&L grid instead of the track dashboard). */
export const LUNCH_LEARN_PREVIEW_SLUG = "__lunch-learns";

/**
 * When a staff member sets the preview cookie, the dashboard renders as if
 * they were a student enrolled in the named track(s). Available to anyone with
 * admin-panel access — super-admins and admins across their programs, and
 * instructors for the courses they teach (the set of courses offered to an
 * instructor is scoped to their assignments in preview-actions/layout, and the
 * write actions re-check that scope).
 *
 * The cookie holds one slug, or several comma-separated slugs to preview a
 * MULTI-course student (the only way to reach the multi-course home as staff —
 * real single-course students are redirected off it).
 *
 * Returns the track slugs being previewed; empty array when preview is off.
 */
export async function getPreviewTrackSlugs(role: string): Promise<string[]> {
  if (!canAccessAdminPanel(role)) return [];
  const cookieStore = await cookies();
  const value = cookieStore.get(PREVIEW_COOKIE)?.value ?? "";
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * First previewed slug, or null if preview is off. Single-slug consumers
 * (program-skin resolution, help page, L&L sentinel checks) key off the
 * FIRST course; the L&L sentinel is only ever stored alone.
 */
export async function getPreviewTrackSlug(role: string): Promise<string | null> {
  return (await getPreviewTrackSlugs(role))[0] ?? null;
}

/**
 * True when a staff member is actively previewing as a student. Access gates
 * (admin pages + server actions) use this to treat the previewer as a student,
 * so preview mode is a real restriction, not just hidden chrome.
 */
export async function isPreviewingAsStudent(role: string): Promise<boolean> {
  return (await getPreviewTrackSlug(role)) !== null;
}


