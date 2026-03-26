import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ResourcesContent } from "./resources-content";
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

  return <ResourcesContent resources={resources} />;
}
