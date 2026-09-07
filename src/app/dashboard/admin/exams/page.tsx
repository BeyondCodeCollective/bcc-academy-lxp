import { redirect } from "next/navigation";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel, canSwitchPrograms } from "@/lib/roles";
import { getExam } from "@/lib/exams";
import { getProgram } from "@/lib/programs/server";
import { PageHeader } from "@/components/page-header";
import { BackLink, DataTable } from "@/components/ui";

// Instructor view of practice-exam scores: one row per student with attempt
// count, best, and latest. Unlimited retakes means the trend is the story.

export const dynamic = "force-dynamic";

export default async function ExamScoresPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canAccessAdminPanel(ctx.student?.role ?? "")) redirect("/dashboard");

  // The exam belongs to a Catalyst-hub course. Standing in another program's
  // context, switch the viewer into Catalyst and land back here rather than
  // dead-ending at the admin home.
  const program = await getProgram();
  if (!["catalyst", "marketing"].includes(program.slug)) {
    // Program-switching roles get moved into Catalyst; single-program staff
    // stay in their own panel.
    if (canSwitchPrograms(ctx.student?.role ?? "")) {
      redirect("/api/switch-program?slug=catalyst&next=/dashboard/admin/exams");
    }
    redirect("/dashboard/admin");
  }

  const exam = getExam("network-plus-post")!;
  const svc = createServiceClient();

  const { data: attempts } = await svc
    .from("exam_attempts")
    .select("student_id, submitted_at, score, total")
    .eq("exam_id", exam.id)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: true });

  type Row = {
    studentId: string;
    attempts: number;
    best: number;
    latest: number;
    lastAt: string;
  };
  const byStudent = new Map<string, Row>();
  for (const a of attempts ?? []) {
    const pct = Math.round(((a.score as number) / (a.total as number)) * 1000) / 10;
    const r = byStudent.get(a.student_id as string);
    if (!r) {
      byStudent.set(a.student_id as string, {
        studentId: a.student_id as string,
        attempts: 1,
        best: pct,
        latest: pct,
        lastAt: a.submitted_at as string,
      });
    } else {
      r.attempts++;
      r.best = Math.max(r.best, pct);
      r.latest = pct;
      r.lastAt = a.submitted_at as string;
    }
  }

  const ids = [...byStudent.keys()];
  const { data: students } = ids.length
    ? await svc
        .from("students")
        .select("id, first_name, last_name, email, is_staff, is_test")
        .in("id", ids)
    : { data: [] };
  const nameOf = new Map(
    (students ?? []).map((s) => [
      s.id as string,
      `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || (s.email as string),
    ]),
  );
  // Staff walk the exam to check it works, and those two-minute 20% runs sat in
  // the class list looking like learners who bombed it. Same rule the response
  // rates use: this is a roster of learners, so staff and test accounts are out.
  const isLearner = new Set(
    (students ?? []).filter((s) => !s.is_staff && !s.is_test).map((s) => s.id as string),
  );

  const rows = [...byStudent.values()]
    .filter((r) => isLearner.has(r.studentId))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      {/* Always points at the owning course's Surveys view — that's where this
         page is linked from, and it holds even on a direct/bookmarked visit
         (the generic breadcrumb is suppressed for this route). */}
      <BackLink
        href={`/dashboard/admin?tab=${encodeURIComponent(exam.appliesToTracks[0])}&view=surveys`}
        label="Surveys"
      />
      <PageHeader
        eyebrow="Practice Exams"
        title={exam.title}
        subtitle={`${rows.length} student${rows.length === 1 ? "" : "s"} with submitted attempts · retakes unlimited · share the exam at /dashboard/exam/${exam.id}`}
      />

      {rows.length === 0 ? (
        <div className="panel p-6">
          <p className="text-sm text-ink-soft">
            No attempts yet. Students enrolled in {exam.appliesToTracks.join(", ")} can take
            the exam at <span className="font-mono">/dashboard/exam/{exam.id}</span>.
          </p>
        </div>
      ) : (
        <DataTable
          columns={[
            "Student",
            { label: "Attempts", align: "right" },
            { label: "Best", align: "right" },
            { label: "Latest", align: "right" },
            { label: "Last attempt", align: "right" },
          ]}
        >
          {rows.map((r) => (
            <tr key={r.studentId} className="transition-colors hover:bg-paper-tint-soft">
              <td className="px-4 py-2.5">
                {/* The score alone can't tell an instructor WHICH questions to
                   reteach — the paper itself is one click in. */}
                <Link
                  href={`/dashboard/admin/exams/${r.studentId}`}
                  className="group inline-flex items-center gap-1.5 font-medium text-ink underline-offset-2 hover:underline"
                >
                  {nameOf.get(r.studentId) ?? r.studentId}
                  <CaretRight
                    size={12}
                    weight="bold"
                    className="text-ink-faint transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{r.attempts}</td>
              <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-ink">{r.best}%</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{r.latest}%</td>
              <td className="px-4 py-2.5 text-right text-ink-faint">
                {new Date(r.lastAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
