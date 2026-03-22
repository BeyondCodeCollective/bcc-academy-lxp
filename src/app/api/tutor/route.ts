import { NextResponse } from "next/server";

const DEMO_REPLIES: Record<string, string> = {
  default:
    "Great question! In the CompTIA Tech+ curriculum, that falls under core IT concepts. Let me break it down for you — what specific part are you most curious about?",
  network:
    "Networking is all about how devices communicate. The basics: IP addresses identify devices, DNS translates domain names to IPs, and routers direct traffic between networks. Think of it like a postal system — every device needs an address, and routers are the mail carriers.",
  security:
    "Cybersecurity is one of the hottest areas in tech right now. The fundamentals start with the CIA triad: Confidentiality (keeping data private), Integrity (keeping data accurate), and Availability (keeping systems running). Which of these do you want to explore?",
  cloud:
    "Cloud computing means using someone else's computers over the internet instead of your own hardware. The three main models are IaaS (infrastructure), PaaS (platform), and SaaS (software). AWS, Azure, and Google Cloud are the big three providers.",
};

export async function POST(request: Request) {
  const { messages } = await request.json();
  const lastMessage = messages?.[messages.length - 1]?.content?.toLowerCase() || "";

  // TODO: Replace with actual Claude API call
  // const anthropic = new Anthropic();
  // const response = await anthropic.messages.create({ ... });

  await new Promise((r) => setTimeout(r, 800));

  let reply = DEMO_REPLIES.default;
  if (lastMessage.includes("network") || lastMessage.includes("ip") || lastMessage.includes("dns")) {
    reply = DEMO_REPLIES.network;
  } else if (lastMessage.includes("security") || lastMessage.includes("cyber") || lastMessage.includes("hack")) {
    reply = DEMO_REPLIES.security;
  } else if (lastMessage.includes("cloud") || lastMessage.includes("aws") || lastMessage.includes("azure")) {
    reply = DEMO_REPLIES.cloud;
  }

  return NextResponse.json({ reply });
}
