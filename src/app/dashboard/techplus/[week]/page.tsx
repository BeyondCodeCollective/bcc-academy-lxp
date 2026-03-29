import { redirect } from "next/navigation";
import Link from "next/link";
import { computeCurrentWeek } from "@/lib/utils";
import { ArrowLeft, BookOpen, Users, Video, CheckCircle } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { TechPlusCheckInButton } from "../check-in-button";

type SessionInfo = {
  title: string;
  time: string;
};

type TechPlusWeekContent = {
  week: number;
  title: string;
  icon: string;
  subtitle: string;
  instructor: string;
  description: string;
  objectives: string[];
  sessions: [SessionInfo, SessionInfo];
};

const TECH_PLUS_CONTENT: TechPlusWeekContent[] = [
  {
    week: 1,
    title: "IT Fundamentals",
    icon: "💻",
    subtitle: "Core Concepts & Hardware Basics",
    instructor: "Kobie Joyner",
    description:
      "This week lays the foundation — how computers work, what's inside them, and the vocabulary every IT professional uses daily.",
    objectives: [
      "Core computer components: CPU, RAM, storage, motherboard, power supply",
      "Hardware types and their roles in processing, memory, and I/O",
      "Binary basics — how data is represented and transferred",
      "IT support landscape: roles, career paths, and where Tech+ fits",
    ],
    sessions: [
      { title: "Core IT Concepts", time: "Wednesday · 10:00 AM – 12:00 PM" },
      { title: "Hardware Deep Dive", time: "Friday · 10:00 AM – 12:00 PM" },
    ],
  },
  {
    week: 2,
    title: "Devices & Operating Systems",
    icon: "🖥️",
    subtitle: "Configuration & System Management",
    instructor: "Kobie Joyner",
    description:
      "Get hands-on with Windows, macOS, and Linux. Learn to navigate, configure, and troubleshoot the systems people actually use at work.",
    objectives: [
      "Compare Windows, macOS, Linux, and mobile operating systems",
      "Navigate file systems, manage users, and configure settings",
      "Device drivers, firmware, and OS-to-hardware communication",
      "Troubleshoot boot issues, update failures, and performance problems",
    ],
    sessions: [
      { title: "Operating System Fundamentals", time: "Wednesday · 10:00 AM – 12:00 PM" },
      { title: "Configuration & Troubleshooting", time: "Friday · 10:00 AM – 12:00 PM" },
    ],
  },
  {
    week: 3,
    title: "Networking",
    icon: "🌐",
    subtitle: "How Devices Communicate",
    instructor: "Kobie Joyner",
    description:
      "How data moves from one machine to another — from your home Wi-Fi to enterprise infrastructure. Protocols, addressing, and architecture.",
    objectives: [
      "OSI and TCP/IP models — how data flows through network layers",
      "IP addressing, subnetting basics, DNS, and DHCP",
      "Network devices: routers, switches, access points, firewalls",
      "Diagnose connectivity with ping, traceroute, ipconfig, nslookup",
    ],
    sessions: [
      { title: "Network Foundations", time: "Wednesday · 10:00 AM – 12:00 PM" },
      { title: "Protocols & Diagnostics", time: "Friday · 10:00 AM – 12:00 PM" },
    ],
  },
  {
    week: 4,
    title: "Cybersecurity",
    icon: "🔒",
    subtitle: "Security Principles & Threat Awareness",
    instructor: "Kobie Joyner",
    description:
      "Every IT role is a security role. This week covers threats, defenses, and best practices that protect organizations — and the mistakes that expose them.",
    objectives: [
      "Common threats: malware, phishing, social engineering, ransomware",
      "CIA triad — Confidentiality, Integrity, Availability",
      "Authentication: passwords, MFA, biometrics, single sign-on",
      "Best practices: least privilege, patch management, encryption",
    ],
    sessions: [
      { title: "Security Principles", time: "Wednesday · 10:00 AM – 12:00 PM" },
      { title: "Threats & Defense", time: "Friday · 10:00 AM – 12:00 PM" },
    ],
  },
  {
    week: 5,
    title: "Software & Data",
    icon: "🗄️",
    subtitle: "Development Basics & Database Fundamentals",
    instructor: "Kobie Joyner",
    description:
      "Bridge the gap between IT support and software — how apps are built, how data is structured, and why understanding both makes you more effective.",
    objectives: [
      "Software development lifecycle: planning through deployment",
      "Database fundamentals: tables, records, SQL vs. NoSQL",
      "APIs and how applications communicate",
      "Version control concepts and why they matter",
    ],
    sessions: [
      { title: "Software Development Basics", time: "Wednesday · 10:00 AM – 12:00 PM" },
      { title: "Data & Databases", time: "Friday · 10:00 AM – 12:00 PM" },
    ],
  },
  {
    week: 6,
    title: "Cloud & IT Support",
    icon: "☁️",
    subtitle: "Cloud Computing & Support Workflows",
    instructor: "Kobie Joyner",
    description:
      "Most businesses run on cloud services. This week covers cloud fundamentals alongside the support workflows and ticketing systems you'll use daily.",
    objectives: [
      "Cloud service models: IaaS, PaaS, SaaS — and when each is used",
      "Compare AWS, Azure, and Google Cloud core services",
      "IT support workflows: ticketing, SLAs, escalation, documentation",
      "Professional communication for help desk interactions",
    ],
    sessions: [
      { title: "Cloud Fundamentals", time: "Wednesday · 10:00 AM – 12:00 PM" },
      { title: "IT Support Workflows", time: "Friday · 10:00 AM – 12:00 PM" },
    ],
  },
  {
    week: 7,
    title: "Certification Review",
    icon: "🏆",
    subtitle: "Exam Prep & Final Assessment",
    instructor: "Kobie Joyner",
    description:
      "Everything comes together. Sharpen your knowledge for the CompTIA Tech+ exam with targeted review, exam strategy, and a practice assessment.",
    objectives: [
      "Review all six Tech+ exam domains, focusing on high-weight areas",
      "Exam strategy: time management and elimination techniques",
      "Diagnostic practice exam to identify remaining gaps",
      "Build a personalized study plan for your exam date",
    ],
    sessions: [
      { title: "Domain Review", time: "Wednesday · 10:00 AM – 12:00 PM" },
      { title: "Practice Exam & Study Plan", time: "Friday · 10:00 AM – 12:00 PM" },
    ],
  },
];

const TECH_PLUS_START = "2026-04-01";

export default async function TechPlusWeekPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week: weekStr } = await params;
  const weekNum = parseInt(weekStr, 10);

  const weekContent = TECH_PLUS_CONTENT.find((w) => w.week === weekNum);
  if (!weekContent) redirect("/dashboard");

  const now = new Date();
  const techStarted = now >= new Date(TECH_PLUS_START);
  const currentWeek = techStarted ? computeCurrentWeek(TECH_PLUS_START, 8) : 0;

  // Tech+ sessions: Wed 10am-12pm ET (session 1) & Fri 10am-12pm ET (session 2)
  // TECH_PLUS_START (April 1) is a Wednesday
  const weekStartDate = new Date(TECH_PLUS_START + "T00:00:00-04:00");
  weekStartDate.setDate(weekStartDate.getDate() + (weekNum - 1) * 7);

  // Session 1 = Wednesday (offset 0), Session 2 = Friday (offset +2)
  const s1Start = new Date(weekStartDate); s1Start.setHours(10, 0, 0, 0);
  const s1End = new Date(weekStartDate); s1End.setHours(12, 0, 0, 0);
  const s2Start = new Date(weekStartDate); s2Start.setDate(s2Start.getDate() + 2); s2Start.setHours(10, 0, 0, 0);
  const s2End = new Date(weekStartDate); s2End.setDate(s2End.getDate() + 2); s2End.setHours(12, 0, 0, 0);

  const sessionEnds = [s1End, s2End];
  const sessionLive = [
    now >= new Date(s1Start.getTime() - 10 * 60000) && now <= s1End,
    now >= new Date(s2Start.getTime() - 10 * 60000) && now <= s2End,
  ];
  const sessionPassed = [now > s1End, now > s2End];

  const allSessionsPassed = sessionPassed[0] && sessionPassed[1];
  const isCompleted = techStarted && (weekNum < currentWeek || (weekNum === currentWeek && allSessionsPassed));
  const isCurrent = techStarted && weekNum === currentWeek && !allSessionsPassed;

  // Fetch this student's attendance for both sessions this week
  const checkedInSessions: boolean[] = [false, false];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (authSession?.user) {
      const { data } = await supabase
        .from("attendance")
        .select("session_number")
        .eq("student_id", authSession.user.id)
        .eq("track", "techplus")
        .eq("week_number", weekNum);
      if (data) {
        for (const row of data) {
          if (row.session_number === 1) checkedInSessions[0] = true;
          if (row.session_number === 2) checkedInSessions[1] = true;
        }
      }
    }
  }

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
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl">
            {weekContent.icon}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
                CompTIA Tech+ · Week {weekContent.week}
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  isCompleted
                    ? "bg-green-50 text-green-600"
                    : isCurrent
                      ? "bg-red-50 text-red-600"
                      : !techStarted
                        ? "bg-blue-50 text-blue-600"
                        : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {isCompleted
                  ? "Sessions Ended"
                  : isCurrent
                    ? "This Week"
                    : !techStarted
                      ? "Starts April 1"
                      : "Upcoming"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 leading-tight">
              {weekContent.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 pl-[52px]">
          <Users size={13} className="text-neutral-400" />
          <span className="text-xs text-neutral-500">{weekContent.instructor}</span>
          <span className="text-neutral-300 mx-1">·</span>
          <span className="text-xs text-neutral-500">{weekContent.subtitle}</span>
        </div>
      </div>

      {/* Sessions card — the main focus */}
      <div className="mb-6 rounded-xl border-2 border-neutral-200 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-4">
          Sessions
        </h2>
        <div className="space-y-4">
          {weekContent.sessions.map((session, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">
                    Session {i + 1}: {session.title}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {session.time}
                  </p>
                </div>
              </div>
              <div className="shrink-0 ml-11 sm:ml-0">
                {sessionLive[i] ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <a
                      href="#"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2.5 min-h-[44px] transition-colors w-full sm:w-auto"
                    >
                      <Video size={14} />
                      Join Session
                    </a>
                    <TechPlusCheckInButton
                      weekNumber={weekNum}
                      sessionNumber={i + 1}
                      initialCheckedIn={checkedInSessions[i]}
                    />
                  </div>
                ) : sessionPassed[i] ? (
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
          ))}
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
            <p className="text-xs text-neutral-500">
              Available after the session
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
