import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";
import { isTutorAvailable } from "@/lib/programs";
import { computeCurrentWeek } from "@/lib/utils";
import type { TrackConfig, WeekConfig } from "@/lib/programs/types";

// Per-student daily ceiling. Low-enough to keep costs sane if usage
// surges; high-enough that a real student asking real questions won't
// bounce off it mid-session.
const DAILY_MESSAGE_LIMIT = 30;

// Routed through the Vercel AI Gateway via the AI SDK's plain "provider/model"
// string. On Vercel the gateway authenticates automatically (OIDC); locally it
// needs AI_GATEWAY_API_KEY. Swapping models later is a one-line change here.
const MODEL = "google/gemini-2.5-flash";

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

  const { messages } = (await request.json()) as {
    messages: { role: string; content: string }[];
  };

  const svc = createServiceClient();

  // Look up student → program_id. Needed for logging + enrolled-track
  // resolution below. A missing student row is an odd state; treat it
  // as not-yet-enrolled and answer without per-week context.
  const { data: studentRow } = await svc
    .from("students")
    .select("id, program_id, role")
    .eq("id", user.id)
    .single();

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

  const activeTrack: TrackConfig | undefined =
    program.tracks.find((t) => enrolledSlugs.has(t.slug)) ?? program.tracks[0];

  let currentWeekNumber: number | null = null;
  let activeWeek: WeekConfig | undefined;
  if (activeTrack) {
    const now = new Date();
    const started = now >= new Date(activeTrack.startDate);
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

  const contextBlock = activeTrack && activeWeek
    ? [
        "",
        "—",
        `The student is currently in the "${activeTrack.name}" track, Week ${currentWeekNumber ?? activeWeek.week}: "${activeWeek.title}"${activeWeek.subtitle ? ` — ${activeWeek.subtitle}` : ""}.`,
        activeWeek.description ?? "",
        activeWeek.objectives?.length
          ? `This week's objectives:\n${activeWeek.objectives.map((o) => `- ${o}`).join("\n")}`
          : "",
        "Lean into this week's material when it helps — but answer earlier questions if they ask.",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const baseSystemPrompt =
    program.tutorConfig?.systemPrompt ??
    `You are an AI tutor for ${program.name}. Help students with their coursework.`;

  const systemPrompt = baseSystemPrompt + contextBlock;

  let result;
  try {
    result = await generateText({
      model: MODEL,
      maxOutputTokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
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

  // Log exchange — never block the reply on a log failure.
  if (studentRow?.program_id) {
    void svc.from("tutor_messages").insert({
      student_id: user.id,
      program_id: studentRow.program_id,
      track_slug: activeTrack?.slug ?? null,
      week_number: currentWeekNumber,
      input_tokens: result.usage?.inputTokens ?? null,
      output_tokens: result.usage?.outputTokens ?? null,
      model: MODEL,
    });
  }

  return NextResponse.json({ reply });
}
