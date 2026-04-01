import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { computeCurrentWeek, formatDate, formatTime } from "@/lib/utils";
import { ArrowLeft, Video, Play, FileText, BookOpen, Clock, Calendar } from "lucide-react";
import type { Session, Student, Cohort } from "@/lib/types";

/* ── Demo session details ─────────────────────────────────────── */

type SessionDetail = Session & {
  notes?: string;
  recording_url?: string;
  materials?: { title: string; description: string; content: string }[];
};

function makeDemoDetail(
  week: number,
  num: number,
  title: string,
  extras: Partial<Pick<SessionDetail, "notes" | "recording_url" | "materials">>
): SessionDetail {
  return {
    id: `demo-w${week}-s${num}`,
    cohort_id: "demo",
    week_number: week,
    session_number: (week - 1) * 2 + num,
    title,
    description: null,
    session_date: "2026-03-24",
    start_time: "18:00:00",
    end_time: "20:00:00",
    meeting_link: "#",
    status: "upcoming",
    created_at: new Date().toISOString(),
    ...extras,
  };
}

const DEMO_SESSION_DETAILS: SessionDetail[] = [
  makeDemoDetail(1, 1, "MASS Kickoff — Meet Your Coaches", {
    notes:
      "**Welcome to MASS (Mindset & Soft Skills)**\n\nA lot of people have talent. Not everyone knows how to communicate it, apply it, and keep going when things feel uncertain. That is what we are here to build.\n\nTechnical skills matter. This is the part that helps you speak up, trust yourself, build real confidence, and show people what you bring to the table.\n\n**Why MASS Exists**\n• To help you move different\n• To turn potential into momentum\n• To give you what most programs miss\n\nResumes matter. Certifications matter. But clarity, courage, communication, and self-advocacy are what help you stand out, get remembered, and keep growing.\n\n**Meet Your Coaches**\n\n**Angel Aviles** — Award-winning coach, author, and workforce development leader. Since 2011, she has coached hundreds in career and workforce development. She brings a practice-based approach that helps emerging professionals turn potential into clarity, courage, and career momentum.\n\n**Yvette Ross** — Career strategist, tech leader, mentor & speaker. Passionate about empowering individuals to define purpose, accelerate growth, and unlock opportunities across tech, leadership, and careers.",
    materials: [
      {
        title: "MASS Program Overview",
        description: "8-week hybrid coaching initiative",
        content:
          "**MASS — Mindset & Soft Skills Program**\n\n**The Framework: Clarity, Courage, Confidence**\n\n**Clarity** — Remove confusion and name what matters most right now.\n• Identify your current reality: strengths, gaps, constraints, opportunities\n• Define a north star (role direction + why it fits)\n• Build a clear personal narrative: who I am, what I've done, where I'm going\n\n**Courage** — Practice the uncomfortable actions that unlock opportunities.\n• Run reps on scary tasks: mock interviews, outreach, portfolio updates\n• Learn the exposure ladder: small to medium to big moves\n• Most career blocks aren't knowledge gaps — they're action avoidance\n\n**Confidence** — Confidence that comes from receipts, not hype.\n• Convert reps into evidence: feedback, wins, metrics, testimonials\n• Build a Brag Book (portfolio of proof) to fight imposter syndrome with data\n• Learn how to recover: reflect, adjust, repeat",
      },
    ],
  }),
  makeDemoDetail(1, 2, "MASS Overview — Clarity, Courage, Confidence", {
    notes:
      "**MASS 8-Week Program Timeline**\n\n**Week 1: Storytelling**\nCrafting your personal narrative to highlight experiences and values.\n\n**Week 2: Networking**\nBuild meaningful connections and expand your professional network for future opportunities.\n\n**Week 3: The Art of the Brag**\nDeveloping self-confidence and learning to own your worth in any setting.\n\n**Week 4: Guest Speaker**\nTBA\n\n**Week 5: Planning**\nCreate actionable plans to strategize your future career path effectively.\n\n**Week 6: Guest Speaker**\nTBA\n\n**Week 7: Money**\nGain essential financial knowledge to secure your economic future and independence.\n\n**Week 8: Career Expo**\nMini career fair — put everything into practice.",
    materials: [
      {
        title: "What You Will Build",
        description: "Your MASS toolkit over 8 weeks",
        content:
          "**Your MASS Toolkit**\n\n**Clarity**\n• A clear personal narrative\n• Defined career direction and next steps\n• Strategic focus instead of scattered effort\n\n**Courage**\n• Mock interview experience (recorded)\n• Outreach to mentors and strangers\n• Published portfolio or story\n• Negotiation practice\n\n**Confidence**\n• A Brag Book — portfolio of proof to fight imposter syndrome\n• Documented wins, feedback, and metrics\n• Recovery framework: reflect, adjust, repeat\n\n**Format**\n• Weekly sessions (hybrid — in-person and virtual)\n• One-on-one coaching available\n• Group activities and online resources",
      },
    ],
  }),
  makeDemoDetail(2, 1, "Device Configuration", {
    notes:
      "**Devices & Configuration**\n\nLearn about different computing devices, their components, and how to configure them for various use cases.\n\n**Topics**\n• Desktop vs. laptop vs. mobile devices\n• Peripherals and connectors (USB, HDMI, Thunderbolt)\n• Device setup and configuration\n• BIOS/UEFI basics",
  }),
  makeDemoDetail(2, 2, "Operating Systems", {
    notes:
      "**Operating Systems**\n\nUnderstand how operating systems work and the differences between major platforms.\n\n**Topics**\n• Windows, macOS, Linux, ChromeOS\n• File systems and directory structures\n• Installing and updating software\n• Task Manager and system monitoring",
  }),
  makeDemoDetail(3, 1, "Networking Basics", {
    notes:
      "**Networking Basics**\n\nIntroduction to how computers communicate and share information.\n\n**Topics**\n• LANs, WANs, and the Internet\n• IP addresses and MAC addresses\n• Routers, switches, and access points\n• Wired vs. wireless networking",
  }),
  makeDemoDetail(3, 2, "TCP/IP & DNS", {
    notes:
      "**TCP/IP & DNS**\n\nDive deeper into networking protocols and how the internet works.\n\n**Topics**\n• The TCP/IP model (4 layers)\n• How DNS resolves domain names\n• Ports and protocols (HTTP, HTTPS, FTP, SSH)\n• Troubleshooting with ping and traceroute",
  }),
  makeDemoDetail(4, 1, "Security Principles", {
    notes:
      "**Security Principles**\n\nLearn the foundational concepts of cybersecurity.\n\n**Topics**\n• CIA Triad: Confidentiality, Integrity, Availability\n• Authentication vs. Authorization\n• Passwords, MFA, and biometrics\n• Physical security basics",
  }),
  makeDemoDetail(4, 2, "Threat Landscape", {
    notes:
      "**Threat Landscape**\n\nUnderstand common cyber threats and how to defend against them.\n\n**Topics**\n• Malware types: viruses, ransomware, trojans\n• Social engineering and phishing\n• Firewalls and antivirus\n• Safe browsing and email practices",
  }),
  makeDemoDetail(5, 1, "Software Dev Basics", {
    notes:
      "**Software Development Basics**\n\nIntroduction to how software is built.\n\n**Topics**\n• Programming concepts: variables, loops, conditions\n• High-level vs. low-level languages\n• Version control with Git\n• Software development lifecycle (SDLC)",
  }),
  makeDemoDetail(5, 2, "Database Fundamentals", {
    notes:
      "**Database Fundamentals**\n\nLearn how data is stored, organized, and retrieved.\n\n**Topics**\n• What is a database?\n• Tables, rows, columns, and keys\n• SQL basics: SELECT, INSERT, UPDATE\n• Relational vs. non-relational databases",
  }),
  makeDemoDetail(6, 1, "Cloud Concepts", {
    notes:
      "**Cloud Concepts**\n\nUnderstand cloud computing and its role in modern IT.\n\n**Topics**\n• What is the cloud? (IaaS, PaaS, SaaS)\n• AWS, Azure, Google Cloud overview\n• Benefits: scalability, cost, accessibility\n• Cloud storage and collaboration tools",
  }),
  makeDemoDetail(6, 2, "IT Support Workflows", {
    notes:
      "**IT Support Workflows**\n\nLearn how IT professionals troubleshoot and support users.\n\n**Topics**\n• Troubleshooting methodology\n• Help desk and ticketing systems\n• Remote support tools\n• Customer service skills in IT",
  }),
  makeDemoDetail(7, 1, "Certification Review", {
    notes:
      "**Certification Review**\n\nComprehensive review of all domains covered in the CompTIA Tech+ exam.\n\n**Topics**\n• Review of all 6 exam domains\n• Practice questions and test strategies\n• Time management during the exam\n• Study tips and resources",
  }),
  makeDemoDetail(7, 2, "Final Assessment", {
    notes:
      "**Final Assessment**\n\nPractice exam and final preparation for the CompTIA Tech+ certification.\n\n**Topics**\n• Full-length practice exam\n• Review of missed questions\n• Exam registration walkthrough\n• What comes next: Network+ and beyond",
  }),
];

/* ── Page ──────────────────────────────────────────────────────── */

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  let session: SessionDetail | null = null;
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

    if (!student?.cohort_id) redirect("/dashboard");

    const { data: cohort } = await supabase
      .from("cohorts")
      .select("*")
      .eq("id", student.cohort_id)
      .single<Cohort>();

    if (cohort) {
      currentWeek = computeCurrentWeek(cohort.start_date, cohort.total_weeks);
    }

    const { data: dbSession } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("cohort_id", student.cohort_id)
      .single<Session>();

    if (dbSession) {
      session = dbSession;
    } else {
      // Fall back to built-in demo content (e.g. MASS kickoff cards)
      session = DEMO_SESSION_DETAILS.find((s) => s.id === sessionId) ?? null;
    }
  } else {
    session =
      DEMO_SESSION_DETAILS.find((s) => s.id === sessionId) ?? null;
  }

  if (!session) notFound();

  const WEEK_TOPICS: Record<number, string> = {
    1: "Storytelling + IT Fundamentals",
    2: "Networking + Devices & OS",
    3: "Self-Advocacy + Networking",
    4: "Guest Speaker + Cybersecurity",
    5: "Planning + Software & Data",
    6: "Guest Speaker + Cloud & Support",
    7: "Financial Confidence + Cert Review",
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8">
      {/* Back link */}
      <Link
        href={`/dashboard/schedule?week=${session.week_number}`}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-900 transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Week {session.week_number}: {WEEK_TOPICS[session.week_number] ?? `Week ${session.week_number}`}
      </Link>

      {/* Session header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
            {session.session_number}
          </span>
          <h1 className="text-2xl font-bold text-neutral-900">
            {session.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-neutral-400">
          {session.session_date && (
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {formatDate(session.session_date)}
            </span>
          )}
          {session.start_time && session.end_time && (
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {formatTime(session.start_time)} – {formatTime(session.end_time)}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              session.status === "completed"
                ? "bg-green-50 text-green-600"
                : session.status === "upcoming"
                  ? "bg-neutral-100 text-neutral-500"
                  : "bg-red-50 text-red-500"
            }`}
          >
            {session.status}
          </span>
        </div>

        {/* Join button */}
        {session.status === "upcoming" && session.meeting_link && session.meeting_link !== "#" && (
          session.week_number <= currentWeek ? (
            <a
              href={session.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              <Video size={16} />
              Join Session
            </a>
          ) : (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-400 cursor-not-allowed">
              <Video size={16} />
              Not Available Yet
            </div>
          )
        )}
      </div>

      {/* Replay */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white overflow-hidden">
        {session.recording_url ? (
          <a
            href={session.recording_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-5 transition-colors hover:bg-neutral-50"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-900">
              <Play size={20} className="text-white ml-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900">
                Watch Replay
              </p>
              <p className="text-xs text-neutral-400">
                Session recording available
              </p>
            </div>
            <Video size={18} className="shrink-0 text-neutral-300" />
          </a>
        ) : (
          <div className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100">
              <Play size={20} className="text-neutral-300 ml-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-400">
                Replay
              </p>
              <p className="text-xs text-neutral-300">
                Available after the session
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {session.notes && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={14} className="text-neutral-400" />
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
              Session Notes
            </h2>
          </div>
          <div className="prose prose-sm prose-neutral max-w-none">
            {session.notes.split("\n").map((line, i) => {
              if (line.startsWith("**") && line.endsWith("**")) {
                return (
                  <h3
                    key={i}
                    className="mt-4 mb-2 text-sm font-semibold text-neutral-900 first:mt-0"
                  >
                    {line.replace(/\*\*/g, "")}
                  </h3>
                );
              }
              if (line.startsWith("•")) {
                return (
                  <p
                    key={i}
                    className="ml-3 text-sm text-neutral-600 leading-relaxed"
                  >
                    {line}
                  </p>
                );
              }
              if (line.trim() === "") return <div key={i} className="h-2" />;
              const parts = line.split(/(\*\*[^*]+\*\*)/g);
              return (
                <p
                  key={i}
                  className="text-sm text-neutral-600 leading-relaxed"
                >
                  {parts.map((part, j) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong
                        key={j}
                        className="font-semibold text-neutral-900"
                      >
                        {part.replace(/\*\*/g, "")}
                      </strong>
                    ) : (
                      part
                    )
                  )}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Materials */}
      {session.materials && session.materials.length > 0 && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={14} className="text-neutral-400" />
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
              Materials
            </h2>
          </div>
          <div className="space-y-4">
            {session.materials.map((mat, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-neutral-100 bg-neutral-50 p-4"
              >
                <p className="text-sm font-medium text-neutral-900">
                  {mat.title}
                </p>
                {mat.description && (
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {mat.description}
                  </p>
                )}
                <div className="mt-3 text-sm text-neutral-600 leading-relaxed">
                  {mat.content.split("\n").map((line, i) => {
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return (
                        <h4
                          key={i}
                          className="mt-3 mb-1 text-sm font-semibold text-neutral-900 first:mt-0"
                        >
                          {line.replace(/\*\*/g, "")}
                        </h4>
                      );
                    }
                    if (line.startsWith("•")) {
                      return (
                        <p key={i} className="ml-3 leading-relaxed">
                          {line}
                        </p>
                      );
                    }
                    if (line.trim() === "")
                      return <div key={i} className="h-2" />;
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <p key={i} className="leading-relaxed">
                        {parts.map((part, j) =>
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong
                              key={j}
                              className="font-semibold text-neutral-900"
                            >
                              {part.replace(/\*\*/g, "")}
                            </strong>
                          ) : (
                            part
                          )
                        )}
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no notes or materials */}
      {!session.notes && (!session.materials || session.materials.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen size={40} className="mb-3 text-neutral-200" />
          <p className="text-sm font-medium text-neutral-500">
            Notes and materials will appear here after the session
          </p>
        </div>
      )}
    </div>
  );
}
