"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getExam, grade } from "@/lib/exams";
import { canAccessAdminPanel } from "@/lib/roles";

// Grace on top of the exam clock: covers the auto-submit round trip and slow
// networks, not a meaningful extension.
const GRACE_MS = 2 * 60 * 1000;

type Gate = {
  svc: ReturnType<typeof createServiceClient>;
  userId: string;
};

/** Enrolled in a track the exam applies to, or staff. */
async function requireExamAccess(examId: string): Promise<Gate | { error: string }> {
  const exam = getExam(examId);
  if (!exam) return { error: "Unknown exam." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const svc = createServiceClient();
  const { data: student } = await svc
    .from("students")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (canAccessAdminPanel(student?.role ?? "")) return { svc, userId: user.id };

  if (!exam.enabled) return { error: "This exam isn't open right now." };

  const { data: enr } = await svc
    .from("student_tracks")
    .select("track_slug")
    .eq("student_id", user.id)
    .in("track_slug", exam.appliesToTracks);
  if (!enr?.length) return { error: "This exam isn't assigned to any of your courses." };

  return { svc, userId: user.id };
}

export async function startExamAttempt(
  examId: string,
): Promise<{ ok: true; attemptId: string; deadline: string } | { ok: false; error: string }> {
  const gate = await requireExamAccess(examId);
  if ("error" in gate) return { ok: false, error: gate.error };
  const exam = getExam(examId)!;

  // Resume an open attempt instead of stacking a new one on reload.
  const { data: open } = await gate.svc
    .from("exam_attempts")
    .select("id, started_at")
    .eq("exam_id", examId)
    .eq("student_id", gate.userId)
    .is("submitted_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; started_at: string }>();

  if (open) {
    const deadline = new Date(open.started_at).getTime() + exam.minutes * 60 * 1000;
    if (Date.now() < deadline) {
      return { ok: true, attemptId: open.id, deadline: new Date(deadline).toISOString() };
    }
    // Expired and never submitted: close it empty so history is honest.
    await gate.svc
      .from("exam_attempts")
      .update({ submitted_at: new Date().toISOString(), answers: {}, score: 0, total: exam.questions.length })
      .eq("id", open.id);
  }

  const { data: row, error } = await gate.svc
    .from("exam_attempts")
    .insert({ exam_id: examId, student_id: gate.userId })
    .select("id, started_at")
    .single<{ id: string; started_at: string }>();
  if (error || !row) return { ok: false, error: "Could not start the exam. Please try again." };

  return {
    ok: true,
    attemptId: row.id,
    deadline: new Date(new Date(row.started_at).getTime() + exam.minutes * 60 * 1000).toISOString(),
  };
}

export type ExamResult = {
  score: number;
  total: number;
  percent: number;
  domainScores: { domain: string; correct: number; total: number }[];
  /** What was missed and what the learner answered — never the correct answer. */
  missed: { n: number; domain: string; prompt: string; answered: string | null }[];
};

export async function submitExamAttempt(params: {
  examId: string;
  attemptId: string;
  answers: Record<string, number>;
}): Promise<{ ok: true; result: ExamResult } | { ok: false; error: string }> {
  const gate = await requireExamAccess(params.examId);
  if ("error" in gate) return { ok: false, error: gate.error };
  const exam = getExam(params.examId)!;

  const { data: attempt } = await gate.svc
    .from("exam_attempts")
    .select("id, started_at, submitted_at")
    .eq("id", params.attemptId)
    .eq("student_id", gate.userId)
    .eq("exam_id", params.examId)
    .maybeSingle<{ id: string; started_at: string; submitted_at: string | null }>();
  if (!attempt) return { ok: false, error: "Attempt not found." };
  if (attempt.submitted_at) return { ok: false, error: "This attempt was already submitted." };

  const deadline = new Date(attempt.started_at).getTime() + exam.minutes * 60 * 1000;
  if (Date.now() > deadline + GRACE_MS) {
    return { ok: false, error: "Time expired for this attempt. Start a new attempt to try again." };
  }

  const graded = grade(exam, params.answers ?? {});
  const { error } = await gate.svc
    .from("exam_attempts")
    .update({
      submitted_at: new Date().toISOString(),
      answers: params.answers ?? {},
      score: graded.score,
      total: graded.total,
      domain_scores: graded.domainScores,
    })
    .eq("id", attempt.id);
  if (error) return { ok: false, error: "Could not save your submission. Please try again." };

  return {
    ok: true,
    result: {
      score: graded.score,
      total: graded.total,
      percent: Math.round((graded.score / graded.total) * 1000) / 10,
      domainScores: graded.domainScores,
      missed: graded.missed,
    },
  };
}
