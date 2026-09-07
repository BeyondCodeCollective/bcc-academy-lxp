import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { canAccessAdminPanel, canSwitchPrograms } from "@/lib/roles";
import { getExam, clientView } from "@/lib/exams";
import { getProgram } from "@/lib/programs/server";
import { PageHeader } from "@/components/page-header";
import { ExamRunner } from "./exam-runner";

// Practice-exam entry. Access mirrors the actions' gate: enrolled in a track
// the exam applies to, or staff. The answer key never reaches this page —
// clientView() strips it before anything renders.

export const dynamic = "force-dynamic";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const exam = getExam(examId);
  if (!exam) redirect("/dashboard");

  const ctx = await getSessionContext();
  if (!ctx) redirect("/");

  const svc = createServiceClient();
  const isStaff = canAccessAdminPanel(ctx.student?.role ?? "");
  if (!isStaff) {
    // Exam switched off for learners — nothing to see, regardless of
    // enrollment. Staff still get through below to preview.
    if (!exam.enabled) redirect("/dashboard");
    // Learner access keys off ENROLLMENT, never the browsing program — a
    // Security+ student opening the link from the apex/marketing context
    // must still get in.
    const { data: enr } = await svc
      .from("student_tracks")
      .select("track_slug")
      .eq("student_id", ctx.userId)
      .in("track_slug", exam.appliesToTracks);
    if (!enr?.length) redirect("/dashboard");
  } else {
    // Staff bypass the enrollment gate, so scope THEM by program context.
    // Wrong context doesn't dead-end at the admin home — it switches the
    // viewer into Catalyst and lands back here, since the exam only exists
    // in one program and the intent of opening the link is unambiguous.
    const program = await getProgram();
    if (!["catalyst", "marketing"].includes(program.slug)) {
      // Program-switching roles get moved into Catalyst; single-program
      // staff (a Forte admin) have no business in another program's exam.
      if (canSwitchPrograms(ctx.student?.role ?? "")) {
        redirect(`/api/switch-program?slug=catalyst&next=/dashboard/exam/${examId}`);
      }
      redirect("/dashboard/admin");
    }
  }

  const { data: attempts } = await svc
    .from("exam_attempts")
    .select("submitted_at, score, total")
    .eq("exam_id", examId)
    .eq("student_id", ctx.userId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  const history = (attempts ?? []).map((a) => ({
    when: a.submitted_at as string,
    score: a.score as number,
    total: a.total as number,
  }));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
      <PageHeader
        eyebrow="Practice Exam"
        title={exam.title}
        subtitle={`${exam.questions.length} questions · ${exam.minutes} minutes · one sitting`}
      />
      <div className="mt-6">
        <ExamRunner exam={clientView(exam)} history={history} />
      </div>
    </div>
  );
}
