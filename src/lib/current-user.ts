import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

export type CurrentUser = {
  firstName: string;
  lastName: string;
  email: string | null;
  userRole: string;
  isDemo: boolean;
};

// Returns a CurrentUser for the dashboard page. Handles both the real-auth
// path and the demo fallback so callers see one code path.
// Returns null only when Supabase is configured but there is no valid session
// (caller should redirect to "/" in that case).
export async function resolveCurrentUser(
  cookieStore: ReadonlyRequestCookies,
): Promise<CurrentUser | null> {
  // The demo path trusts a plaintext-email cookie, so it must never be reachable
  // in production — gate on NODE_ENV too, not just on Supabase being unconfigured
  // (a prod deploy that lost its Supabase env must NOT silently fall back to it).
  if (!isSupabaseConfigured() && process.env.NODE_ENV !== "production") {
    const demoEmail = cookieStore.get(DEMO_COOKIE)?.value;
    let firstName = "there";
    let lastName = "";
    let userRole = "student";
    if (demoEmail) {
      const demoUser = getDemoUser(demoEmail);
      if (demoUser) {
        firstName = demoUser.first_name;
        lastName = demoUser.last_name;
        userRole = demoUser.role;
      } else {
        firstName = demoEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
    return { firstName, lastName, email: demoEmail ?? null, userRole, isDemo: true };
  }

  const ctx = await getSessionContext();
  if (!ctx) return null;

  const { student } = ctx;
  return {
    // Empty when we have no real name — greetings drop the name rather than
    // showing a placeholder like "there".
    firstName: student?.first_name?.trim() || "",
    lastName: student?.last_name || "",
    email: student?.email ?? ctx.userEmail ?? null,
    userRole: student?.role ?? "student",
    isDemo: false,
  };
}
