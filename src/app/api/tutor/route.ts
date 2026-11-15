import { NextResponse, after } from "next/server";
import { generateText } from "ai";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { isTutorAvailable } from "@/lib/programs";
import { getLearnerAccess } from "@/lib/auth/active-enrollment";
import { isStaffEmail } from "@/lib/auth/admins";
import { canAccessAdminPanel } from "@/lib/roles";
import { computeCurrentWeek, trackHasStarted } from "@/lib/utils";
import type { TrackConfig, WeekConfig } from "@/lib/programs/types";
import { buildTutorSystemPrompt, parseTutorRequest } from "@/lib/tutor/prompt";
import { aiModel, aiModelName, aiProviderOptions } from "@/lib/ai/model";

// Per-student daily ceiling. Low-enough to keep costs sane if usage
// surges; high-enough that a real student asking real questions won't
// bounce off it mid-session.
const DAILY_MESSAGE_LIMIT = 30;

// Model + provider options come from src/lib/ai/model.ts so the provider is one
// env var rather than four edits. Default is unchanged: Gemini Flash via the
// Vercel AI Gateway.

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const program = await getProgram();

  if (!isTutorAvailable(program)) {
    return NextResponse.json({
      reply: "The AI Tutor is not available for this program.",
    });
  }

  // SECURITY: a pending registrant (enrolled only in a not-yet-started course)
  // can't use the tutor until their course begins. The dashboard layout confines
  // them, but the API is a separate entry point — guard it directly. Staff exempt.
  const access = await getLearnerAccess(supabase, user.id, program);
  if (access.pendingOnly && !isStaffEmail(user.email)) {
    return NextResponse.json(
      { reply: "Your course hasn't started yet — the AI Tutor unlocks the day it begins." },
      { status: 403 },
    );
  }

  // Validated, not cast. The previous `as` told the type checker the body was
  // well-formed and checked nothing at runtime, so a caller could forge system
  // turns or post an unbounded history.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = parseTutorRequest(body);
  if (!parsed.ok) {
    // `reply` as well as `error`: the chat UI renders data.reply and nothing
    // else, so an error-only body shows the learner a generic "couldn't process
    // that" instead of the actual reason.
    return NextResponse.json({ error: parsed.error, reply: parsed.error }, { status: 400 });
  }
  const messages = parsed.messages;

  const svc = createServiceClient();

  // Look up student → program_id. Needed for logging + enrolled-track
  // resolution below. A missing student row is an odd state; treat it
  // as not-yet-enrolled and answer without per-week context.
  const { data: studentRow } = await svc
    .from("students")
    .select("id, program_id, role")
    .eq("id", user.id)
    .single();

  // No profile row means no rate-limit accounting (the log insert is keyed on it).
  if (!studentRow?.program_id) {
    return NextResponse.json({ error: "Forbidden", reply: "The AI Tutor needs a completed profile." }, { status: 403 });
  }

  // Rate limit: count today's (UTC day) tutor_messages for this student.
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count: todayCount } = await svc
    .from("tutor_messages")
    .select("*", { count: "exact", head: true })
    .eq("student_id", user.id)
    .gte("created_at", dayStart.toISOString());

  if ((todayCount ?? 0) >= DAILY_MESSAGE_LIMIT) {
    return NextResponse.json(
      {
        reply: `You've hit today's tutor message limit (${DAILY_MESSAGE_LIMIT}). Come back tomorrow — your coursework in Resources keeps you moving in the meantime.`,
      },
      { status: 429 },
    );
  }

  // Figure out which track + week to inject as context. Prefer an
  // enrolled track the student picked; otherwise fall back to the
  // first configured track so the prompt still has something useful.
  const { data: trackRows } = await svc
    .from("student_tracks")
    .select("track_slug")
    .eq("student_id", user.id);

  const enrolledSlugs = new Set(
    (trackRows ?? []).map((r: { track_slug: string }) => r.track_slug),
  );

  if (enrolledSlugs.size === 0 && !isStaffEmail(user.email) && !canAccessAdminPanel(studentRow.role ?? "")) {
    return NextResponse.json(
      { error: "Forbidden", reply: "The AI Tutor is for enrolled learners." },
      { status: 403 },
    );
  }

  const activeTrack: TrackConfig | undefined =
    program.tracks.find((t) => enrolledSlugs.has(t.slug)) ?? program.tracks[0];

  let currentWeekNumber: number | null = null;
  let activeWeek: WeekConfig | undefined;
  if (activeTrack) {
    const now = new Date();
    const started = trackHasStarted(activeTrack, now);
    currentWeekNumber = started
      ? computeCurrentWeek(
          activeTrack.startDate,
          activeTrack.totalWeeks,
          activeTrack.lastSessionDayOffset,
        )
      : 1;
    activeWeek =
      activeTrack.weeks.find((w) => w.week === currentWeekNumber) ??
      activeTrack.weeks[0];
  }

  const systemPrompt = buildTutorSystemPrompt({
    program,
    track: activeTrack,
    week: activeWeek,
    currentWeekNumber,
  });

  // Reserve the slot before the model call so parallel requests can't all
  // slip under the daily limit; token counts are filled in afterwards.
  const { data: reserved } = await svc
    .from("tutor_messages")
    .insert({
      student_id: user.id,
      program_id: studentRow.program_id,
      track_slug: activeTrack?.slug ?? null,
      week_number: currentWeekNumber,
      model: aiModelName(),
    })
    .select("id")
    .single<{ id: string }>();

  let result;
  try {
    result = await generateText({
      model: aiModel(),
      maxOutputTokens: 1024,
      providerOptions: aiProviderOptions(),
      system: systemPrompt,
      messages,
    });
  } catch (err) {
    // Model call failed (timeout, rate limit, gateway/provider outage). Log it
    // so we can see breakage in Vercel logs, and degrade gracefully — never
    // 500 at a student mid-question.
    console.error("[tutor] model call failed", err);
    return NextResponse.json(
      {
        reply:
          "I'm having trouble reaching my brain right now — give it a moment and try again. Your course materials in Resources are always available in the meantime.",
      },
      { status: 503 },
    );
  }

  const reply =
    result.text.trim() ||
    "I had trouble generating a response. Could you try rephrasing your question?";

  if (reserved?.id) {
    after(async () => {
      await svc
        .from("tutor_messages")
        .update({
          input_tokens: result.usage?.inputTokens ?? null,
          output_tokens: result.usage?.outputTokens ?? null,
        })
        .eq("id", reserved.id);
    });
  }

  return NextResponse.json({ reply });
}
