"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { canSwitchPrograms } from "@/lib/roles";
import { PREVIEW_COOKIE } from "@/lib/auth/preview-mode";

// Remembers the program the admin was in before a cross-program preview
// switched their context, so exiting preview returns them there instead of
// stranding them in the previewed course's program. Super-admins default to
// Catalyst (the hub) when they hadn't explicitly switched.
const PREVIEW_RETURN_COOKIE = "preview-return-program";

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
  const opts = { path: "/", httpOnly: false, sameSite: "lax" as const };
  const setProgram = (programCtx: string) => {
    cookieStore.set("program-slug", programCtx, opts);
    cookieStore.set("program-override", programCtx, {
      ...opts,
      maxAge: 60 * 60 * 24 * 365,
    });
  };

  if (!slug) {
    // Exiting preview: clear the preview state and restore the program context
    // we were in before previewing switched it into the course's program.
    cookieStore.delete(PREVIEW_COOKIE);
    const returnTo = cookieStore.get(PREVIEW_RETURN_COOKIE)?.value;
    if (returnTo) {
      setProgram(returnTo);
      cookieStore.delete(PREVIEW_RETURN_COOKIE);
    }
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
      const current = cookieStore.get("program-override")?.value ?? "catalyst";
      // Record the return target the first time a preview moves us off our own
      // program; don't overwrite it when hopping between previews.
      if (current !== programSlug && !cookieStore.get(PREVIEW_RETURN_COOKIE)) {
        cookieStore.set(PREVIEW_RETURN_COOKIE, current, opts);
      }
      setProgram(programSlug);
    }
  }
  redirect("/dashboard");
}
