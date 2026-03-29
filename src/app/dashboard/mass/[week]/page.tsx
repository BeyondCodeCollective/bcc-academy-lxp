import { redirect } from "next/navigation";
import Link from "next/link";
import { computeCurrentWeek } from "@/lib/utils";
import { ArrowLeft, BookOpen, Users, Video, CheckCircle, Clock, Download, ExternalLink, Link as LinkIcon } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSessionContent } from "@/app/dashboard/admin/actions";
import type { SessionResource } from "@/app/dashboard/admin/actions";
import { MassCheckInButton } from "../check-in-button";

type MassWeekContent = {
  week: number;
  title: string;
  icon: string;
  subtitle: string;
  coach: string;
  description: string;
  objectives: string[];
  /** Static recording note for sessions that were deliberately not recorded */
  recordingNote: string | null;
};

const SESSION_TIME = "Tuesday · 10:00 – 11:00 AM ET";

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
    recordingNote: "This session was not recorded to create a safe space for open discussion.",
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
    recordingNote: null,
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
    recordingNote: null,
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
    recordingNote: null,
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
    recordingNote: null,
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
    recordingNote: null,
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
    recordingNote: null,
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
    recordingNote: null,
  },
];

const MASS_START = "2026-03-24";

/** Detect YouTube URLs (youtube.com/watch, youtu.be, youtube.com/live, etc.) */
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      // Handle /live/ID or /embed/ID paths
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
      if (parts[0] === "live" && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
    }
  } catch {
    // Invalid URL
  }
  return null;
}

export default async function MassWeekPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week: weekStr } = await params;
  const weekNum = parseInt(weekStr, 10);

  const weekContent = MASS_CONTENT.find((w) => w.week === weekNum);
  if (!weekContent) redirect("/dashboard");

  const now = new Date();
  const massStarted = now >= new Date(MASS_START);
  const currentWeek = massStarted ? computeCurrentWeek(MASS_START, 8) : 0;

  const sessionDate = new Date(MASS_START + "T10:00:00-04:00");
  sessionDate.setDate(sessionDate.getDate() + (weekNum - 1) * 7);
  const sessionEnd = new Date(sessionDate);
  sessionEnd.setHours(sessionEnd.getHours() + 1);

  const sessionPassed = now > sessionEnd;
  const sessionLive = now >= new Date(sessionDate.getTime() - 10 * 60000) && now <= sessionEnd;

  const isCompleted = massStarted && (weekNum < currentWeek || (weekNum === currentWeek && sessionPassed));
  const isCurrent = massStarted && weekNum === currentWeek && !sessionPassed;

  // Fetch this student's attendance
  let alreadyCheckedIn = false;
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (authSession?.user) {
      const { data } = await supabase
        .from("attendance")
        .select("id")
        .eq("student_id", authSession.user.id)
        .eq("track", "mass")
        .eq("week_number", weekNum)
        .eq("session_number", 1)
        .maybeSingle();
      alreadyCheckedIn = !!data;
    }
  }

  // Fetch session content (recording URL + resources) from Supabase
  const sessionContent = isSupabaseConfigured()
    ? await getSessionContent("mass", weekNum)
    : null;

  const recordingUrl = sessionContent?.recording_url ?? null;
  const meetingLink = sessionContent?.meeting_link ?? null;
  const resources: SessionResource[] = sessionContent?.resources ?? [];

  const youtubeEmbedUrl = recordingUrl ? getYouTubeEmbedUrl(recordingUrl) : null;

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
                {isCompleted ? "Session Ended" : isCurrent ? "This Week" : "Upcoming"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 leading-tight">
              {weekContent.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 pl-[52px]">
          <Users size={13} className="text-neutral-500" />
          <span className="text-xs text-neutral-500">{weekContent.coach}</span>
          <span className="text-neutral-400 mx-1">·</span>
          <span className="text-xs text-neutral-500">{weekContent.subtitle}</span>
        </div>
      </div>

      {/* Session card */}
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
              <p className="text-xs text-neutral-500 mt-0.5">
                {SESSION_TIME}
              </p>
            </div>
          </div>
          <div className="shrink-0 ml-11 sm:ml-0">
            {sessionLive ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <a
                  href={meetingLink ?? "#"}
                  target={meetingLink ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 min-h-[44px] transition-colors w-full sm:w-auto"
                >
                  <Video size={14} />
                  Join Session
                </a>
                <MassCheckInButton weekNumber={weekNum} initialCheckedIn={alreadyCheckedIn} />
              </div>
            ) : isCompleted ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                <CheckCircle size={14} />
                Session Ended
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-200 text-neutral-400 text-xs font-semibold px-3.5 py-2.5 min-h-[44px] cursor-not-allowed w-full sm:w-auto">
                <Video size={14} />
                Join Session
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Brief description */}
      <p className="mb-6 text-sm text-neutral-700 leading-relaxed px-1">
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
            <li key={i} className="flex gap-2 text-sm text-neutral-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
              {obj}
            </li>
          ))}
        </ul>
      </div>

      {/* Session Recording */}
      {youtubeEmbedUrl ? (
        <div className="mb-4 rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
              <Video size={15} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900">Session Recording</p>
              <p className="text-xs text-neutral-500">Week {weekNum} replay</p>
            </div>
          </div>
          <div className="relative w-full aspect-video">
            <iframe
              src={youtubeEmbedUrl}
              title={`Week ${weekNum} session recording`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : recordingUrl ? (
        <a
          href={recordingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50">
            <Video size={20} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900">Session Recording</p>
            <p className="text-xs text-neutral-500">Watch the replay</p>
          </div>
          <ExternalLink size={14} className="text-neutral-400 shrink-0" />
        </a>
      ) : weekContent.recordingNote ? (
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100">
            <Video size={20} className="text-neutral-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-600">No Recording</p>
            <p className="text-xs text-neutral-500">{weekContent.recordingNote}</p>
          </div>
        </div>
      ) : (isCompleted || isCurrent) ? (
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100">
            <Video size={20} className="text-neutral-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-600">Session Recording</p>
            <p className="text-xs text-neutral-500">Available after the session</p>
          </div>
        </div>
      ) : null}

      {/* Resources */}
      {resources.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <LinkIcon size={14} className="text-neutral-400" />
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
              Resources
            </h2>
          </div>
          <ul className="space-y-2">
            {resources.map((r, i) => (
              <li key={i}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5 text-sm font-medium text-neutral-800 hover:border-neutral-300 hover:bg-white transition-colors group"
                >
                  <Download size={14} className="text-neutral-400 group-hover:text-neutral-600 shrink-0" />
                  <span className="flex-1 truncate">{r.name || r.url}</span>
                  <ExternalLink size={12} className="text-neutral-300 group-hover:text-neutral-500 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
