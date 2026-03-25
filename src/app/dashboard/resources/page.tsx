import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ResourceList } from "@/components/resource-list";
import { BookOpen, Mail, Calendar } from "lucide-react";
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
      "Welcome to After The Game — a 7-week program by Beyond Code Collective designed to help former athletes transition into technology careers.\n\n**Program Structure**\n• 7 weeks of live instruction (2 sessions per week)\n• Sessions: Tuesdays & Thursdays, 6:00–8:00 PM ET\n• Certification: CompTIA Tech+ Foundations\n\n**Expectations**\n• Attend all live sessions (recordings available if you miss one)\n• Complete weekly practice quizzes\n• Participate in the group chat\n• Ask questions — there are no dumb ones\n\n**Support**\n• Instructor: Kobie Joyner (kkjoyner@gmail.com)\n• Program Lead: Ramon Clemente\n• AI Tutor available 24/7 in the portal",
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

  if (resources.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 px-5 py-8">
        <h1 className="text-2xl font-bold text-neutral-900">Resources</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen size={48} className="mb-4 text-neutral-200" />
          <p className="text-lg font-medium text-neutral-900">
            No resources yet
          </p>
          <p className="mt-1 max-w-sm text-sm text-neutral-400">
            Resources will be added as the program progresses.
          </p>
        </div>
      </div>
    );
  }

  const instructors = [
    {
      name: "Ramon Clemente",
      role: "Program Lead",
      track: "After The Game",
      email: "ramon.clemente@wearebgc.org",
      photo: "/instructors/ramon.jpg",
      calUrl: "https://cal.com/ramon-clemente",
      bio: "Oversees the After The Game program and student success.",
      initials: "RC",
      color: "bg-neutral-900 text-white",
      badge: "bg-neutral-700 text-neutral-200",
    },
    {
      name: "Kobie Joyner",
      role: "Instructor",
      track: "CompTIA Tech+",
      email: "kkjoyner@gmail.com",
      photo: "/instructors/kobie.jpg",
      calUrl: "https://cal.com/kobie-joyner",
      bio: "Leads all live CompTIA Tech+ certification sessions.",
      initials: "KJ",
      color: "bg-blue-600 text-white",
      badge: "bg-blue-500 text-blue-100",
    },
    {
      name: "Angel Aviles",
      role: "Instructor",
      track: "MASS Wraparound",
      email: null,
      photo: "/instructors/angel.jpg",
      calUrl: "https://cal.com/angel-aviles",
      bio: "Leads the 8-week MASS coaching on mindset, networking, and soft skills.",
      initials: "AA",
      color: "bg-amber-500 text-white",
      badge: "bg-amber-400 text-amber-900",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-5 py-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Resources</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Your instructors, course materials, and career prep
        </p>
      </div>

      {/* Instructors */}
      <div>
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">
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
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
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
                      <Mail size={12} />
                      {inst.email}
                    </a>
                  )}
                  <a
                    href={inst.calUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition-colors"
                  >
                    <Calendar size={12} />
                    Schedule Office Hours
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ResourceList resources={resources} />
    </div>
  );
}
