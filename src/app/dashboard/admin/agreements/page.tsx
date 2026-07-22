import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { hasCapability } from "@/lib/roles";
import { getProgram } from "@/lib/programs/server";
import { getOnboardingChecklist } from "@/lib/onboarding/checklists";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/ui";
import { ManageMenu } from "../manage-menu";

export const dynamic = "force-dynamic";

// Who has signed each participation agreement, by cohort. Agreements are stored
// as survey_responses (one survey_type per agreement), so this cross-references
// the enrolled roster against those responses — the clean read for "who's still
// outstanding" that the raw survey table never gave us.

type Enrollee = {
  id: string;
  name: string;
  email: string;
  signed: boolean;
  signedAs: string | null;
  agreedAt: string | null;
};

type Section = { key: string; label: string; enrollees: Enrollee[] };

export default async function AgreementsPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!hasCapability(ctx.student?.role ?? "", "view_insights")) redirect("/dashboard/admin");

  const svc = createServiceClient();
  const program = await getProgram();

  const { data: prog } = await svc
    .from("programs")
    .select("id")
    .eq("slug", program.slug)
    .maybeSingle<{ id: string }>();
  const programId = prog?.id ?? null;

  // Every enrollment in this program → group by track.
  const { data: enrollRows } = programId
    ? await svc
        .from("student_tracks")
        .select("student_id, track_slug")
        .eq("program_id", programId)
    : { data: [] as { student_id: string; track_slug: string }[] };

  const enrollments = (enrollRows ?? []) as { student_id: string; track_slug: string }[];

  // Discover agreements from actual enrollments: a track counts if its onboarding
  // checklist configures an "agreement" item. Plus the standalone Catalyst
  // "Beyond the Game" agreement, which isn't tied to a track checklist.
  const groups: { key: string; label: string; surveyType: string; studentIds: string[] }[] = [];
  const byTrack = new Map<string, string[]>();
  for (const e of enrollments) {
    if (!byTrack.has(e.track_slug)) byTrack.set(e.track_slug, []);
    byTrack.get(e.track_slug)!.push(e.student_id);
  }
  for (const [trackSlug, ids] of byTrack) {
    const checklist = getOnboardingChecklist(trackSlug);
    const item = checklist?.items.find((i) => i.kind === "agreement");
    if (checklist && item) {
      groups.push({
        key: trackSlug,
        label: checklist.cohort || trackSlug,
        surveyType: item.surveyType,
        studentIds: [...new Set(ids)],
      });
    }
  }
  if (program.slug === "atg") {
    groups.push({
      key: "catalyst-atg",
      label: "Catalyst · Beyond the Game",
      surveyType: "catalyst-participation-agreement",
      studentIds: [...new Set(enrollments.map((e) => e.student_id))],
    });
  }

  const sections: Section[] = await Promise.all(
    groups.map(async ({ key, label, surveyType, studentIds }) => {
      if (!studentIds.length) return { key, label, enrollees: [] };
      const [{ data: studentRows }, { data: agreementRows }] = await Promise.all([
        svc.from("students").select("id, first_name, last_name, email").in("id", studentIds),
        svc
          .from("survey_responses")
          .select("student_id, responses, completed_at")
          .eq("survey_type", surveyType)
          .in("student_id", studentIds),
      ]);
      const agreementByStudent = new Map(
        ((agreementRows ?? []) as { student_id: string; responses: Record<string, unknown> | null; completed_at: string | null }[])
          .map((a) => [a.student_id, a]),
      );
      const enrollees: Enrollee[] = ((studentRows ?? []) as {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }[])
        .map((s) => {
          const a = agreementByStudent.get(s.id);
          const resp = (a?.responses ?? {}) as Record<string, unknown>;
          const agreedAt =
            a?.completed_at ?? (typeof resp.agreed_at === "string" ? resp.agreed_at : null);
          return {
            id: s.id,
            name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "(no name on account)",
            email: s.email ?? "",
            signed: !!a?.completed_at,
            signedAs: typeof resp.full_name === "string" ? resp.full_name : null,
            agreedAt,
          };
        })
        .sort((a, b) => Number(b.signed) - Number(a.signed) || a.name.localeCompare(b.name));
      return { key, label, enrollees };
    }),
  );

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—";

  const hasAny = sections.some((s) => s.enrollees.length > 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-8">
      <PageHeader
        title="Participation Agreements"
        subtitle="Who has signed, by cohort"
        noWrap
        actions={<ManageMenu />}
      />

      {!hasAny ? (
        <p className="rounded-lg border border-rule bg-paper-tint-soft px-4 py-8 text-center text-sm text-ink-soft">
          No participation agreements are configured for this program yet.
        </p>
      ) : (
        sections
          .filter((s) => s.enrollees.length > 0)
          .map((s) => {
            const signed = s.enrollees.filter((e) => e.signed).length;
            const outstanding = s.enrollees.length - signed;
            return (
              <section key={s.key} className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-semibold text-ink">{s.label}</h2>
                  <span className="whitespace-nowrap text-xs text-ink-soft">
                    {signed}/{s.enrollees.length} signed
                    {outstanding > 0 && (
                      <span className="ml-1 text-ink-faint">· {outstanding} outstanding</span>
                    )}
                  </span>
                </div>
                <DataTable columns={["Name", "Email", "Status", "Date"]}>
                  {s.enrollees.map((e) => (
                    <tr key={e.id} className="text-ink">
                      <td className="px-4 py-3 align-top font-medium">{e.signedAs || e.name}</td>
                      <td className="px-4 py-3 align-top text-xs text-ink-soft break-all">{e.email}</td>
                      <td className="px-4 py-3 align-top">
                        {e.signed ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                            Signed
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                            Not yet
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap text-xs text-ink-soft">
                        {fmt(e.agreedAt)}
                      </td>
                    </tr>
                  ))}
                </DataTable>
              </section>
            );
          })
      )}
    </div>
  );
}
