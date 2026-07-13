"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { PREVIEW_COOKIE, LUNCH_LEARN_PREVIEW_SLUG } from "@/lib/auth/preview-mode";
import { getHomeProgramForTrack } from "@/lib/programs";

/**
 * Set the preview cookie to a specific track slug, or clear it. Only
 * super-admins can change preview state — other roles get a silent no-op.
 *
 * Preview is a transient overlay: the program skin for the previewed course
 * is derived from this cookie at resolution time (resolveBaseProgram), so we
 * deliberately do NOT touch the sticky program-override here. Clearing the
 * cookie reverts the admin to their real program context automatically.
 */
export async function setPreviewTrackSlug(slug: string | null) {
  const ctx = await getSessionContext();
  const role = ctx?.student?.role ?? "";
  if (!canSwitchPrograms(role)) return;

  const cookieStore = await cookies();
  if (!slug) {
    cookieStore.delete(PREVIEW_COOKIE);
  } else {
    cookieStore.set(PREVIEW_COOKIE, slug, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
    });
  }
  redirect("/dashboard");
}

/**
 * Add or remove ONE course from the preview set — previewing several at once
 * is the only way an admin can see the multi-course learner home (real
 * single-course students are redirected off it). Rules that keep the set
 * coherent:
 *   • The L&L sentinel never mixes with courses — toggling a course while
 *     it's active starts a fresh set, and vice versa.
 *   • All courses must share a home program (the skin follows the first
 *     slug); toggling a course from another program starts a fresh set.
 *   • Removing the last course exits preview.
 */
export async function togglePreviewTrackSlug(slug: string) {
  const ctx = await getSessionContext();
  const role = ctx?.student?.role ?? "";
  if (!canSwitchPrograms(role)) return;

  const cookieStore = await cookies();
  const current = (cookieStore.get(PREVIEW_COOKIE)?.value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let next: string[];
  if (slug === LUNCH_LEARN_PREVIEW_SLUG) {
    next = current.includes(slug) ? [] : [slug];
  } else if (current.includes(slug)) {
    next = current.filter((s) => s !== slug);
  } else {
    const sameProgram = (a: string, b: string) =>
      getHomeProgramForTrack(a)?.slug === getHomeProgramForTrack(b)?.slug;
    const compatible =
      current.length > 0 &&
      !current.includes(LUNCH_LEARN_PREVIEW_SLUG) &&
      current.every((s) => sameProgram(s, slug));
    next = compatible ? [...current, slug] : [slug];
  }

  if (next.length === 0) {
    cookieStore.delete(PREVIEW_COOKIE);
  } else {
    cookieStore.set(PREVIEW_COOKIE, next.join(","), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
    });
  }
  redirect("/dashboard");
}
