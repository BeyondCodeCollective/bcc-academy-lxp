import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { getDemoUser, DEMO_COOKIE } from "@/lib/demo-users";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

export type CurrentUser = {
  firstName: string;
  lastName: string;
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
  if (!isSupabaseConfigured()) {
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
    return { firstName, lastName, userRole, isDemo: true };
  }

  const ctx = await getSessionContext();
  if (!ctx) return null;

  const { student } = ctx;
  return {
    firstName: student?.first_name || "there",
    lastName: student?.last_name || "",
    userRole: student?.role ?? "student",
    isDemo: false,
  };
}
