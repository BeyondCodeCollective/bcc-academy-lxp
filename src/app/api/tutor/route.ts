import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getProgram } from "@/lib/programs/server";

export async function POST(request: Request) {
  // Require authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const program = await getProgram();

  // Check if tutor is enabled for this program
  if (program.tutorConfig?.enabled === false) {
    return NextResponse.json({
      reply: "The AI Tutor is not available for this program.",
    });
  }

  const { messages } = await request.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      reply:
        "The AI Tutor is being set up — check back soon! In the meantime, feel free to explore the course materials in the Resources section.",
    });
  }

  const systemPrompt = program.tutorConfig?.systemPrompt ?? `You are an AI tutor for ${program.name}. Help students with their coursework.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const reply =
    response.content[0].type === "text"
      ? response.content[0].text
      : "I had trouble generating a response. Could you try rephrasing your question?";

  return NextResponse.json({ reply });
}
