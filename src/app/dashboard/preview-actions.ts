"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { PREVIEW_COOKIE } from "@/lib/auth/preview-mode";

/**
 * Set the preview cookie to a specific track slug, or clear it. Only
 * super-admins can change preview state — other roles get a silent no-op.
 */
export async function setPreviewTrackSlug(
  slug: string | null,
  formData?: FormData,
) {
  const ctx = await getSessionContext();
  const role = ctx?.student?.role ?? "";
  if (!canSwitchPrograms(role)) return;

  // Home program of the picked course, passed as a hidden form field (the
  // preview menu lists courses across all programs).
  const programSlug = (formData?.get("program") as string) || null;

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
    // The preview menu lists courses across every program, so the picked
    // course may belong to a program other than the one we're currently in.
    // Move the program context to its home program (same cookie pair + options
    // the /switch-program route and auth callback set) so getProgram resolves
    // the right tracks and the dashboard actually renders the previewed course.
    if (programSlug) {
      const opts = { path: "/", httpOnly: false, sameSite: "lax" as const };
      cookieStore.set("program-slug", programSlug, opts);
      cookieStore.set("program-override", programSlug, {
        ...opts,
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }
  redirect("/dashboard");
}
