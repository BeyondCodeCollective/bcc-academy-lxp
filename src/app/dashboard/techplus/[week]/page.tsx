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
    title: "IT Concepts, Careers & Devices",
    icon: "💻",
    subtitle: "Foundations",
    instructor: "Kobie Joyner",
    description:
      "This week lays the foundation — core computing concepts, IT terminology, career pathways, and an introduction to the devices you'll work with every day.",
    objectives: [
      "Explain basic computing concepts and IT terminology",
      "Understand IT career pathways and where certifications fit",
      "Identify common devices, peripherals, and their roles",
      "Navigate the CompTIA Tech+ (ITF+) exam objectives",
    ],
    sessions: [
      { title: "IT Concepts & Career Pathways", time: "Wednesday · 10:00 AM – 12:00 PM ET" },
      { title: "Devices & Getting Started", time: "Friday · 10:00 AM – 12:00 PM ET" },
    ],
  },
  {
    week: 2,
    title: "Hardware Components & Peripherals",
    icon: "🔧",
    subtitle: "Hardware Basics",
    instructor: "Kobie Joyner",
    description:
      "Get hands-on with what's inside a computer. Learn to identify hardware components, understand how peripherals connect, and troubleshoot basic hardware issues.",
    objectives: [
      "Identify internal hardware: CPU, RAM, storage, motherboard, power supply",
      "Understand peripheral devices and connection types (USB, HDMI, etc.)",
      "Explain how hardware components interact to process data",
      "Troubleshoot basic hardware issues",
    ],
    sessions: [
      { title: "Internal Hardware Components", time: "Wednesday · 10:00 AM – 12:00 PM ET" },
      { title: "Peripherals & Connections", time: "Friday · 10:00 AM – 12:00 PM ET" },
    ],
  },
  {
    week: 3,
    title: "Setup, Ports & Troubleshooting",
    icon: "🛠️",
    subtitle: "Hardware Skills",
    instructor: "Kobie Joyner",
    description:
      "Put your hardware knowledge into practice. Set up devices, identify ports and connectors, and develop systematic troubleshooting skills.",
    objectives: [
      "Set up and configure basic computer systems",
      "Identify ports, connectors, and cable types",
      "Apply systematic troubleshooting methodology",
      "Resolve common setup and connectivity issues",
    ],
    sessions: [
      { title: "Device Setup & Ports", time: "Wednesday · 10:00 AM – 12:00 PM ET" },
      { title: "Troubleshooting Lab", time: "Friday · 10:00 AM – 12:00 PM ET" },
    ],
  },
  {
    week: 4,
    title: "Operating Systems & Software",
    icon: "📀",
    subtitle: "Software",
    instructor: "Kobie Joyner",
    description:
      "Understand how operating systems manage hardware and software. Compare Windows, macOS, and Linux, and learn software installation and management.",
    objectives: [
      "Compare Windows, macOS, Linux, and mobile operating systems",
      "Navigate file systems, manage users, and configure settings",
      "Understand software types: applications, utilities, and drivers",
      "Install, update, and troubleshoot software",
    ],
    sessions: [
      { title: "Operating Systems Overview", time: "Wednesday · 10:00 AM – 12:00 PM ET" },
      { title: "Software Management", time: "Friday · 10:00 AM – 12:00 PM ET" },
    ],
  },
  {
    week: 5,
    title: "Networking Basics & IP Concepts",
    icon: "🌐",
    subtitle: "Networking",
    instructor: "Kobie Joyner",
    description:
      "How data moves between devices — from your home Wi-Fi to enterprise networks. Protocols, IP addressing, and the architecture that connects everything.",
    objectives: [
      "Explain networking fundamentals and the TCP/IP model",
      "Understand IP addressing, DNS, and DHCP",
      "Identify network devices: routers, switches, access points",
      "Diagnose connectivity with ping, traceroute, and ipconfig",
    ],
    sessions: [
      { title: "Network Foundations", time: "Wednesday · 10:00 AM – 12:00 PM ET" },
      { title: "IP Concepts & Diagnostics", time: "Friday · 10:00 AM – 12:00 PM ET" },
    ],
  },
  {
    week: 6,
    title: "Security Concepts & Threats",
    icon: "🔒",
    subtitle: "Cybersecurity",
    instructor: "Kobie Joyner",
    description:
      "Every IT role is a security role. Learn about threats, defenses, and the best practices that protect organizations from cyberattacks.",
    objectives: [
      "Describe cybersecurity principles and the CIA triad",
      "Identify common threats: malware, phishing, social engineering",
      "Understand authentication methods: passwords, MFA, biometrics",
      "Apply security best practices: least privilege, encryption, patching",
    ],
    sessions: [
      { title: "Security Principles", time: "Wednesday · 10:00 AM – 12:00 PM ET" },
      { title: "Threats & Defense", time: "Friday · 10:00 AM – 12:00 PM ET" },
    ],
  },
  {
    week: 7,
    title: "Data & Databases",
    icon: "📊",
    subtitle: "Data Management",
    instructor: "Kobie Joyner",
    description:
      "How data is stored, organized, and retrieved. Understand database fundamentals and why data management is critical across every IT discipline.",
    objectives: [
      "Understand database concepts: tables, records, and relationships",
      "Compare SQL and NoSQL database types",
      "Explain data storage, backup, and recovery principles",
      "Identify how databases support business applications",
    ],
    sessions: [
      { title: "Database Fundamentals", time: "Wednesday · 10:00 AM – 12:00 PM ET" },
      { title: "Data Management Lab", time: "Friday · 10:00 AM – 12:00 PM ET" },
    ],
  },
  {
    week: 8,
    title: "Review, Troubleshooting & Exam Prep",
    icon: "🎯",
    subtitle: "Certification Readiness",
    instructor: "Kobie Joyner",
    description:
      "Everything comes together. Comprehensive review of all domains, targeted troubleshooting practice, and exam strategy for the CompTIA Tech+ certification.",
    objectives: [
      "Review all Tech+ exam domains with focus on high-weight areas",
      "Apply troubleshooting methodology across hardware, software, and networking",
      "Practice exam questions and develop time management strategy",
      "Build a personalized study plan for your exam date",
    ],
    sessions: [
      { title: "Comprehensive Review", time: "Wednesday · 10:00 AM – 12:00 PM ET" },
      { title: "Practice Exam & Study Plan", time: "Friday · 10:00 AM – 12:00 PM ET" },
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
