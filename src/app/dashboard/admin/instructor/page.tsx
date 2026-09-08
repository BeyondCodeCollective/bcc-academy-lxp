import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { hasCapability } from "@/lib/roles";
import { isMasterEmail } from "@/lib/auth/admins";
import { createServiceClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { HUMAN_CHECKPOINTS } from "@/lib/instructor/prompt";
import { InstructorQueue, type QueueFlag, type QueueLearner } from "./queue";

// The facilitator's desk for instructor-mode tracks. Two lists, both written
// by the AI instructor and read back by it: flags it raised because a call is a
// human's, and the checkpoints only a human can pass. This is the agenda for
// office hours, and where "human in the lead" is actually enforced.

export const dynamic = "force-dynamic";

type FlagRow = {
  id: string;
  student_id: string;
  program_id: string;
  track_slug: string;
  week_number: number | null;
  reason: string;
  note: string;
  created_at: string;
};
type StudentRow = { id: string; first_name: string | null; last_name: string | null; email: string | null };

export default async function InstructorQueuePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  const role = ctx.student?.role ?? "";
  if (!isMasterEmail(ctx.userEmail) && !hasCapability(role, "facilitate_cohort")) redirect("/dashboard/admin");

  const svc = createServiceClient();

  // Which tracks are in instructor mode at all.
  const { data: lessonTracks } = await svc.from("session_lessons").select("track, program_id");
  const trackPrograms = new Map<string, string>();
  for (const r of (lessonTracks ?? []) as { track: string; program_id: string }[]) trackPrograms.set(r.track, r.program_id);
  const tracks = [...trackPrograms.keys()];

  if (tracks.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 py-8 space-y-6">
        <PageHeader eyebrow="Instructor" title="Instructor queue" subtitle="No course is in instructor mode yet." />
      </div>
    );
  }

  const [flagsRes, enrolRes, cpRes, notesRes] = await Promise.all([
    svc
      .from("instructor_flags")
      .select("id, student_id, program_id, track_slug, week_number, reason, note, created_at")
      .in("track_slug", tracks)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    svc.from("student_tracks").select("student_id, track_slug, program_id").in("track_slug", tracks),
    svc.from("human_checkpoints").select("student_id, track_slug, checkpoint_key, approved_at, score").in("track_slug", tracks),
    svc.from("deployment_notes").select("student_id, track_slug, key, value").in("track_slug", tracks).in("key", ["workflow", "business_number", "industry"]),
  ]);

  const flags = (flagsRes.data ?? []) as FlagRow[];
  const enrollments = (enrolRes.data ?? []) as { student_id: string; track_slug: string; program_id: string }[];
  const checkpoints = (cpRes.data ?? []) as { student_id: string; track_slug: string; checkpoint_key: string; approved_at: string; score: number | null }[];
  const notes = (notesRes.data ?? []) as { student_id: string; track_slug: string; key: string; value: string }[];

  const studentIds = [...new Set([...enrollments.map((e) => e.student_id), ...flags.map((f) => f.student_id)])];
  const { data: students } = studentIds.length
    ? await svc.from("students").select("id, first_name, last_name, email").in("id", studentIds)
    : { data: [] as StudentRow[] };
  const byId = new Map((students ?? []).map((s) => [s.id, s as StudentRow]));
  const nameOf = (id: string) => {
    const s = byId.get(id);
    const n = [s?.first_name, s?.last_name].filter(Boolean).join(" ");
    return n || s?.email || "Learner";
  };

  const queueFlags: QueueFlag[] = flags.map((f) => ({
    id: f.id,
    learner: nameOf(f.student_id),
    trackSlug: f.track_slug,
    weekNumber: f.week_number,
    reason: f.reason,
    note: f.note,
    createdAt: f.created_at,
  }));

  const learners: QueueLearner[] = enrollments.map((e) => {
    const mine = checkpoints.filter((c) => c.student_id === e.student_id && c.track_slug === e.track_slug);
    const myNotes = notes.filter((n) => n.student_id === e.student_id && n.track_slug === e.track_slug);
    return {
      studentId: e.student_id,
      programId: e.program_id,
      trackSlug: e.track_slug,
      name: nameOf(e.student_id),
      workflow: myNotes.find((n) => n.key === "workflow")?.value ?? null,
      industry: myNotes.find((n) => n.key === "industry")?.value ?? null,
      businessNumber: myNotes.find((n) => n.key === "business_number")?.value ?? null,
      checkpoints: HUMAN_CHECKPOINTS.map((c) => {
        const hit = mine.find((m) => m.checkpoint_key === c.key);
        return { key: c.key, label: c.label, approvedAt: hit?.approved_at ?? null, score: hit?.score ?? null };
      }),
      openFlags: flags.filter((f) => f.student_id === e.student_id && f.track_slug === e.track_slug).length,
    };
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-5 py-8 space-y-6">
      <PageHeader
        eyebrow="Instructor"
        title="Instructor queue"
        subtitle="What the AI instructor handed to a human. Open flags are the office-hours agenda; the four checkpoints are gates only you can pass. Every sign-off here changes what the learner hears on their next turn."
      />
      <InstructorQueue flags={queueFlags} learners={learners} />
    </div>
  );
}
