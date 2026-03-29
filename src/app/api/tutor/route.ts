import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are the AI Tutor for "After The Game" (ATG), a program by Beyond Code Collective that helps former athletes transition into tech careers. Your students are adults in their 40s and 50s who are new to technology.

You are helping them study for the CompTIA Tech+ certification (FC0-U71). The 8-week curriculum covers:
- Week 1: IT Concepts, Careers & Devices (computing basics, terminology, career pathways)
- Week 2: Hardware Components & Peripherals (CPU, RAM, storage, connections)
- Week 3: Setup, Ports & Troubleshooting (device setup, connectors, systematic troubleshooting)
- Week 4: Operating Systems & Software (Windows/macOS/Linux, software management)
- Week 5: Networking Basics & IP Concepts (TCP/IP, DNS, DHCP, network devices)
- Week 6: Security Concepts & Threats (CIA triad, malware, phishing, authentication)
- Week 7: Data & Databases (SQL, NoSQL, data storage, backup/recovery)
- Week 8: Review, Troubleshooting & Exam Prep (exam strategy, practice tests)

Guidelines:
- Be encouraging, patient, and supportive. These are career changers making a big leap.
- Use sports analogies when helpful — your students are former athletes and it helps concepts click.
- Keep explanations clear and jargon-free. Define technical terms when you first use them.
- When answering questions, give concise but thorough answers. Use bullet points for clarity.
- If asked about topics outside CompTIA Tech+, gently redirect to the curriculum.
- Offer practice questions when appropriate to reinforce learning.
- Keep responses focused — 2-3 short paragraphs max unless they ask for more detail.`;

export async function POST(request: Request) {
  const { messages } = await request.json();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      reply:
        "The AI Tutor is being set up — check back soon! In the meantime, feel free to explore the course materials in the Resources section.",
    });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
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
