// Workshop hub data. Adding a new workshop is a single object entry —
// no new routes, no nav wiring. The index and detail pages under
// /dashboard/workshops/* iterate over WORKSHOPS.
//
// Workshops differ from tracks (multi-week curriculum tied to a cohort)
// and Lunch & Learns (single-session recordings). A "workshop" is a
// defined event — virtual or IRL, single-session or multi-day — with a
// fixed roster and (usually) a deliverable. Past workshops are archived
// here for the alumni record + institutional memory.

export type WorkshopModality = "in-person" | "virtual" | "hybrid";
export type WorkshopStatus = "past" | "upcoming";

export type Workshop = {
  slug: string;
  title: string;
  shortName?: string;
  tagline: string;
  description: string;
  modality: WorkshopModality;
  status: WorkshopStatus;
  date: string; // ISO date, or YYYY-MM for month-only precision
  endDate?: string; // for multi-day workshops
  durationLabel: string;
  location: string;
  audience: string;
  capacity?: number;
  alumniCount?: number;
  partners: string[];
  tools?: string[];
  outcomes: string[];
  highlights?: string[];
  facilitators?: string[];
  credentialName?: string;
  capstone?: { title: string; description: string };
  icon: string;
  tone: string;
};

export const WORKSHOPS: Workshop[] = [
  {
    slug: "ai-fundamentals-fellowship",
    title: "AI Fundamentals Fellowship",
    shortName: "AI Fellowship",
    tagline:
      "A 4-day spring break immersion for NYC teens curious about AI and its real-world applications.",
    description:
      "The Beyond Code Collective AI Fundamentals Fellowship was a free, immersive learning experience for NYC high school juniors and seniors. 35 selected students came together for four full days of learning, exploration, and career exposure in AI — anchored by the IBM SkillsBuild curriculum and culminating in an AI for Social Good capstone.",
    modality: "in-person",
    status: "past",
    date: "2026-04-07",
    endDate: "2026-04-10",
    durationLabel: "4 days · 9:45 AM – 4:00 PM",
    location: "BGC Learning Center, NYC",
    audience: "NYC high school juniors & seniors",
    capacity: 35,
    alumniCount: 35,
    partners: [
      "IBM SkillsBuild",
      "NYU Interactive Media Arts",
      "Boys & Girls Clubs",
    ],
    tools: [
      "IBM SkillsBuild",
      "IBM Watson Studio",
      "Lovable",
      "GitHub",
    ],
    outcomes: [
      "Fundamentals of artificial intelligence, including its history and future impact",
      "Core concepts in machine learning, deep learning, and computer vision",
      "How AI systems are developed and applied across industries",
      "The importance of AI ethics and responsible innovation",
      "Career pathways and opportunities in AI and technology",
    ],
    highlights: [
      "Day 3 field trip to NYU Interactive Media Arts",
      "Daily soft-skills and guest-speaker sessions",
      "Professional headshots and digital credential on Day 4",
      "Group capstone — AI for Social Good",
    ],
    credentialName: "IBM SkillsBuild AI Digital Credential",
    capstone: {
      title: "AI for Social Good",
      description:
        "Groups of 2–4 fellows imagined an AI-powered application addressing a community need. Phases: define the problem, design the solution, assess the impact, present the blueprint. Pitches were delivered on the final day.",
    },
    icon: "✨",
    tone: "#E54D2E",
  },
  {
    slug: "coding-herstory",
    title: "Coding Herstory: Celebrating Women in Music with Python and AI",
    shortName: "Coding Herstory",
    tagline:
      "A Women's History Month workshop celebrating Black women in music through Python coding and AI music generation.",
    description:
      "Participants used Python and AI to create an original R&B track celebrating the contributions of Black women in music. Through EarSketch, students explored coding basics and AI tools to craft a musical masterpiece inspired by icons like Alicia Keys and Ciara.",
    modality: "in-person",
    status: "past",
    date: "2026-03",
    durationLabel: "1.5 hours",
    location: "In-person",
    audience: "Ages 14–18",
    partners: ["Black Girls Code"],
    tools: ["EarSketch (Python DAW)", "Mubert (AI text-to-music)"],
    outcomes: [
      "Connect coding to the history of the R&B music genre",
      "Compose an original R&B song with Python in EarSketch",
      "Apply functions, variables, and comments via fitMedia() and setTempo()",
      "Generate a parallel AI track in Mubert and contrast with the hand-coded version",
    ],
    highlights: [
      "Sound exploration: pick four samples, then layer with fitMedia()",
      "Share the resulting track with a partner",
      "Hands-on intro to a digital audio workstation (DAW)",
    ],
    icon: "🎵",
    tone: "#7C3AED",
  },
];

export function getWorkshop(slug: string): Workshop | null {
  return WORKSHOPS.find((w) => w.slug === slug) ?? null;
}

export function getAllWorkshops(): Workshop[] {
  // Upcoming first (chronological), then past (most-recent first).
  const upcoming = WORKSHOPS.filter((w) => w.status === "upcoming").sort(
    (a, b) => a.date.localeCompare(b.date),
  );
  const past = WORKSHOPS.filter((w) => w.status === "past").sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return [...upcoming, ...past];
}

export function formatWorkshopDateRange(w: Workshop): string {
  // YYYY-MM means month-only precision (date wasn't recorded).
  if (/^\d{4}-\d{2}$/.test(w.date)) {
    const [y, m] = w.date.split("-").map(Number);
    const monthLabel = new Date(y, m - 1, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    return monthLabel;
  }

  const start = new Date(w.date + "T12:00:00");
  if (!w.endDate) {
    return start.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  const end = new Date(w.endDate + "T12:00:00");
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const monthDay = start.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const endDay = end.toLocaleDateString("en-US", { day: "numeric", year: "numeric" });
    return `${monthDay}–${endDay}`;
  }
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}
