"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireManager, requireSuperAdmin, requireCapability, logAdminAccess, resolveProgramForActor } from "./actions-shared";
import { canSwitchPrograms } from "@/lib/roles";
import { getProgram } from "@/lib/programs/server";
import { resolveProgramScope } from "@/lib/programs/scope";
import { deriveCohortLabel } from "@/lib/surveys/cohort-labels";

// Resolves the program_id scope for an insights query. Super-admins get the
// BCC-wide view (no scope — undefined) unless they pass an explicit one;
// everyone else is hard-scoped to their CURRENT program server-side. Client
// input is ignored for non-super-admins, so a program admin can never reach
// across orgs by omitting or forging the programIds argument.
async function resolveInsightsScope(
  role: string,
  requested?: string[],
): Promise<string[] | undefined> {
  if (canSwitchPrograms(role)) return requested;
  const program = await getProgram();
  const { ids } = await resolveProgramScope(program.slug);
  return ids;
}

// ─── Survey Stats ─────────────────────────────────────────────────────────────

export type SurveyStatsRow = {
  student_id: string;
  survey_type: string;
  completed_at: string | null;
};

export async function getSurveyStats(
  programSlug: string,
  surveyType: string
): Promise<SurveyStatsRow[]> {
  const actor = await requireAdmin();
  const { svc } = actor;
  const programId = await resolveProgramForActor(actor, svc, programSlug);

  const { data, error } = await svc
    .from("survey_responses")
    .select("student_id, survey_type, completed_at")
    .eq("program_id", programId)
    .eq("survey_type", surveyType);

  if (error) {
    console.error("getSurveyStats error:", error.message);
    return [];
  }
  return (data ?? []) as SurveyStatsRow[];
}

export async function exportSurveyResponses(
  programSlug: string,
  surveyType: string
): Promise<{ student_name: string; email: string; responses: Record<string, unknown>; completed_at: string | null }[]> {
  const actor = await requireAdmin();
  const { svc } = actor;

  const programId = await resolveProgramForActor(actor, svc, programSlug);

  const { data, error } = await svc
    .from("survey_responses")
    .select("student_id, responses, completed_at, students(first_name, last_name, email)")
    .eq("program_id", programId)
    .eq("survey_type", surveyType)
    .not("completed_at", "is", null);

  if (error) {
    console.error("exportSurveyResponses error:", error.message);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const student = row.students as { first_name: string; last_name: string; email: string } | null;
    return {
      student_name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
      email: student?.email ?? "",
      responses: row.responses as Record<string, unknown>,
      completed_at: row.completed_at as string | null,
    };
  });
}

// ─── Per-track public survey stats + export ─────────────────────────────────
//
// Public surveys (e.g. `network-plus-post`) live in `public_survey_responses`
// and are filled out by anyone with the link — no `student_id`, no enrolment
// row. The track-level auth aggregation in `surveyStats` deliberately misses
// them. These helpers expose them by `survey_type` so the per-track Insights
// view can render counts + CSV export alongside authenticated surveys.

export type PublicSurveyCountRow = { survey_type: string; count: number };

export async function getPublicSurveyCountsByType(
  surveyTypes: string[],
): Promise<PublicSurveyCountRow[]> {
  if (surveyTypes.length === 0) return [];
  const { svc } = await requireAdmin();
  const { data, error } = await svc
    .from("public_survey_responses")
    .select("survey_type")
    .in("survey_type", surveyTypes)
    .is("withdrawn_at", null);
  if (error) {
    console.error("getPublicSurveyCountsByType error:", error.message);
    return [];
  }
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const t = (row as { survey_type: string }).survey_type;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return surveyTypes.map((t) => ({
    survey_type: t,
    count: counts.get(t) ?? 0,
  }));
}

export async function exportPublicSurveyResponsesByType(
  surveyType: string,
): Promise<{
  full_name: string;
  email: string;
  responses: Record<string, unknown>;
  completed_at: string | null;
}[]> {
  const { svc, userId } = await requireAdmin();
  const { data, error } = await svc
    .from("public_survey_responses")
    .select("full_name, email, responses, completed_at")
    .eq("survey_type", surveyType)
    .is("withdrawn_at", null)
    .order("completed_at", { ascending: false });
  if (error) {
    console.error("exportPublicSurveyResponsesByType error:", error.message);
    return [];
  }
  logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "export",
    resource: "public_survey_responses",
    rowCount: data?.length ?? 0,
    metadata: { surveyType },
  });
  return (data ?? []).map((row) => ({
    full_name: (row as { full_name: string | null }).full_name ?? "",
    email: (row as { email: string | null }).email ?? "",
    responses: (row as { responses: Record<string, unknown> }).responses ?? {},
    completed_at: (row as { completed_at: string | null }).completed_at ?? null,
  }));
}

// ─── Public (anonymous) survey responses — super_admin only ─────────────────

export type PublicSurveyStatsRow = {
  program_slug: string;
  program_name: string;
  survey_type: string;
  response_count: number;
};

export async function getPublicSurveyStats(): Promise<PublicSurveyStatsRow[]> {
  const { svc, userId } = await requireSuperAdmin();

  const { data, error } = await svc
    .from("public_survey_responses")
    .select("program_id, survey_type, programs(slug, name)");

  if (error) {
    console.error("getPublicSurveyStats error:", error.message);
    return [];
  }

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "view",
    resource: "public_survey_responses.stats",
    rowCount: data?.length ?? 0,
  });

  const counts = new Map<string, PublicSurveyStatsRow>();
  for (const row of data ?? []) {
    const programsField = (row as { programs: { slug: string; name: string } | { slug: string; name: string }[] | null }).programs;
    const program = Array.isArray(programsField) ? programsField[0] : programsField;
    if (!program) continue;
    const surveyType = (row as { survey_type: string }).survey_type;
    const key = `${program.slug}::${surveyType}`;
    const existing = counts.get(key);
    if (existing) {
      existing.response_count += 1;
    } else {
      counts.set(key, {
        program_slug: program.slug,
        program_name: program.name,
        survey_type: surveyType,
        response_count: 1,
      });
    }
  }
  return Array.from(counts.values()).sort((a, b) =>
    a.program_name.localeCompare(b.program_name)
  );
}

export async function exportPublicSurveyResponses(
  programSlug: string,
  surveyType: string
): Promise<
  {
    email: string;
    full_name: string;
    responses: Record<string, unknown>;
    completed_at: string | null;
  }[]
> {
  const { svc, userId } = await requireSuperAdmin();

  const { data: programRow } = await svc
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();

  if (!programRow) return [];

  const { data, error } = await svc
    .from("public_survey_responses")
    .select("email, full_name, responses, completed_at")
    .eq("program_id", programRow.id)
    .eq("survey_type", surveyType)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("exportPublicSurveyResponses error:", error.message);
    return [];
  }

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: programRow.id as string,
    action: "export",
    resource: "public_survey_responses",
    rowCount: data?.length ?? 0,
    metadata: { survey_type: surveyType, program_slug: programSlug },
  });

  return (data ?? []) as {
    email: string;
    full_name: string;
    responses: Record<string, unknown>;
    completed_at: string | null;
  }[];
}

export type PublicSurveyResponseRow = {
  email: string;
  full_name: string;
  completed_at: string | null;
  invited_at: string | null;
  responses: Record<string, unknown>;
};

export async function listPublicSurveyResponses(
  programSlug: string,
  surveyType: string,
): Promise<PublicSurveyResponseRow[]> {
  const actor = await requireAdmin();
  const { svc } = actor;

  const programId = await resolveProgramForActor(actor, svc, programSlug);

  const { data, error } = await svc
    .from("public_survey_responses")
    .select("email, full_name, completed_at, invited_at, responses")
    .eq("program_id", programId)
    .eq("survey_type", surveyType)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("listPublicSurveyResponses error:", error.message);
    return [];
  }
  return (data ?? []) as PublicSurveyResponseRow[];
}

export async function sendInviteAction(
  email: string,
  programSlug: string,
  surveyType: string,
): Promise<{ success: boolean; error?: string }> {
  const actor = await requireManager();
  const { svc, userId } = actor;

  // Enforce the actor administers this program BEFORE we send any "you're
  // accepted to <program>" email or touch its survey rows.
  const programId = await resolveProgramForActor(actor, svc, programSlug);

  const { getProgramBySlug } = await import("@/lib/programs");
  const program = getProgramBySlug(programSlug);
  const defaultTrack = program.tracks[0];

  if (!defaultTrack) {
    return { success: false, error: "Program has no tracks" };
  }

  const inviteUrl = `https://${program.domain}?track=${defaultTrack.slug}&email=${encodeURIComponent(email)}`;

  const { Resend } = await import("resend");
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { success: false, error: "Email not configured" };
  }
  const resend = new Resend(resendKey);
  const fromAddress =
    process.env.RESEND_FROM_ADDRESS ?? "BCC Academy <noreply@bccacademy.io>";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:${program.colors.primary};padding:32px 24px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">
              You're in!
            </h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
              You've been accepted to ${program.name}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.5;">
              Congratulations! Your application has been reviewed and you're ready to get started.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#1a1a1a;line-height:1.5;">
              Click below to create your account and join your cohort.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
              <tr>
                <td style="background:${program.colors.primary};border-radius:10px;text-align:center;">
                  <a href="${inviteUrl}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                    Create Your Account →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:13px;color:#999;text-align:center;">
              This link is unique to you. Don't share it with others.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px 24px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#999;text-align:center;">
              ${program.organization} · ${program.name}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const { error: sendError } = await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: `You've been accepted to ${program.name}!`,
    html,
  });

  if (sendError) {
    console.error("[sendInvite] email failed:", sendError);
    return { success: false, error: "Failed to send email" };
  }

  await svc
    .from("public_survey_responses")
    .update({ invited_at: new Date().toISOString() })
    .eq("email", email)
    .eq("survey_type", surveyType)
    .eq("program_id", programId);

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: programId,
    action: "send_invite",
    resource: "public_survey_responses",
    metadata: { email, programSlug, surveyType },
  });

  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function deleteSurveyResponse(
  studentId: string,
  surveyType: string,
  programSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireAdmin();
  const { svc } = actor;

  const programId = await resolveProgramForActor(actor, svc, programSlug);

  const { error } = await svc
    .from("survey_responses")
    .delete()
    .eq("student_id", studentId)
    .eq("survey_type", surveyType)
    .eq("program_id", programId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin");
  return { ok: true };
}

export async function deletePublicSurveyResponse(
  email: string,
  surveyType: string,
  programSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireAdmin();
  const { svc } = actor;

  const programId = await resolveProgramForActor(actor, svc, programSlug);

  const { error } = await svc
    .from("public_survey_responses")
    .delete()
    .eq("email", email)
    .eq("survey_type", surveyType)
    .eq("program_id", programId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin");
  return { ok: true };
}

// ─── BCC-wide survey data (cross-program) — super_admin only ─────────────────

export type BCCSurveyResponse = {
  survey_type: string;
  full_name: string;
  email: string;
  program_slug: string;
  program_name: string;
  completed_at: string | null;
  responses: Record<string, unknown>;
  source: "public" | "authenticated";
};

export type BCCSurveyStat = {
  survey_type: string;
  program_slug: string;
  program_name: string;
  count: number;
  source: "public" | "authenticated";
};

export async function getBCCSurveyStats(): Promise<BCCSurveyStat[]> {
  const { svc, userId } = await requireSuperAdmin();

  const [publicRes, authRes] = await Promise.all([
    svc
      .from("public_survey_responses")
      .select("survey_type, program_id, programs(slug, name)")
      .is("withdrawn_at", null),
    svc
      .from("survey_responses")
      .select("survey_type, program_id, programs(slug, name)")
      .eq("survey_type", "bcc-learner-intake")
      .not("completed_at", "is", null),
  ]);

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "view",
    resource: "bcc_survey_stats",
  });

  const counts = new Map<string, BCCSurveyStat>();

  function tally(
    rows: { survey_type: string; programs: unknown }[] | null,
    source: "public" | "authenticated",
  ) {
    for (const row of rows ?? []) {
      const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as {
        slug: string;
        name: string;
      } | null;
      if (!p) continue;
      const key = `${source}::${row.survey_type}::${p.slug}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          survey_type: row.survey_type,
          program_slug: p.slug,
          program_name: p.name,
          count: 1,
          source,
        });
      }
    }
  }

  tally(publicRes.data as { survey_type: string; programs: unknown }[] | null, "public");
  tally(authRes.data as { survey_type: string; programs: unknown }[] | null, "authenticated");

  return Array.from(counts.values());
}

export async function getBCCSurveyResponses(
  surveyType: string,
): Promise<BCCSurveyResponse[]> {
  const { svc, userId } = await requireSuperAdmin();

  const [publicRes, authRes] = await Promise.all([
    svc
      .from("public_survey_responses")
      .select("email, full_name, responses, completed_at, programs(slug, name)")
      .eq("survey_type", surveyType)
      .is("withdrawn_at", null)
      .order("completed_at", { ascending: false }),
    surveyType === "bcc-learner-intake"
      ? svc
          .from("survey_responses")
          .select(
            "responses, completed_at, program_id, programs(slug, name), students(first_name, last_name, email)",
          )
          .eq("survey_type", surveyType)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "view",
    resource: `bcc_survey_responses.${surveyType}`,
    rowCount: (publicRes.data?.length ?? 0) + ((authRes.data as unknown[])?.length ?? 0),
  });

  const publicRows: BCCSurveyResponse[] = (publicRes.data ?? []).map((row) => {
    const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as {
      slug: string;
      name: string;
    } | null;
    return {
      survey_type: surveyType,
      full_name: (row as { full_name: string }).full_name,
      email: (row as { email: string }).email,
      program_slug: p?.slug ?? "",
      program_name: p?.name ?? "",
      completed_at: (row as { completed_at: string | null }).completed_at,
      responses: (row as { responses: Record<string, unknown> }).responses,
      source: "public",
    };
  });

  const authData = authRes.data as {
    responses: Record<string, unknown>;
    completed_at: string | null;
    programs: { slug: string; name: string } | { slug: string; name: string }[] | null;
    students: { first_name: string; last_name: string; email: string } | null;
  }[] | null;

  const authRows: BCCSurveyResponse[] = (authData ?? []).map((row) => {
    const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as {
      slug: string;
      name: string;
    } | null;
    return {
      survey_type: surveyType,
      full_name: row.students
        ? `${row.students.first_name} ${row.students.last_name}`
        : "Unknown",
      email: row.students?.email ?? "",
      program_slug: p?.slug ?? "",
      program_name: p?.name ?? "",
      completed_at: row.completed_at,
      responses: row.responses,
      source: "authenticated",
    };
  });

  return [...publicRows, ...authRows].sort((a, b) => {
    if (!a.completed_at) return 1;
    if (!b.completed_at) return -1;
    return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
  });
}

// ─── Dashboard: all surveys, all sources ─────────────────────────────────────
// Powers the Survey Insights dashboard. Unlike getBCCSurveyStats (which only
// folds in auth responses for bcc-learner-intake), these include every survey
// type that has any responses in either table — so program-bound auth surveys
// like mid-program-spring-2026 and pre-survey-spring-2026 show up.

export async function getDashboardSurveyStats(
  programIds?: string[],
): Promise<BCCSurveyStat[]> {
  const { svc, userId, role } = await requireCapability("view_insights");
  const scopeIds = await resolveInsightsScope(role, programIds);

  let publicQuery = svc
    .from("public_survey_responses")
    .select("survey_type, program_id, programs(slug, name)")
    .is("withdrawn_at", null);
  let authQuery = svc
    .from("survey_responses")
    .select("survey_type, program_id, programs(slug, name)")
    .not("completed_at", "is", null);
  if (scopeIds) {
    publicQuery = publicQuery.in("program_id", scopeIds);
    authQuery = authQuery.in("program_id", scopeIds);
  }

  const [publicRes, authRes] = await Promise.all([publicQuery, authQuery]);

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "view",
    resource: "dashboard_survey_stats",
  });

  const counts = new Map<string, BCCSurveyStat>();

  function tally(
    rows: { survey_type: string; programs: unknown }[] | null,
    source: "public" | "authenticated",
  ) {
    for (const row of rows ?? []) {
      const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as {
        slug: string;
        name: string;
      } | null;
      if (!p) continue;
      const key = `${source}::${row.survey_type}::${p.slug}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          survey_type: row.survey_type,
          program_slug: p.slug,
          program_name: p.name,
          count: 1,
          source,
        });
      }
    }
  }

  tally(publicRes.data as { survey_type: string; programs: unknown }[] | null, "public");
  tally(authRes.data as { survey_type: string; programs: unknown }[] | null, "authenticated");

  return Array.from(counts.values());
}

export async function getDashboardSurveyResponses(
  surveyType: string,
): Promise<BCCSurveyResponse[]> {
  const { svc, userId } = await requireSuperAdmin();

  const [publicRes, authRes] = await Promise.all([
    svc
      .from("public_survey_responses")
      .select("email, full_name, responses, completed_at, programs(slug, name)")
      .eq("survey_type", surveyType)
      .is("withdrawn_at", null)
      .order("completed_at", { ascending: false }),
    svc
      .from("survey_responses")
      .select(
        "responses, completed_at, program_id, programs(slug, name), students(first_name, last_name, email)",
      )
      .eq("survey_type", surveyType)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false }),
  ]);

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "view",
    resource: `dashboard_survey_responses.${surveyType}`,
    rowCount:
      (publicRes.data?.length ?? 0) + ((authRes.data as unknown[])?.length ?? 0),
  });

  const publicRows: BCCSurveyResponse[] = (publicRes.data ?? []).map((row) => {
    const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as {
      slug: string;
      name: string;
    } | null;
    return {
      survey_type: surveyType,
      full_name: (row as { full_name: string }).full_name,
      email: (row as { email: string }).email,
      program_slug: p?.slug ?? "",
      program_name: p?.name ?? "",
      completed_at: (row as { completed_at: string | null }).completed_at,
      responses: (row as { responses: Record<string, unknown> }).responses,
      source: "public",
    };
  });

  const authData = authRes.data as
    | {
        responses: Record<string, unknown>;
        completed_at: string | null;
        programs: { slug: string; name: string } | { slug: string; name: string }[] | null;
        students: { first_name: string; last_name: string; email: string } | null;
      }[]
    | null;

  const authRows: BCCSurveyResponse[] = (authData ?? []).map((row) => {
    const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as {
      slug: string;
      name: string;
    } | null;
    return {
      survey_type: surveyType,
      full_name: row.students
        ? `${row.students.first_name} ${row.students.last_name}`
        : "Unknown",
      email: row.students?.email ?? "",
      program_slug: p?.slug ?? "",
      program_name: p?.name ?? "",
      completed_at: row.completed_at,
      responses: row.responses,
      source: "authenticated",
    };
  });

  return [...publicRows, ...authRows].sort((a, b) => {
    if (!a.completed_at) return 1;
    if (!b.completed_at) return -1;
    return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
  });
}

// Batched variant: fetches all survey responses for multiple survey types in
// two queries instead of 2×N. Used by the Insights page to avoid the N+1
// that was firing one getDashboardSurveyResponses call per survey.
export async function getDashboardAllSurveyResponses(
  surveyTypes: string[],
  // For super-admins, scopes both tables to these program ids when provided
  // (omit for the BCC-wide view); the per-program Outcomes analytics passes its
  // resolved scope so it never overfetches other programs' rows. For program
  // admins this argument is IGNORED — resolveInsightsScope hard-scopes them to
  // their own program server-side so they can't reach across orgs.
  programIds?: string[],
): Promise<Record<string, BCCSurveyResponse[]>> {
  if (surveyTypes.length === 0) return {};
  const { svc, userId, role } = await requireCapability("view_insights");
  const scopeIds = await resolveInsightsScope(role, programIds);

  let publicQuery = svc
    .from("public_survey_responses")
    .select("survey_type, email, full_name, responses, completed_at, programs(slug, name)")
    .in("survey_type", surveyTypes)
    .is("withdrawn_at", null);
  let authQuery = svc
    .from("survey_responses")
    .select(
      "survey_type, student_id, responses, completed_at, program_id, programs(slug, name), students(first_name, last_name, email)",
    )
    .in("survey_type", surveyTypes)
    .not("completed_at", "is", null);
  if (scopeIds) {
    publicQuery = publicQuery.in("program_id", scopeIds);
    authQuery = authQuery.in("program_id", scopeIds);
  }

  const [publicRes, authRes] = await Promise.all([
    publicQuery.order("completed_at", { ascending: false }),
    authQuery.order("completed_at", { ascending: false }),
  ]);

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "view",
    resource: "dashboard_all_survey_responses",
    rowCount: (publicRes.data?.length ?? 0) + ((authRes.data as unknown[])?.length ?? 0),
  });

  const byType: Record<string, BCCSurveyResponse[]> = {};
  for (const t of surveyTypes) byType[t] = [];

  for (const row of publicRes.data ?? []) {
    const surveyType = (row as { survey_type: string }).survey_type;
    const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as { slug: string; name: string } | null;
    (byType[surveyType] ??= []).push({
      survey_type: surveyType,
      full_name: (row as { full_name: string }).full_name,
      email: (row as { email: string }).email,
      program_slug: p?.slug ?? "",
      program_name: p?.name ?? "",
      completed_at: (row as { completed_at: string | null }).completed_at,
      responses: (row as { responses: Record<string, unknown> }).responses,
      source: "public",
    });
  }

  const authData = authRes.data as {
    survey_type: string;
    student_id: string;
    responses: Record<string, unknown>;
    completed_at: string | null;
    programs: { slug: string; name: string } | { slug: string; name: string }[] | null;
    students: { first_name: string; last_name: string; email: string } | null;
  }[] | null;

  // Read-time cohort fallback. Submission stamps `program_variant` from the
  // student's enrollment, but that misses anyone who took a survey BEFORE being
  // enrolled in a track (their tag was never written). Rather than rely on that
  // one moment, re-derive the cohort from current enrollment for any auth
  // response still missing a tag, so Survey Insights groups them correctly.
  const untaggedStudentIds = [
    ...new Set(
      (authData ?? [])
        .filter((r) => !r.responses?.program_variant && !r.responses?._cohort_track)
        .map((r) => r.student_id)
        .filter(Boolean),
    ),
  ];
  const tracksByStudent = new Map<string, string[]>();
  if (untaggedStudentIds.length > 0) {
    const { data: trackRows } = await svc
      .from("student_tracks")
      .select("student_id, track_slug, created_at")
      .in("student_id", untaggedStudentIds)
      .order("created_at");
    for (const t of (trackRows ?? []) as { student_id: string; track_slug: string }[]) {
      const list = tracksByStudent.get(t.student_id) ?? [];
      list.push(t.track_slug);
      tracksByStudent.set(t.student_id, list);
    }
  }

  for (const row of authData ?? []) {
    const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as { slug: string; name: string } | null;
    let responses = row.responses;
    if (!responses?.program_variant && !responses?._cohort_track) {
      const label = deriveCohortLabel(tracksByStudent.get(row.student_id) ?? [], p?.slug ?? "");
      if (label) responses = { ...responses, program_variant: label };
    }
    (byType[row.survey_type] ??= []).push({
      survey_type: row.survey_type,
      full_name: row.students ? `${row.students.first_name} ${row.students.last_name}` : "Unknown",
      email: row.students?.email ?? "",
      program_slug: p?.slug ?? "",
      program_name: p?.name ?? "",
      completed_at: row.completed_at,
      responses,
      source: "authenticated",
    });
  }

  for (const t of surveyTypes) {
    byType[t].sort((a, b) => {
      if (!a.completed_at) return 1;
      if (!b.completed_at) return -1;
      return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
    });
  }

  return byType;
}

// Per-track variant of getDashboardSurveyResponses. Filters authenticated
// responses to students currently enrolled in `trackSlug`. Public responses
// have no student_id to join on, so they're excluded — track-scoped insights
// only show data from enrolled cohort members.
export async function getTrackSurveyResponses(
  surveyType: string,
  trackSlug: string,
): Promise<BCCSurveyResponse[]> {
  const actor = await requireAdmin();
  const { svc, userId } = actor;

  const { data: enrollmentRows } = await svc
    .from("student_tracks")
    .select("student_id")
    .eq("track_slug", trackSlug);

  const enrolledIds = (enrollmentRows ?? []).map((r) => r.student_id);
  if (enrolledIds.length === 0) return [];

  let query = svc
    .from("survey_responses")
    .select(
      "responses, completed_at, program_id, programs(slug, name), students(first_name, last_name, email)",
    )
    .eq("survey_type", surveyType)
    .in("student_id", enrolledIds)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  // Non-super-admins see only their own program's responses, even if the track
  // id resolves to another tenant's cohort.
  if (!canSwitchPrograms(actor.role)) {
    if (!actor.programId) return [];
    query = query.eq("program_id", actor.programId);
  }

  const { data } = await query;

  logAdminAccess(svc, {
    actorUserId: userId,
    programId: null,
    action: "view",
    resource: `track_survey_responses.${surveyType}.${trackSlug}`,
    rowCount: (data as unknown[])?.length ?? 0,
  });

  const rows = data as
    | {
        responses: Record<string, unknown>;
        completed_at: string | null;
        programs: { slug: string; name: string } | { slug: string; name: string }[] | null;
        students: { first_name: string; last_name: string; email: string } | null;
      }[]
    | null;

  return (rows ?? []).map((row) => {
    const p = (Array.isArray(row.programs) ? row.programs[0] : row.programs) as {
      slug: string;
      name: string;
    } | null;
    return {
      survey_type: surveyType,
      full_name: row.students
        ? `${row.students.first_name} ${row.students.last_name}`
        : "Unknown",
      email: row.students?.email ?? "",
      program_slug: p?.slug ?? "",
      program_name: p?.name ?? "",
      completed_at: row.completed_at,
      responses: row.responses,
      source: "authenticated",
    };
  });
}
