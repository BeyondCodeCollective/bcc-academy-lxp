import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";
import { canManageStudents, canSwitchPrograms } from "@/lib/roles";
import { getGrantedProgramSlugs } from "@/lib/auth/program-access";
import { getMyInstructorTracks } from "@/app/dashboard/admin/actions-tracks";

/**
 * What a staffer may preview as a student. One rule, shared by the preview
 * server actions (enforcement) and the dashboard layout (which courses the
 * toggle lists) so the pill can never offer something the action refuses:
 *
 *   - null         → no restriction (super_admin; master bypasses checks anyway)
 *   - { programs } → any course homed in these program slugs — program admins
 *                    get their home program plus staff_program_access grants
 *   - { tracks }   → exactly these track slugs — instructors' assignments
 *
 * The Lunch & Learns sentinel stays super-admin-only regardless of scope.
 */
export type PreviewScope =
  | null
  | { programs: Set<string> }
  | { tracks: Set<string> };

export const getPreviewScope = cache(
  async (studentId: string, role: string): Promise<PreviewScope> => {
    if (canSwitchPrograms(role)) return null;
    if (canManageStudents(role)) {
      const svc = createServiceClient();
      const { data } = await svc
        .from("students")
        .select("programs(slug)")
        .eq("id", studentId)
        .maybeSingle<{ programs: { slug: string } | null }>();
      const homeSlug = data?.programs?.slug ?? null;
      const grants = await getGrantedProgramSlugs(studentId);
      return {
        programs: new Set([homeSlug, ...grants].filter((s): s is string => !!s)),
      };
    }
    return { tracks: new Set(await getMyInstructorTracks()) };
  },
);
