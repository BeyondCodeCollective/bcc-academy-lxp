import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { computeCurrentWeek } from "@/lib/utils";
import { ArrowLeft, BookOpen, Users, Video } from "lucide-react";
import type { Student, Cohort } from "@/lib/types";

type MassWeekContent = {
  week: number;
  title: string;
  icon: string;
  subtitle: string;
  coach: string;
  description: string;
  objectives: string[];
  activities: string[];
  takeaway: string;
};

const MASS_CONTENT: MassWeekContent[] = [
  {
    week: 1,
    title: "Storytelling for Career Success",
    icon: "🎙️",
    subtitle: "Crafting Your Personal Narrative",
    coach: "Angel Aviles",
    description:
      "A lot of people have talent. Not everyone knows how to communicate it. This week you'll build the foundation of your professional story — who you are, what you've done, and where you're going.",
    objectives: [
      "Identify your current reality: strengths, gaps, constraints, opportunities",
      "Define your north star — role direction + why it fits",
      "Translate 'I want a better job' into specific outcomes",
      "Build a clear personal narrative for interviews and networking",
    ],
    activities: [
      "Write your 60-second career story",
      "Peer storytelling exercise — tell and refine",
      "Identify 3 key moments that shaped your career direction",
    ],
    takeaway: "A polished personal narrative you can use in interviews, networking, and your LinkedIn profile.",
  },
  {
    week: 2,
    title: "Networking",
    icon: "🤝",
    subtitle: "Building Meaningful Professional Connections",
    coach: "Angel Aviles",
    description:
      "Networking isn't about collecting business cards — it's about building real relationships that open doors. This week you'll learn how to connect with intention.",
    objectives: [
      "Understand the difference between transactional and relational networking",
      "Build a target list of people to connect with",
      "Craft outreach messages that get responses",
      "Practice the art of the follow-up",
    ],
    activities: [
      "LinkedIn profile audit and optimization",
      "Draft 3 outreach messages to professionals in your target field",
      "Practice elevator pitch with peers",
    ],
    takeaway: "A networking action plan with 5 target connections and templated outreach messages.",
  },
  {
    week: 3,
    title: "The Art of the Brag",
    icon: "💪",
    subtitle: "Self-Advocacy & Owning Your Worth",
    coach: "Angel Aviles",
    description:
      "Most career blocks aren't knowledge gaps — they're action avoidance. This week is about developing the courage to own your accomplishments and communicate your value.",
    objectives: [
      "Overcome imposter syndrome with evidence-based confidence",
      "Learn to quantify and articulate your achievements",
      "Practice self-advocacy in professional settings",
      "Build your Brag Book — a portfolio of proof",
    ],
    activities: [
      "Start your Brag Book: document 5 wins with metrics",
      "Mock self-advocacy exercise — 'brag' to a partner",
      "Record yourself delivering your value proposition",
    ],
    takeaway: "A Brag Book with documented accomplishments you can reference for interviews and reviews.",
  },
  {
    week: 4,
    title: "Guest Speaker",
    icon: "🎤",
    subtitle: "Industry Perspectives",
    coach: "Guest Speaker TBA",
    description:
      "Hear from a professional who has navigated the transition from non-traditional background to tech career. Real stories, real advice, real questions.",
    objectives: [
      "Gain industry perspective from a working professional",
      "Understand different career paths into tech",
      "Ask questions and build your professional network",
      "Connect classroom learning to real-world application",
    ],
    activities: [
      "Prepare 2 questions for the speaker beforehand",
      "Take notes on key insights and advice",
      "Follow the speaker on LinkedIn after the session",
    ],
    takeaway: "A new professional connection and real-world perspective on your career path.",
  },
  {
    week: 5,
    title: "Planning",
    icon: "📋",
    subtitle: "Strategizing Your Career Path",
    coach: "Angel Aviles",
    description:
      "Clarity reduces busy work and makes effort strategic. This week you'll create an actionable career plan with timelines, milestones, and accountability.",
    objectives: [
      "Map your 30-60-90 day career plan",
      "Identify skill gaps and create a learning roadmap",
      "Set SMART goals for your job search or career pivot",
      "Build accountability structures that stick",
    ],
    activities: [
      "Create your 90-day career action plan",
      "Identify 3 skills to develop and resources to build them",
      "Pair up for accountability partnerships",
    ],
    takeaway: "A written 90-day career plan with specific milestones and deadlines.",
  },
  {
    week: 6,
    title: "Guest Speaker",
    icon: "🎤",
    subtitle: "Industry Perspectives",
    coach: "Guest Speaker TBA",
    description:
      "Another industry professional shares their journey, challenges, and advice for emerging tech professionals.",
    objectives: [
      "Expand your understanding of career possibilities",
      "Learn from someone who has been where you are",
      "Practice professional networking in a live setting",
      "Add to your growing professional network",
    ],
    activities: [
      "Prepare 2 questions for the speaker beforehand",
      "Take notes on key insights and advice",
      "Follow the speaker on LinkedIn after the session",
    ],
    takeaway: "Expanded professional network and additional career perspective.",
  },
  {
    week: 7,
    title: "Money & Financial Confidence",
    icon: "💰",
    subtitle: "Securing Your Economic Future",
    coach: "Angel Aviles",
    description:
      "Gain essential financial knowledge to negotiate salaries, understand compensation packages, and build long-term financial independence.",
    objectives: [
      "Understand salary ranges for entry-level tech roles",
      "Learn salary negotiation tactics and scripts",
      "Decode benefits packages: health, 401k, equity, PTO",
      "Build a personal budget tied to your career goals",
    ],
    activities: [
      "Research salary ranges for your target roles",
      "Practice salary negotiation role-play",
      "Create a basic financial plan tied to your career timeline",
    ],
    takeaway: "Salary negotiation scripts and a personal financial plan for your first tech role.",
  },
  {
    week: 8,
    title: "Career Expo",
    icon: "🎯",
    subtitle: "Put Everything Into Practice",
    coach: "Angel Aviles & Yvette Ross",
    description:
      "The culmination of MASS — a mini career fair where you'll put your storytelling, networking, self-advocacy, and planning skills to work in front of real employers and professionals.",
    objectives: [
      "Present your professional story to real employers",
      "Practice networking in a live professional setting",
      "Get feedback on your pitch, resume, and presence",
      "Make real connections that could lead to opportunities",
    ],
    activities: [
      "Deliver your polished career story to 3+ employers",
      "Collect business cards and follow up within 48 hours",
      "Get at least one piece of professional feedback",
    ],
    takeaway: "Real employer connections, professional feedback, and the confidence that comes from doing the work.",
  },
];

export default async function MassWeekPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week: weekStr } = await params;
  const weekNum = parseInt(weekStr, 10);

  const weekContent = MASS_CONTENT.find((w) => w.week === weekNum);
  if (!weekContent) redirect("/dashboard");

  let currentWeek = 1;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const { data: student } = await supabase
      .from("students")
      .select("cohort_id")
      .eq("id", user.id)
      .single<Pick<Student, "cohort_id">>();

    if (student?.cohort_id) {
      const { data: cohort } = await supabase
        .from("cohorts")
        .select("*")
        .eq("id", student.cohort_id)
        .single<Cohort>();

      if (cohort) {
        currentWeek = computeCurrentWeek(cohort.start_date, cohort.total_weeks);
      }
    }
  }

  const isCompleted = weekNum < currentWeek;
  const isCurrent = weekNum === currentWeek;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-xl">
            {weekContent.icon}
          </span>
          <div>
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
              MASS Wraparound · Week {weekContent.week}
            </p>
            <h1 className="text-2xl font-bold text-neutral-900">
              {weekContent.title}
            </h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          {weekContent.subtitle}
        </p>

        <div className="flex items-center gap-3 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-neutral-400">
            <Users size={14} />
            {weekContent.coach}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              isCompleted
                ? "bg-green-50 text-green-600"
                : isCurrent
                  ? "bg-red-50 text-red-600"
                  : "bg-neutral-100 text-neutral-400"
            }`}
          >
            {isCompleted ? "Completed" : isCurrent ? "This Week" : "Upcoming"}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <p className="text-sm text-neutral-600 leading-relaxed">
          {weekContent.description}
        </p>
      </div>

      {/* Objectives */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={14} className="text-neutral-400" />
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
            Learning Objectives
          </h2>
        </div>
        <ul className="space-y-2">
          {weekContent.objectives.map((obj, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-neutral-600">
              <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[9px] font-bold text-neutral-400">
                {i + 1}
              </span>
              {obj}
            </li>
          ))}
        </ul>
      </div>

      {/* Activities */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={14} className="text-neutral-400" />
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
            Activities
          </h2>
        </div>
        <ul className="space-y-2">
          {weekContent.activities.map((act, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-neutral-600">
              <span className="mt-0.5 text-neutral-300">•</span>
              {act}
            </li>
          ))}
        </ul>
      </div>

      {/* Takeaway */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
          What You Walk Away With
        </h2>
        <p className="text-sm font-medium text-neutral-700">
          {weekContent.takeaway}
        </p>
      </div>

      {/* Replay placeholder */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100">
            <Video size={20} className="text-neutral-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-400">
              Session Recording
            </p>
            <p className="text-xs text-neutral-300">
              Available after the session
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
