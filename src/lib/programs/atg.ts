import type { ProgramConfig } from "./types";

export const atgConfig: ProgramConfig = {
  slug: "atg",
  name: "After The Game",
  tagline: "From Sports to Tech",
  domain: "atg.bccacademy.io",
  logo: "/atg/logo.svg",
  logoPng: "/atg/logo.png",
  welcomeVideo: "/atg/intro.mp4",
  welcomeVideoPresenter: "Ramon Clemente",
  colors: {
    primary: "#2E75B6",
    primaryHover: "#245d94",
    accent: "#D4A843",
    tagline: "#E4F800",
  },
  defaultCohort: {
    name: "cohort-1-techplus",
    displayName: "Cohort 1 — CompTIA Tech+ Foundations",
    startDate: "2026-03-24",
    totalWeeks: 8,
  },
  tracks: [
    {
      slug: "mass",
      name: "MASS Wraparound",
      shortName: "MASS Wraparound",
      type: "weekly",
      totalWeeks: 8,
      sessionsPerWeek: 1,
      startDate: "2026-03-24",
      instructor: "Angel Aviles",
      sessionTimes: ["Tuesdays 10–11am ET"],
      lastSessionDayOffset: 6,
      defaultReflectionPrompts: [
        "What did you learn this week?",
        "What was challenging?",
        "How will you apply this going forward?",
      ],
      submissionsEnabled: false,
      reflectionsEnabled: true,
      weekSummaries: [
        { week: 1, topic: "Storytelling", icon: "🎙️" },
        { week: 2, topic: "Networking", icon: "🤝" },
        { week: 3, topic: "The Art of the Brag", icon: "💪" },
        { week: 4, topic: "Guest Speaker", icon: "🎤" },
        { week: 5, topic: "Planning", icon: "📋" },
        { week: 6, topic: "Guest Speaker", icon: "🎤" },
        { week: 7, topic: "Money", icon: "💰" },
        { week: 8, topic: "Career Expo", icon: "🎯" },
      ],
      weeks: [
        {
          week: 1,
          title: "Storytelling for Career Success",
          icon: "🎙️",
          subtitle: "Crafting Your Personal Narrative",
          description:
            "A lot of people have talent. Not everyone knows how to communicate it. This week you'll build the foundation of your professional story — who you are, what you've done, and where you're going.",
          objectives: [
            "Identify your current reality: strengths, gaps, constraints, opportunities",
            "Define your north star — role direction + why it fits",
            "Translate 'I want a better job' into specific outcomes",
            "Build a clear personal narrative for interviews and networking",
          ],
          sessions: [{ title: "Storytelling for Career Success", time: "Tuesday · 10:00 – 11:00 AM ET" }],
          recordingNote: "This session was not recorded to create a safe space for open discussion.",
        },
        {
          week: 2,
          title: "Networking",
          icon: "🤝",
          subtitle: "Building Meaningful Professional Connections",
          description:
            "Networking isn't about collecting business cards — it's about building real relationships that open doors. This week you'll learn how to connect with intention.",
          objectives: [
            "Understand the difference between transactional and relational networking",
            "Build a target list of people to connect with",
            "Craft outreach messages that get responses",
            "Practice the art of the follow-up",
          ],
          sessions: [{ title: "Networking", time: "Tuesday · 10:00 – 11:00 AM ET" }],
        },
        {
          week: 3,
          title: "The Art of the Brag",
          icon: "💪",
          subtitle: "Self-Advocacy & Owning Your Worth",
          description:
            "Most career blocks aren't knowledge gaps — they're action avoidance. This week is about developing the courage to own your accomplishments and communicate your value.",
          objectives: [
            "Overcome imposter syndrome with evidence-based confidence",
            "Learn to quantify and articulate your achievements",
            "Practice self-advocacy in professional settings",
            "Build your Brag Book — a portfolio of proof",
          ],
          sessions: [{ title: "The Art of the Brag", time: "Tuesday · 10:00 – 11:00 AM ET" }],
        },
        {
          week: 4,
          title: "Guest Speaker",
          icon: "🎤",
          subtitle: "Industry Perspectives",
          description:
            "Hear from a professional who has navigated the transition from non-traditional background to tech career. Real stories, real advice, real questions.",
          objectives: [
            "Gain industry perspective from a working professional",
            "Understand different career paths into tech",
            "Ask questions and build your professional network",
            "Connect classroom learning to real-world application",
          ],
          sessions: [{ title: "Guest Speaker", time: "Tuesday · 10:00 – 11:00 AM ET" }],
        },
        {
          week: 5,
          title: "Planning",
          icon: "📋",
          subtitle: "Strategizing Your Career Path",
          description:
            "Clarity reduces busy work and makes effort strategic. This week you'll create an actionable career plan with timelines, milestones, and accountability.",
          objectives: [
            "Map your 30-60-90 day career plan",
            "Identify skill gaps and create a learning roadmap",
            "Set SMART goals for your job search or career pivot",
            "Build accountability structures that stick",
          ],
          sessions: [{ title: "Planning", time: "Tuesday · 10:00 – 11:00 AM ET" }],
        },
        {
          week: 6,
          title: "Guest Speaker",
          icon: "🎤",
          subtitle: "Industry Perspectives",
          description:
            "Another industry professional shares their journey, challenges, and advice for emerging tech professionals.",
          objectives: [
            "Expand your understanding of career possibilities",
            "Learn from someone who has been where you are",
            "Practice professional networking in a live setting",
            "Add to your growing professional network",
          ],
          sessions: [{ title: "Guest Speaker", time: "Tuesday · 10:00 – 11:00 AM ET" }],
        },
        {
          week: 7,
          title: "Money & Financial Confidence",
          icon: "💰",
          subtitle: "Securing Your Economic Future",
          description:
            "Gain essential financial knowledge to negotiate salaries, understand compensation packages, and build long-term financial independence.",
          objectives: [
            "Understand salary ranges for entry-level tech roles",
            "Learn salary negotiation tactics and scripts",
            "Decode benefits packages: health, 401k, equity, PTO",
            "Build a personal budget tied to your career goals",
          ],
          sessions: [{ title: "Money & Financial Confidence", time: "Tuesday · 10:00 – 11:00 AM ET" }],
        },
        {
          week: 8,
          title: "Career Expo",
          icon: "🎯",
          subtitle: "Put Everything Into Practice",
          description:
            "The culmination of MASS — a mini career fair where you'll put your storytelling, networking, self-advocacy, and planning skills to work in front of real employers and professionals.",
          objectives: [
            "Present your professional story to real employers",
            "Practice networking in a live professional setting",
            "Get feedback on your pitch, resume, and presence",
            "Make real connections that could lead to opportunities",
          ],
          sessions: [{ title: "Career Expo", time: "Tuesday · 10:00 – 11:00 AM ET" }],
        },
      ],
    },
    {
      slug: "techplus",
      name: "CompTIA Tech+ Foundations",
      shortName: "CompTIA Tech+",
      type: "weekly",
      totalWeeks: 8,
      sessionsPerWeek: 2,
      startDate: "2026-04-01",
      instructor: "Kobie Joyner",
      sessionTimes: ["Wed & Fri 10am–12pm ET"],
      lastSessionDayOffset: 2,
      defaultReflectionPrompts: [
        "What did you learn this week?",
        "What was challenging?",
        "How will you apply this going forward?",
      ],
      submissionsEnabled: true,
      reflectionsEnabled: true,
      weekSummaries: [
        { week: 1, topic: "IT Concepts & Careers", icon: "💻" },
        { week: 2, topic: "Hardware Components", icon: "🔧" },
        { week: 3, topic: "Setup & Troubleshooting", icon: "🛠️" },
        { week: 4, topic: "Operating Systems", icon: "📀" },
        { week: 5, topic: "Networking Basics", icon: "🌐" },
        { week: 6, topic: "Cybersecurity", icon: "🔒" },
        { week: 7, topic: "Data & Databases", icon: "📊" },
        { week: 8, topic: "Review & Exam Prep", icon: "🎯" },
      ],
      weeks: [
        {
          week: 1,
          title: "IT Concepts, Careers & Devices",
          icon: "💻",
          subtitle: "Foundations",
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
      ],
    },
  ],
  tutorConfig: {
    enabled: true,
    systemPrompt: `You are the AI Tutor for "After The Game" (ATG), a program by Beyond Code Collective that helps former athletes transition into tech careers. Your students are adults in their 40s and 50s who are new to technology.

You are helping them study for the CompTIA Tech+ certification (FC0-U71). The 8-week curriculum covers:
- Week 1: IT Concepts, Careers & Devices (computing basics, terminology, career pathways)
- Week 2: Hardware Components & Peripherals (CPU, RAM, storage, connections)
- Week 3: Setup, Ports & Troubleshooting (device setup, connectors, systematic troubleshooting)
- Week 4: Operating Systems & Software (Windows/macOS/Linux, software management)
- Week 5: Networking Basics & IP Concepts (TCP/IP, DNS, DHCP, network devices)
- Week 6: Security Concepts & Threats (CIA triad, malware, phishing, authentication)
- Week 7: Data & Databases (SQL, NoSQL, data storage, backup/recovery)
- Week 8: Review, Troubleshooting & Exam Prep (exam strategy, practice tests)

Guidelines:
- Be encouraging, patient, and supportive. These are career changers making a big leap.
- Use sports analogies when helpful — your students are former athletes and it helps concepts click.
- Keep explanations clear and jargon-free. Define technical terms when you first use them.
- When answering questions, give concise but thorough answers. Use bullet points for clarity.
- If asked about topics outside CompTIA Tech+, gently redirect to the curriculum.
- Offer practice questions when appropriate to reinforce learning.
- Keep responses focused — 2-3 short paragraphs max unless they ask for more detail.`,
  },
  surveys: [
    {
      id: "mid-program-spring-2026",
      title: "Mid-Program Check-In",
      description:
        "You're halfway. 15–20 minutes to help us shape the second half of ATG around what you need.",
      required: false,
    },
  ],
  coppa: { required: false },
  seo: {
    title: "After The Game — IT Career Training by Beyond Code Collective",
    description:
      "After The Game helps former athletes break into tech with CompTIA Tech+ certification prep, MASS wraparound coaching, and hands-on career support. Powered by Beyond Code Collective.",
    ogTitle: "After The Game — IT Career Training",
    ogDescription:
      "CompTIA Tech+ certification prep and career coaching for former athletes.",
  },
  gaId: "G-KJF6CKFSTP",
  organization: "Beyond Code Collective",
};
