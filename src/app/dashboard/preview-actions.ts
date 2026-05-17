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
