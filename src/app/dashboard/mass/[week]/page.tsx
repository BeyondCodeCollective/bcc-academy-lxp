import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { computeCurrentWeek } from "@/lib/utils";
import { ArrowLeft, BookOpen, Users, Video, CheckCircle, Clock } from "lucide-react";

type MassWeekContent = {
  week: number;
  title: string;
  icon: string;
  subtitle: string;
  coach: string;
  sessionDay: string;
  description: string;
  objectives: string[];
};

const MASS_CONTENT: MassWeekContent[] = [
  {
    week: 1,
    title: "Storytelling for Career Success",
    icon: "🎙️",
    subtitle: "Crafting Your Personal Narrative",
    coach: "Angel Aviles",
    sessionDay: "Tuesday · 6:00 – 8:00 PM",
    description:
      "A lot of people have talent. Not everyone knows how to communicate it. This week you'll build the foundation of your professional story — who you are, what you've done, and where you're going.",
    objectives: [
      "Identify your current reality: strengths, gaps, constraints, opportunities",
      "Define your north star — role direction + why it fits",
      "Translate 'I want a better job' into specific outcomes",
      "Build a clear personal narrative for interviews and networking",
    ],
  },
  {
    week: 2,
    title: "Networking",
    icon: "🤝",
    subtitle: "Building Meaningful Professional Connections",
    coach: "Angel Aviles",
    sessionDay: "Tuesday · 6:00 – 8:00 PM",
    description:
      "Networking isn't about collecting business cards — it's about building real relationships that open doors. This week you'll learn how to connect with intention.",
    objectives: [
      "Understand the difference between transactional and relational networking",
      "Build a target list of people to connect with",
      "Craft outreach messages that get responses",
      "Practice the art of the follow-up",
    ],
  },
  {
    week: 3,
    title: "The Art of the Brag",
    icon: "💪",
    subtitle: "Self-Advocacy & Owning Your Worth",
    coach: "Angel Aviles",
    sessionDay: "Tuesday · 6:00 – 8:00 PM",
    description:
      "Most career blocks aren't knowledge gaps — they're action avoidance. This week is about developing the courage to own your accomplishments and communicate your value.",
    objectives: [
      "Overcome imposter syndrome with evidence-based confidence",
      "Learn to quantify and articulate your achievements",
      "Practice self-advocacy in professional settings",
      "Build your Brag Book — a portfolio of proof",
    ],
  },
  {
    week: 4,
    title: "Guest Speaker",
    icon: "🎤",
    subtitle: "Industry Perspectives",
    coach: "Guest Speaker TBA",
    sessionDay: "Tuesday · 6:00 – 8:00 PM",
    description:
      "Hear from a professional who has navigated the transition from non-traditional background to tech career. Real stories, real advice, real questions.",
    objectives: [
      "Gain industry perspective from a working professional",
      "Understand different career paths into tech",
      "Ask questions and build your professional network",
      "Connect classroom learning to real-world application",
    ],
  },
  {
    week: 5,
    title: "Planning",
    icon: "📋",
    subtitle: "Strategizing Your Career Path",
    coach: "Angel Aviles",
    sessionDay: "Tuesday · 6:00 – 8:00 PM",
    description:
      "Clarity reduces busy work and makes effort strategic. This week you'll create an actionable career plan with timelines, milestones, and accountability.",
    objectives: [
      "Map your 30-60-90 day career plan",
      "Identify skill gaps and create a learning roadmap",
      "Set SMART goals for your job search or career pivot",
      "Build accountability structures that stick",
    ],
  },
  {
    week: 6,
    title: "Guest Speaker",
    icon: "🎤",
    subtitle: "Industry Perspectives",
    coach: "Guest Speaker TBA",
    sessionDay: "Tuesday · 6:00 – 8:00 PM",
    description:
      "Another industry professional shares their journey, challenges, and advice for emerging tech professionals.",
    objectives: [
      "Expand your understanding of career possibilities",
      "Learn from someone who has been where you are",
      "Practice professional networking in a live setting",
      "Add to your growing professional network",
    ],
  },
  {
    week: 7,
    title: "Money & Financial Confidence",
    icon: "💰",
    subtitle: "Securing Your Economic Future",
    coach: "Angel Aviles",
    sessionDay: "Tuesday · 6:00 – 8:00 PM",
    description:
      "Gain essential financial knowledge to negotiate salaries, understand compensation packages, and build long-term financial independence.",
    objectives: [
      "Understand salary ranges for entry-level tech roles",
      "Learn salary negotiation tactics and scripts",
      "Decode benefits packages: health, 401k, equity, PTO",
      "Build a personal budget tied to your career goals",
    ],
  },
  {
    week: 8,
    title: "Career Expo",
    icon: "🎯",
    subtitle: "Put Everything Into Practice",
    coach: "Angel Aviles & Yvette Ross",
    sessionDay: "Tuesday · 6:00 – 8:00 PM",
    description:
      "The culmination of MASS — a mini career fair where you'll put your storytelling, networking, self-advocacy, and planning skills to work in front of real employers and professionals.",
    objectives: [
      "Present your professional story to real employers",
      "Practice networking in a live professional setting",
      "Get feedback on your pitch, resume, and presence",
      "Make real connections that could lead to opportunities",
    ],
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
      .single<{ cohort_id: string | null }>();

    if (student?.cohort_id) {
      const { data: cohort } = await supabase
        .from("cohorts")
        .select("start_date, total_weeks")
        .eq("id", student.cohort_id)
        .single<{ start_date: string; total_weeks: number }>();

      if (cohort) {
        currentWeek = computeCurrentWeek(cohort.start_date, cohort.total_weeks);
      }
    }
  }

  const isCompleted = weekNum < currentWeek;
  const isCurrent = weekNum === currentWeek;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-8">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-5 py-2"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      {/* Compact header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xl">
            {weekContent.icon}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
                MASS Wraparound · Week {weekContent.week}
              </p>
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
            <h1 className="text-2xl font-bold text-neutral-900 leading-tight">
              {weekContent.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 pl-[52px]">
          <Users size={13} className="text-neutral-400" />
          <span className="text-xs text-neutral-400">{weekContent.coach}</span>
          <span className="text-neutral-300 mx-1">·</span>
          <span className="text-xs text-neutral-400">{weekContent.subtitle}</span>
        </div>
      </div>

      {/* Session card — main focus (MASS has 1 session per week) */}
      <div className="mb-6 rounded-xl border-2 border-neutral-200 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-4">
          Session
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
              1
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900">
                {weekContent.title}
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {weekContent.sessionDay}
              </p>
            </div>
          </div>
          <div className="shrink-0 ml-11 sm:ml-0">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                <CheckCircle size={14} />
                Completed
              </span>
            ) : isCurrent ? (
              <a
                href="#"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 min-h-[44px] transition-colors w-full sm:w-auto"
              >
                <Video size={14} />
                Join Session
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-400">
                <Clock size={14} />
                Upcoming
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Brief description — no card, just text */}
      <p className="mb-6 text-sm text-neutral-500 leading-relaxed px-1">
        {weekContent.description}
      </p>

      {/* What You'll Cover */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={14} className="text-neutral-400" />
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
            What You&apos;ll Cover
          </h2>
        </div>
        <ul className="space-y-1.5">
          {weekContent.objectives.map((obj, i) => (
            <li key={i} className="flex gap-2 text-sm text-neutral-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
              {obj}
            </li>
          ))}
        </ul>
      </div>

      {/* Session Recording placeholder */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
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
