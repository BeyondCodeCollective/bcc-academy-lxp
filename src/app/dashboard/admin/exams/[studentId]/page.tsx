import { redirect } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel, canSwitchPrograms } from "@/lib/roles";
import { isPreviewingAsStudent } from "@/lib/auth/preview-mode";
import { getExam, reviewAttempt } from "@/lib/exams";
import { getProgram } from "@/lib/programs/server";
import { PageHeader } from "@/components/page-header";
import { BackLink, microLabel } from "@/components/ui";

// One student's practice-exam paper, item by item: what they picked and what
// was right. This is the instructor's teaching view — the learner's own result
// screen still withholds the answer key, because retakes are unlimited.

export const dynamic = "force-dynamic";

type Attempt = {
  id: string;
  started_at: string;
  submitted_at: string;
  score: number;
  total: number;
  domain_scores: { domain: string; correct: number; total: number }[] | null;
  answers: Record<string, number> | null;
};

function pct(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
}

// Same thresholds the response-rate list uses: under half is where a score
// stops being a pass signal and starts being a follow-up.
function scoreTone(p: number): string {
  if (p >= 85) return "text-success-text";
  if (p >= 60) return "text-ink";
  return "text-warning-text";
}

export default async function StudentExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { studentId } = await params;
  const { attempt: wantedAttempt } = await searchParams;

  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  const role = ctx.student?.role ?? "";
  if (!canAccessAdminPanel(role)) redirect("/dashboard");
  // Previewing as a student means seeing what a student sees. An item-level
  // answer key is the one thing this page must never show in that mode.
  if (await isPreviewingAsStudent(role)) redirect("/dashboard");

  const program = await getProgram();
  if (!["catalyst", "marketing"].includes(program.slug)) {
    if (canSwitchPrograms(role)) {
      redirect(
        `/api/switch-program?slug=catalyst&next=/dashboard/admin/exams/${studentId}`,
      );
    }
    redirect("/dashboard/admin");
  }

  const exam = getExam("network-plus-post")!;
  const svc = createServiceClient();

  const [{ data: student }, { data: attemptRows }] = await Promise.all([
    svc
      .from("students")
      .select("id, first_name, last_name, email")
      .eq("id", studentId)
      .maybeSingle<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
      }>(),
    svc
      .from("exam_attempts")
      .select("id, started_at, submitted_at, score, total, domain_scores, answers")
      .eq("exam_id", exam.id)
      .eq("student_id", studentId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false }),
  ]);

  if (!student) redirect("/dashboard/admin/exams");
  const attempts = (attemptRows ?? []) as Attempt[];
  const name =
    `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || student.email;

  const current =
    attempts.find((a) => a.id === wantedAttempt) ?? attempts[0] ?? null;

  const review = current ? reviewAttempt(exam, current.answers ?? {}) : [];
  const missedCount = review.filter((q) => !q.isCorrect).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
      <BackLink href="/dashboard/admin/exams" label="Practice exams" />
      <PageHeader
        eyebrow={exam.title}
        title={name}
        subtitle={
          attempts.length === 0
            ? "No submitted attempts yet."
            : `${attempts.length} submitted attempt${attempts.length === 1 ? "" : "s"} · ${student.email}`
        }
      />

      {attempts.length === 0 ? (
        <div className="panel p-6">
          <p className="text-sm text-ink-soft">
            This student hasn&apos;t submitted the exam yet.
          </p>
        </div>
      ) : (
        <>
          {/* Attempt switcher — only earns its space once there's a retake to
             compare against. */}
          {attempts.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {attempts.map((a, i) => {
                const active = a.id === current!.id;
                return (
                  <Link
                    key={a.id}
                    href={`/dashboard/admin/exams/${studentId}?attempt=${a.id}`}
                    className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-rule text-ink-soft hover:border-ink-faint"
                    }`}
                  >
                    {i === 0 ? "Latest" : `Attempt ${attempts.length - i}`} ·{" "}
                    {pct(a.score, a.total)}%
                  </Link>
                );
              })}
            </div>
          )}

          {current && (
            <>
              <div className="panel p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className={microLabel}>Score</p>
                    <p
                      className={`mt-1 text-3xl font-semibold tabular-nums ${scoreTone(
                        pct(current.score, current.total),
                      )}`}
                    >
                      {pct(current.score, current.total)}%
                    </p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {current.score} of {current.total} correct ·{" "}
                      {Math.max(
                        1,
                        Math.round(
                          (new Date(current.submitted_at).getTime() -
                            new Date(current.started_at).getTime()) /
                            60000,
                        ),
                      )}{" "}
                      min · submitted{" "}
                      {new Date(current.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Domain breakdown — where to aim the next review session. */}
                {(current.domain_scores ?? []).length > 0 && (
                  <div className="mt-5 space-y-2.5">
                    <p className={microLabel}>By exam domain</p>
                    {(current.domain_scores ?? []).map((d) => {
                      const p = pct(d.correct, d.total);
                      return (
                        <div key={d.domain} className="flex items-center gap-3">
                          <span className="w-32 shrink-0 truncate text-xs text-ink-soft sm:w-56">
                            {d.domain}
                          </span>
                          <span
                            className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-paper-tint-soft"
                            aria-hidden
                          >
                            <span
                              className="block h-full rounded-full bg-ink"
                              style={{ width: `${p}%` }}
                            />
                          </span>
                          <span className="w-20 shrink-0 text-right text-xs tabular-nums text-ink-soft">
                            {d.correct}/{d.total} · {Math.round(p)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className={microLabel}>
                  Every question · {missedCount} missed
                </p>
                <div className="panel divide-y divide-rule">
                  {review.map((q) => (
                    <div key={q.n} className="flex gap-3 px-4 py-3">
                      <span
                        className={`mt-0.5 w-5 shrink-0 text-sm font-semibold ${
                          q.isCorrect ? "text-success-text" : "text-warning-text"
                        }`}
                        aria-label={q.isCorrect ? "Correct" : "Incorrect"}
                      >
                        {q.isCorrect ? "✓" : "✗"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">
                          <span className="text-ink-faint tabular-nums">
                            {q.n}.
                          </span>{" "}
                          {q.prompt}
                        </p>
                        <p className="mt-1 text-xs text-ink-faint">{q.domain}</p>
                        <div className="mt-2 space-y-1 text-xs">
                          <p
                            className={
                              q.isCorrect ? "text-success-text" : "text-warning-text"
                            }
                          >
                            <span className="text-ink-faint">Answered: </span>
                            {q.answered ?? "left blank"}
                          </p>
                          {!q.isCorrect && (
                            <p className="text-ink-soft">
                              <span className="text-ink-faint">Correct: </span>
                              {q.correct}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
