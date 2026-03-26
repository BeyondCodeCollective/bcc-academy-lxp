import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ResourceList } from "@/components/resource-list";
import { Books, VideoCamera, CalendarBlank, Envelope, Link as LinkIcon } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import type { Student, Resource } from "@/lib/types";

const DEMO_RESOURCES: (Resource & { content?: string })[] = [
  {
    id: "demo-1",
    cohort_id: "demo",
    title: "Program Handbook",
    description: "After The Game program guidelines, expectations, and schedule overview",
    category: "program_info",
    url: null,
    created_at: "2026-03-14T00:00:00Z",
    content:
      "Welcome to After The Game — a 7-week program by Beyond Code Collective designed to help former athletes transition into technology careers.\n\n**Program Structure**\n• 7 weeks of live instruction (2 sessions per week)\n• MASS Wraparound: Tuesdays, 10:00 AM – 12:00 PM ET (starts March 24)\n• CompTIA Tech+: Wednesdays & Fridays, 10:00 AM – 12:00 PM ET (starts April 1)\n• Certification: CompTIA Tech+ Foundations (FC0-U71)\n\n**Expectations**\n• Attend all live sessions (recordings available if you miss one)\n• Complete weekly practice quizzes\n• Participate in the group chat\n• Ask questions — there are no dumb ones\n\n**Support**\n• MASS Instructor: Angel Aviles\n• CompTIA Instructor: Kobe\n• Program Lead: Ramon Clemente (ramon.clemente@wearebgc.org)\n• AI Tutor available 24/7 in the portal",
  },
  {
    id: "demo-2",
    cohort_id: "demo",
    title: "CompTIA Tech+ Study Guide",
    description: "Key concepts, vocabulary, and study tips for the certification exam",
    category: "course_materials",
    url: null,
    created_at: "2026-03-15T00:00:00Z",
    content:
      "**CompTIA Tech+ (FC0-U71) Overview**\n\nThe Tech+ certification validates foundational IT knowledge across six domains:\n\n1. **IT Concepts & Terminology** (17%)\n   • Data types, units of measure\n   • Troubleshooting methodology\n   • Basic programming concepts\n\n2. **Infrastructure** (22%)\n   • Devices, peripherals, connectors\n   • Storage, networking components\n\n3. **Applications & Software** (18%)\n   • Operating systems, software management\n   • Web browsers, productivity tools\n\n4. **Software Development** (12%)\n   • Programming logic, data structures\n   • Version control basics\n\n5. **Database Fundamentals** (11%)\n   • Database concepts, structures\n   • SQL basics, data management\n\n6. **Security** (20%)\n   • Confidentiality, integrity, availability\n   • Authentication, access control\n   • Social engineering, malware types\n\n**Exam Details**\n• 75 questions, 60 minutes\n• Multiple choice and performance-based\n• Passing score: 900 (on a scale of 100–900)",
  },
  {
    id: "demo-3",
    cohort_id: "demo",
    title: "Week 1 — Session Notes",
    description: "Course Intro & IT Fundamentals key takeaways",
    category: "course_materials",
    url: null,
    created_at: "2026-03-17T00:00:00Z",
    content:
      "**Week 1: IT Fundamentals**\n\nSession notes will be posted here after the first live session.\n\nTopics to be covered:\n• What is IT? The big picture\n• Hardware vs. Software\n• How computers process information (input → process → output → storage)\n• Binary, bits, and bytes\n• Types of computers and their uses\n• Introduction to troubleshooting methodology",
  },
  {
    id: "demo-4",
    cohort_id: "demo",
    title: "Resume Template",
    description: "Tech career resume template tailored for career changers",
    category: "career_prep",
    url: null,
    created_at: "2026-03-18T00:00:00Z",
    content:
      "**Resume Template for Tech Career Changers**\n\nA resume template will be shared during Week 6 (Cloud & Support).\n\nIn the meantime, start collecting:\n• Your top 5 transferable skills from your sports/previous career\n• Any tech tools or platforms you've used\n• Volunteer or project experience\n• Your CompTIA Tech+ certification (once earned!)\n\n**Tips**\n• Lead with skills, not job titles\n• Highlight teamwork, discipline, and problem-solving from your athletic career\n• Keep it to one page\n• Use action verbs: built, managed, led, analyzed",
  },
];

const instructors = [
  {
    name: "Ramon Clemente",
    role: "Head of ATG",
    track: "Program Lead",
    email: "ramon.clemente@wearebgc.org",
    photo: "/instructors/ramon.jpg",
    calUrl: "https://cal.com/ramon-clemente",
    bio: "Oversees the After The Game program and guides students through their transition into tech.",
    initials: "RC",
    color: "bg-neutral-900 text-white",
    badge: "bg-neutral-100 text-neutral-700",
  },
  {
    name: "Kobe",
    role: "Instructor",
    track: "CompTIA Tech+",
    email: null,
    photo: "/instructors/kobie.jpg",
    calUrl: "https://cal.com/kobie-joyner",
    bio: "Leads all live CompTIA Tech+ Foundations sessions — Wed & Fri, 10am–12pm ET.",
    initials: "KJ",
    color: "bg-blue-600 text-white",
    badge: "bg-blue-50 text-blue-700",
  },
  {
    name: "Angel Aviles",
    role: "Instructor",
    track: "MASS Wraparound",
    email: null,
    photo: "/instructors/angel.jpg",
    calUrl: "https://cal.com/angel-aviles",
    bio: "Leads the 8-week MASS coaching series on mindset, accountability, soft skills, and networking.",
    initials: "AA",
    color: "bg-amber-500 text-white",
    badge: "bg-amber-50 text-amber-700",
  },
];

const quickLinks = [
  {
    label: "MASS Live Session",
    description: "Tuesdays 10am–12pm ET",
    url: "https://meet.google.com",
    icon: VideoCamera,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    label: "CompTIA Live Session",
    description: "Wed & Fri 10am–12pm ET",
    url: "https://meet.google.com",
    icon: VideoCamera,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "CompTIA CertMaster",
    description: "Official study platform",
    url: "https://www.comptia.org/training/certmaster",
    icon: LinkIcon,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    label: "Professor Messer (Free)",
    description: "Tech+ video lessons",
    url: "https://www.professormesser.com/free-a-plus-training/fc0-u71/",
    icon: LinkIcon,
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

export default async function ResourcesPage() {
  let resources: (Resource & { content?: string })[] = DEMO_RESOURCES;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) redirect("/");

    const { data: student } = await supabase
      .from("students")
      .select("cohort_id")
      .eq("id", session.user.id)
      .single<Pick<Student, "cohort_id">>();

    let cohortId = student?.cohort_id;

    if (!cohortId) {
      const { data: defaultCohort } = await supabase
        .from("cohorts")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (defaultCohort) {
        await supabase
          .from("students")
          .update({ cohort_id: defaultCohort.id })
          .eq("id", session.user.id);
        cohortId = defaultCohort.id;
      }
    }

    if (!cohortId) redirect("/dashboard");

    const { data: dbResources } = await supabase
      .from("resources")
      .select("*")
      .eq("cohort_id", cohortId)
      .order("created_at", { ascending: false })
      .returns<Resource[]>();

    resources = dbResources || [];
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Resources</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Your instructors, course materials, and program links
        </p>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Quick Links
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${link.bg}`}>
                  <Icon size={16} weight="bold" className={link.color} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 leading-tight">
                    {link.label}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {link.description}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Instructors */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Your Instructors
        </h2>
        <div className="grid gap-3">
          {instructors.map((inst) => (
            <div
              key={inst.name}
              className="flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-4"
            >
              <div className="relative h-12 w-12 shrink-0">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${inst.color}`}
                >
                  {inst.initials}
                </div>
                <Image
                  src={inst.photo}
                  alt={inst.name}
                  width={48}
                  height={48}
                  className="absolute inset-0 h-12 w-12 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-neutral-900">
                    {inst.name}
                  </p>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${inst.badge}`}
                  >
                    {inst.track}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">{inst.role}</p>
                <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                  {inst.bio}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {inst.email && (
                    <a
                      href={`mailto:${inst.email}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                    >
                      <Envelope size={12} weight="bold" />
                      {inst.email}
                    </a>
                  )}
                  <a
                    href={inst.calUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
                  >
                    <CalendarBlank size={12} weight="bold" />
                    Schedule Office Hours
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Materials */}
      {resources.length > 0 ? (
        <ResourceList resources={resources} />
      ) : (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Course Materials
          </h2>
          <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white py-12 text-center">
            <Books size={40} weight="bold" className="mb-3 text-neutral-200" />
            <p className="text-sm font-medium text-neutral-900">
              Materials coming soon
            </p>
            <p className="mt-1 max-w-xs text-xs text-neutral-400">
              Course materials will be posted here as the program progresses.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
