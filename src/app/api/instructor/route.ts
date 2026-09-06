import { NextResponse, after } from "next/server";
import { generateText, stepCountIs } from "ai";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { resolveTrackProgram } from "@/lib/programs/server";
import { canAccessAdminPanel } from "@/lib/roles";
import { trackUnitDisplay, unitText } from "@/lib/programs/unit-display";
import {
  buildInstructorSystemPrompt,
  parseInstructorRequest,
  type CheckpointState,
  type DeploymentNote,
  type OpenFlag,
} from "@/lib/instructor/prompt";
import { buildInstructorTools, type InstructorEvent } from "@/lib/instructor/tools";

// Instructor mode: the AI runs a hands-on session in a hosted lab. This is a
// separate AI system from the tutor (src/app/api/tutor/route.ts) on purpose —
// different model, different budget, tools, and a much longer prompt — so a
// change here can't destabilise the study buddy every other program uses.
//
// Availability is data-driven: a track is in instructor mode for a week when a
// session_lessons row exists for it. No config flag to forget.

// Routed through the Vercel AI Gateway with a plain "provider/model" string,
// same as the tutor. The instructor holds a long lesson in context and drives
// tools for an hour; Flash-class models lose the thread. Override per
// environment without a deploy.
const MODEL = process.env.INSTRUCTOR_MODEL ?? "anthropic/claude-sonnet-5";

// A session is ~40 turns; two sessions a day is generous. Same table as the
// tutor so usage shows up in one place (model column tells them apart).
const DAILY_MESSAGE_LIMIT = 120;
// Tool-calling steps per turn: enough to write a file, run it, read the
// output and answer; low enough that a confused loop can't run up the bill.
const MAX_STEPS = 8;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = parseInstructorRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error, reply: parsed.error }, { status: 400 });
  const { trackSlug, weekNumber, voice, messages } = parsed;

  const resolved = await resolveTrackProgram(trackSlug);
  if (!resolved) return NextResponse.json({ error: "Unknown course.", reply: "Unknown course." }, { status: 404 });
  const { program, track } = resolved;
  const week = track.weeks.find((w) => w.week === weekNumber);
  if (!week) return NextResponse.json({ error: "Unknown session.", reply: "Unknown session." }, { status: 404 });

  const svc = createServiceClient();

  const { data: studentRow } = await svc
    .from("students")
    .select("id, program_id, role, first_name")
    .eq("id", user.id)
    .single<{ id: string; program_id: string | null; role: string | null; first_name: string | null }>();
  const isAdmin = canAccessAdminPanel(studentRow?.role ?? "");

  // Enrollment gate, like the week page: only an enrolled learner (or admin)
  // can run a session. The API is its own entry point, so check it here too.
  if (!isAdmin) {
    const { data: enr } = await svc
      .from("student_tracks")
      .select("track_slug, program_id")
      .eq("student_id", user.id)
      .eq("track_slug", trackSlug)
      .maybeSingle<{ track_slug: string; program_id: string }>();
    if (!enr) return NextResponse.json({ error: "Not enrolled.", reply: "You're not enrolled in this course." }, { status: 403 });
  }

  // The lesson decides whether instructor mode exists for this session at all.
  const { data: lesson } = await svc
    .from("session_lessons")
    .select("program_id, body_md")
    .eq("track", trackSlug)
    .eq("week_number", weekNumber)
    .maybeSingle<{ program_id: string; body_md: string }>();
  if (!lesson) {
    return NextResponse.json(
      { error: "No instructor for this session.", reply: "This session doesn't have an instructor yet." },
      { status: 404 },
    );
  }
  const programId = lesson.program_id;

  // Daily cap.
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count: todayCount } = await svc
    .from("tutor_messages")
    .select("*", { count: "exact", head: true })
    .eq("student_id", user.id)
    .eq("model", MODEL)
    .gte("created_at", dayStart.toISOString());
  if ((todayCount ?? 0) >= DAILY_MESSAGE_LIMIT) {
    return NextResponse.json(
      { reply: "That's a full day of sessions. Your lab is saved exactly where you left it — pick up tomorrow." },
      { status: 429 },
    );
  }

  // Learner state the instructor needs: their running example, which human
  // checkpoints are signed off, and flags already waiting for the facilitator.
  const [notesRes, cpRes, flagsRes] = await Promise.all([
    svc.from("deployment_notes").select("key, value").eq("student_id", user.id).eq("track_slug", trackSlug).order("updated_at"),
    svc.from("human_checkpoints").select("checkpoint_key, approved_at, note").eq("student_id", user.id).eq("track_slug", trackSlug),
    svc.from("instructor_flags").select("reason, note, created_at").eq("student_id", user.id).eq("track_slug", trackSlug).eq("status", "open"),
  ]);
  const notes = (notesRes.data ?? []) as DeploymentNote[];
  const checkpoints = ((cpRes.data ?? []) as { checkpoint_key: string; approved_at: string; note: string | null }[]).map(
    (c): CheckpointState => ({ key: c.checkpoint_key, approved_at: c.approved_at, note: c.note }),
  );
  const openFlags = (flagsRes.data ?? []) as OpenFlag[];

  const { display } = trackUnitDisplay(track);
  const unitName = unitText(display, weekNumber, track.unitLabel ?? "Session");

  const system = buildInstructorSystemPrompt({
    programName: program.name,
    trackName: track.name,
    unitName,
    weekNumber,
    learnerFirstName: studentRow?.first_name ?? null,
    lessonMarkdown: lesson.body_md,
    notes,
    checkpoints,
    openFlags,
    voice,
  });

  const events: InstructorEvent[] = [];
  const tools = buildInstructorTools({
    svc,
    studentId: user.id,
    programId,
    trackSlug,
    weekNumber,
    events,
  });

  let result;
  try {
    result = await generateText({
      model: MODEL,
      system,
      messages,
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
      maxOutputTokens: 1200,
    });
  } catch (err) {
    console.error("[instructor] model call failed", err);
    return NextResponse.json(
      { reply: "I lost the thread for a second. Say that again and we'll carry on exactly where we were.", events },
      { status: 503 },
    );
  }

  const reply =
    result.text.trim() ||
    // A turn that was all tool calls and no words: still end with the one
    // thing to do, so the learner is never left staring at silence.
    "Done. Tell me what you see, or say \"next\".";

  after(async () => {
    await svc.from("tutor_messages").insert({
      student_id: user.id,
      program_id: studentRow?.program_id ?? programId,
      track_slug: trackSlug,
      week_number: weekNumber,
      input_tokens: result.usage?.inputTokens ?? null,
      output_tokens: result.usage?.outputTokens ?? null,
      model: MODEL,
    });
  });

  return NextResponse.json({ reply, events });
}
