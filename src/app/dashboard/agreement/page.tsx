import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { getProgram } from "@/lib/programs/server";
import { createServiceClient } from "@/lib/supabase/server";
import { CatalystAgreement } from "@/components/catalyst-agreement";

// Standalone participation-agreement signing page. Auth-gated (own check +
// dashboard layout), and exempt from the layout's confinement redirects so a
// shared link always lands here. Records the signature under the learner's
// account via signCatalystAgreement.
export const dynamic = "force-dynamic";

export default async function AgreementPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");

  const program = await getProgram();
  const svc = createServiceClient();

  const [{ data: existing }, { data: student }] = await Promise.all([
    svc
      .from("survey_responses")
      .select("responses, completed_at")
      .eq("student_id", ctx.userId)
      .eq("survey_type", "catalyst-participation-agreement")
      .maybeSingle(),
    svc.from("students").select("first_name, last_name").eq("id", ctx.userId).maybeSingle(),
  ]);

  const responses = (existing?.responses ?? {}) as Record<string, unknown>;
  const priorName = typeof responses.full_name === "string" ? responses.full_name : undefined;
  const nameFromProfile = student
    ? `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim()
    : "";

  return (
    <CatalystAgreement
      programSlug={program.slug}
      defaultName={priorName ?? nameFromProfile}
      alreadySigned={!!existing?.completed_at}
      signedName={priorName}
      signedAt={existing?.completed_at ?? undefined}
    />
  );
}
