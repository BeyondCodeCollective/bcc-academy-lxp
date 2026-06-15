import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel } from "@/lib/roles";
import Link from "next/link";
import type { ScoredOutput } from "@/lib/assessment/types";
import { ARCHETYPE_CONTENT } from "@/lib/assessment/content";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/ui";

export default async function AssessmentsAdminPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!canAccessAdminPanel(ctx.student?.role ?? "")) redirect("/dashboard");

  const svc = createServiceClient();

  const { data: rows } = await svc
    .from("assessment_results")
    .select("student_id, completed_at, scored_output, facilitator_viewed_at")
    .order("completed_at", { ascending: false });

  const studentIds = (rows ?? []).map((r) => r.student_id as string);
  const { data: students } = studentIds.length > 0
    ? await svc
        .from("students")
        .select("id, first_name, last_name, email")
        .in("id", studentIds)
    : { data: [] };

  const studentMap = new Map(
    (students ?? []).map((s) => [s.id as string, s as { id: string; first_name: string; last_name: string; email: string }])
  );

  const unviewedCount = (rows ?? []).filter((r) => !r.facilitator_viewed_at).length;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 space-y-6">
      <PageHeader
        title="Pathway Assessments"
        subtitle="Learner pathway profiles"
        actions={
          unviewedCount > 0 && (
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
              {unviewedCount} new
            </span>
          )
        }
      />

      <DataTable columns={["Student", "Archetype", "Pathway", "Completed"]}>
        {(rows ?? []).map((row) => {
          const student = studentMap.get(row.student_id as string);
          const scored = row.scored_output as ScoredOutput;
          const archetype = ARCHETYPE_CONTENT[scored.archetype_primary];
          const isNew = !row.facilitator_viewed_at;
          const completedDate = new Date(row.completed_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

          return (
            <tr key={row.student_id as string} className="hover:bg-paper-tint transition-colors">
              <td className="px-4 py-3">
                <Link href={`/dashboard/admin/assessments/${row.student_id}`} className="group flex items-center gap-2">
                  {isNew && <span className="h-2 w-2 rounded-full bg-accent flex-shrink-0" />}
                  <span className="font-medium text-ink group-hover:text-accent transition-colors">
                    {student ? `${student.first_name} ${student.last_name}` : "Unknown"}
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3 text-ink-soft">{archetype.name}</td>
              <td className="px-4 py-3 text-ink-soft capitalize">{scored.pathway_orientation}</td>
              <td className="px-4 py-3 text-ink-faint">{completedDate}</td>
            </tr>
          );
        })}
        {!rows?.length && (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-ink-faint text-sm">
              No assessments completed yet.
            </td>
          </tr>
        )}
      </DataTable>
    </div>
  );
}
