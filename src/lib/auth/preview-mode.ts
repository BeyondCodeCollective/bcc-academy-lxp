import { cookies } from "next/headers";
import { canSwitchPrograms } from "@/lib/roles";

export const PREVIEW_COOKIE = "preview-as-student";

/** Special sentinel slug for previewing the Lunch & Learns hub (not a real
 *  track — staff users land on the L&L grid instead of the track dashboard). */
export const LUNCH_LEARN_PREVIEW_SLUG = "__lunch-learns";

/**
 * When a super-admin sets the preview cookie, the dashboard renders as if
 * they were a student enrolled in just the named track. Restricted to
 * super-admins (other admins still see their normal view) so the toggle
 * can't be exploited by less-trusted accounts.
 *
 * Returns the track slug being previewed, or null if preview is off.
 */
export async function getPreviewTrackSlug(role: string): Promise<string | null> {
  if (!canSwitchPrograms(role)) return null;
  const cookieStore = await cookies();
  const value = cookieStore.get(PREVIEW_COOKIE)?.value;
  return value && value.length > 0 ? value : null;
}

/**
 * True when a super-admin is actively previewing as a student. Access gates
 * (admin pages + server actions) use this to treat the previewer as a student,
 * so preview mode is a real restriction, not just hidden chrome.
 */
export async function isPreviewingAsStudent(role: string): Promise<boolean> {
  return (await getPreviewTrackSlug(role)) !== null;
}


