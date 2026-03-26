import { redirect } from "next/navigation";
import Link from "next/link";
import { computeCurrentWeek } from "@/lib/utils";
import { ArrowLeft, BookOpen, Users, Video } from "lucide-react";

type TechPlusWeekContent = {
  week: number;
  title: string;
  icon: string;
  subtitle: string;
  instructor: string;
  description: string;
  objectives: string[];
  activities: string[];
  takeaway: string;
};

const TECH_PLUS_CONTENT: TechPlusWeekContent[] = [
  {
    week: 1,
    title: "IT Fundamentals",
    icon: "💻",
    subtitle: "Core Concepts & Hardware Basics",
    instructor: "Kobie Joyner",
    description:
      "Before you can fix it, you need to understand what you're looking at. This week lays the foundation — how computers actually work, what's inside them, and the vocabulary every IT professional uses daily. You'll go from 'it's broken' to 'I know exactly which component failed.'",
    objectives: [
      "Understand the core components of a computer system: CPU, RAM, storage, motherboard, and power supply",
      "Identify different types of hardware and their roles in processing, memory, and input/output",
      "Learn binary basics and how data is represented, stored, and transferred",
      "Explore the IT support landscape: roles, career paths, and where Tech+ fits in",
    ],
    activities: [
      "Hardware identification lab — match components to their function using reference diagrams",
      "Binary conversion exercise — translate between decimal, binary, and hexadecimal",
      "Build a system spec sheet for a given use case (office workstation vs. gaming PC vs. server)",
    ],
    takeaway:
      "A completed hardware reference sheet you can use to identify and describe any computer's core components and specifications.",
  },
  {
    week: 2,
    title: "Devices & Operating Systems",
    icon: "🖥️",
    subtitle: "Configuration & System Management",
    instructor: "Kobie Joyner",
    description:
      "Every device you'll support runs an operating system, and every OS has its own way of doing things. This week you'll get hands-on with Windows, macOS, and Linux — learning how to navigate, configure, and troubleshoot the systems people actually use at work.",
    objectives: [
      "Compare and contrast Windows, macOS, Linux, and mobile operating systems",
      "Navigate file systems, manage user accounts, and configure system settings",
      "Understand device drivers, firmware, and how the OS communicates with hardware",
      "Practice basic troubleshooting: boot issues, update failures, and performance problems",
    ],
    activities: [
      "OS scavenger hunt — complete a series of configuration tasks across Windows and macOS",
      "User account management exercise — create accounts, set permissions, configure password policies",
      "Troubleshooting walkthrough — diagnose and resolve three common OS issues from real support tickets",
    ],
    takeaway:
      "A troubleshooting decision tree for the 10 most common operating system issues you'll encounter in IT support.",
  },
  {
    week: 3,
    title: "Networking",
    icon: "🌐",
    subtitle: "How Devices Communicate",
    instructor: "Kobie Joyner",
    description:
      "Nothing works in isolation anymore. Every device, app, and service depends on a network. This week demystifies how data moves from one machine to another — from your home Wi-Fi to enterprise infrastructure. You'll learn the protocols, addressing, and architecture that make the internet possible.",
    objectives: [
      "Understand the OSI and TCP/IP models and how data flows through network layers",
      "Learn IP addressing, subnetting basics, DNS, and DHCP — how devices find each other",
      "Identify common network devices: routers, switches, access points, and firewalls",
      "Diagnose basic connectivity issues using ping, traceroute, ipconfig, and nslookup",
    ],
    activities: [
      "IP addressing workshop — calculate subnet ranges and assign addresses for a small office network",
      "Network mapping exercise — diagram a home or office network identifying every device and connection",
      "Command-line diagnostics lab — use ping, traceroute, and ipconfig to troubleshoot connectivity scenarios",
    ],
    takeaway:
      "A network diagnostic cheat sheet with the exact commands and steps to troubleshoot any connectivity problem.",
  },
  {
    week: 4,
    title: "Cybersecurity",
    icon: "🔒",
    subtitle: "Security Principles & Threat Awareness",
    instructor: "Kobie Joyner",
    description:
      "Every IT role is a security role. Whether you're resetting passwords or managing servers, you need to understand threats, defenses, and best practices. This week covers the security fundamentals that protect organizations — and the mistakes that expose them.",
    objectives: [
      "Identify common threat types: malware, phishing, social engineering, ransomware, and insider threats",
      "Understand the CIA triad (Confidentiality, Integrity, Availability) as the foundation of security",
      "Learn authentication methods: passwords, MFA, biometrics, and single sign-on",
      "Apply security best practices: least privilege, patch management, encryption, and incident response basics",
    ],
    activities: [
      "Phishing detection exercise — analyze real email samples and identify red flags",
      "Security audit walkthrough — evaluate a mock company's practices against a security checklist",
      "Password and MFA configuration lab — set up multi-factor authentication across multiple platforms",
    ],
    takeaway:
      "A personal security checklist covering your devices, accounts, and online presence — plus a framework for evaluating organizational security.",
  },
  {
    week: 5,
    title: "Software & Data",
    icon: "🗄️",
    subtitle: "Development Basics & Database Fundamentals",
    instructor: "Kobie Joyner",
    description:
      "You don't need to be a developer, but you need to speak the language. This week bridges the gap between IT support and software — how applications are built, how data is structured, and why understanding both makes you more effective in any tech role.",
    objectives: [
      "Understand the software development lifecycle: planning, development, testing, deployment, maintenance",
      "Learn database fundamentals: tables, records, queries, and the difference between SQL and NoSQL",
      "Explore APIs and how applications communicate with each other",
      "Grasp version control concepts and why they matter beyond development teams",
    ],
    activities: [
      "SQL basics lab — write simple queries to retrieve, filter, and sort data from a sample database",
      "API exploration exercise — use a public API to request and interpret real data",
      "Software lifecycle mapping — trace a familiar app from idea to deployment identifying each SDLC phase",
    ],
    takeaway:
      "A working knowledge of SQL basics and API concepts, with a reference guide of common queries and data operations.",
  },
  {
    week: 6,
    title: "Cloud & IT Support",
    icon: "☁️",
    subtitle: "Cloud Computing & Support Workflows",
    instructor: "Kobie Joyner",
    description:
      "The cloud isn't the future — it's the present. Most businesses run on cloud services, and IT support means knowing how to navigate them. This week covers cloud fundamentals alongside the support workflows and ticketing systems you'll use every day on the job.",
    objectives: [
      "Understand cloud service models: IaaS, PaaS, SaaS — and when each is used",
      "Compare major cloud providers (AWS, Azure, Google Cloud) and their core services",
      "Learn IT support workflows: ticketing systems, SLAs, escalation procedures, and documentation",
      "Practice professional communication for help desk and support interactions",
    ],
    activities: [
      "Cloud services matching exercise — categorize 20 real products into IaaS, PaaS, or SaaS",
      "Mock ticket resolution — work through three support tickets from intake to resolution using proper documentation",
      "Support communication drill — rewrite poorly written support responses into professional, clear messages",
    ],
    takeaway:
      "A support workflow template you can use in any IT role, plus a cloud services reference card mapping common tools to their cloud categories.",
  },
  {
    week: 7,
    title: "Certification Review",
    icon: "🏆",
    subtitle: "Exam Prep & Final Assessment",
    instructor: "Kobie Joyner",
    description:
      "Everything comes together this week. You've built the knowledge — now it's time to sharpen it for the CompTIA Tech+ exam. This session focuses on exam strategy, targeted review of high-weight domains, and a practice assessment to identify any remaining gaps.",
    objectives: [
      "Review all six Tech+ exam domains with emphasis on high-weight areas",
      "Learn exam strategy: time management, elimination techniques, and question interpretation",
      "Identify personal weak areas through a diagnostic practice exam",
      "Build a final study plan for the days between this session and your exam date",
    ],
    activities: [
      "Domain-by-domain rapid review — key concepts and common exam questions for each area",
      "Full-length practice exam under timed conditions",
      "Gap analysis — review missed questions, identify patterns, and prioritize study areas",
    ],
    takeaway:
      "A personalized final study plan based on your practice exam results, plus confidence that you're ready to earn your CompTIA Tech+ certification.",
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

  const techStarted = new Date() >= new Date(TECH_PLUS_START);
  const currentWeek = techStarted ? computeCurrentWeek(TECH_PLUS_START, 7) : 0;

  const isCompleted = techStarted && weekNum < currentWeek;
  const isCurrent = techStarted && weekNum === currentWeek;

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
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl">
            {weekContent.icon}
          </span>
          <div>
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">
              CompTIA Tech+ · Week {weekContent.week}
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
            {weekContent.instructor}
          </span>
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
              ? "Completed"
              : isCurrent
                ? "This Week"
                : !techStarted
                  ? "Starts April 1"
                  : "Upcoming"}
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
