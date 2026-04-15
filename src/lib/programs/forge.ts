import type { ProgramConfig } from "./types";

export const forgeConfig: ProgramConfig = {
  slug: "forge",
  name: "The Forge",
  tagline: "Where Innovation Meets Community",
  domain: "forge.bccacademy.io",
  logo: "/forge/logo.svg",
  colors: {
    primary: "#0047AB",
    primaryHover: "#003A8C",
    accent: "#2563EB",
    tagline: "#60A5FA",
  },
  defaultCohort: {
    name: "forge-cohort-1",
    displayName: "The Forge — Cohort 1",
    startDate: "2026-04-17",
    totalWeeks: 8,
  },
  tracks: [
    {
      slug: "ai-fundamentals",
      name: "Basic AI Fundamentals",
      shortName: "AI Fundamentals",
      type: "weekly",
      totalWeeks: 4,
      sessionsPerWeek: 1,
      startDate: "2026-04-17",
      instructor: "TBA",
      sessionTimes: ["Fridays · TBD"],
      lastSessionDayOffset: 6,
      weekSummaries: [
        { week: 1, topic: "What is AI?", icon: "🤖" },
        { week: 2, topic: "How AI Learns", icon: "🧠" },
        { week: 3, topic: "AI Tools & Prompting", icon: "💬" },
        { week: 4, topic: "AI in the Real World", icon: "🌍" },
      ],
      weeks: [
        {
          week: 1,
          title: "What is AI?",
          icon: "🤖",
          subtitle: "Introduction to Artificial Intelligence",
          description:
            "Understand what artificial intelligence actually is, how it works at a high level, and why it matters for your future career.",
          objectives: [
            "Define AI, machine learning, and deep learning",
            "Understand the difference between narrow AI and general AI",
            "Identify AI in everyday life (recommendations, assistants, search)",
            "Discuss the history and trajectory of AI development",
          ],
          sessions: [{ title: "What is AI?", time: "Friday · Time TBD" }],
        },
        {
          week: 2,
          title: "How AI Learns",
          icon: "🧠",
          subtitle: "Machine Learning Basics",
          description:
            "Explore how machines learn from data — training, patterns, and predictions explained in plain language.",
          objectives: [
            "Understand training data, models, and predictions",
            "Learn the difference between supervised and unsupervised learning",
            "See real examples of AI training in action",
            "Discuss bias in AI and why it matters",
          ],
          sessions: [{ title: "How AI Learns", time: "Friday · Time TBD" }],
        },
        {
          week: 3,
          title: "AI Tools & Prompting",
          icon: "💬",
          subtitle: "Hands-On with AI",
          description:
            "Get hands-on with AI tools. Learn to write effective prompts and use AI assistants for real tasks.",
          objectives: [
            "Use ChatGPT, Claude, and other AI assistants effectively",
            "Write clear, specific prompts that get better results",
            "Understand context windows, tokens, and model limitations",
            "Practice using AI for writing, research, and problem-solving",
          ],
          sessions: [{ title: "AI Tools & Prompting", time: "Friday · Time TBD" }],
        },
        {
          week: 4,
          title: "AI in the Real World",
          icon: "🌍",
          subtitle: "Applications & Ethics",
          description:
            "Explore how AI is being used across industries and the ethical questions that come with it.",
          objectives: [
            "Identify AI applications in healthcare, education, business, and creative fields",
            "Discuss ethical concerns: privacy, job displacement, deepfakes",
            "Understand responsible AI use and digital citizenship",
            "Plan your next steps for learning more about AI",
          ],
          sessions: [{ title: "AI in the Real World", time: "Friday · Time TBD" }],
        },
      ],
    },
    {
      slug: "ai-digital-natives",
      name: "AI for Digital Natives",
      shortName: "AI Digital Natives",
      type: "weekly",
      totalWeeks: 8,
      sessionsPerWeek: 1,
      startDate: "2026-04-20",
      instructor: "TBA",
      sessionTimes: ["Day & time TBD"],
      lastSessionDayOffset: 6,
      weekSummaries: [
        { week: 1, topic: "AI Landscape", icon: "🗺️" },
        { week: 2, topic: "Prompt Engineering", icon: "✍️" },
        { week: 3, topic: "AI for Content", icon: "🎨" },
        { week: 4, topic: "AI for Code", icon: "💻" },
        { week: 5, topic: "AI for Data", icon: "📊" },
        { week: 6, topic: "Building with AI APIs", icon: "🔌" },
        { week: 7, topic: "AI Ethics & Safety", icon: "🛡️" },
        { week: 8, topic: "Capstone Project", icon: "🎯" },
      ],
      weeks: [
        {
          week: 1,
          title: "The AI Landscape",
          icon: "🗺️",
          subtitle: "Understanding Today's AI Ecosystem",
          description: "Survey the current AI landscape — models, companies, tools, and where things are heading.",
          objectives: [
            "Map the major AI companies, models, and tools",
            "Understand the difference between open and closed AI models",
            "Explore trending AI applications and use cases",
            "Set up your AI toolkit for the course",
          ],
          sessions: [{ title: "The AI Landscape", time: "Day & time TBD" }],
        },
        {
          week: 2,
          title: "Prompt Engineering",
          icon: "✍️",
          subtitle: "Mastering AI Communication",
          description: "Learn advanced prompting techniques to get the most out of AI language models.",
          objectives: [
            "Master zero-shot, few-shot, and chain-of-thought prompting",
            "Learn system prompts and persona-based interactions",
            "Practice structured output generation (JSON, tables, code)",
            "Build a personal prompt library",
          ],
          sessions: [{ title: "Prompt Engineering", time: "Day & time TBD" }],
        },
        {
          week: 3,
          title: "AI for Content Creation",
          icon: "🎨",
          subtitle: "Creative AI Tools",
          description: "Use AI to create text, images, audio, and video content.",
          objectives: [
            "Generate and edit images with AI tools",
            "Create written content with AI assistance",
            "Explore AI audio and video generation",
            "Understand copyright and attribution with AI-generated content",
          ],
          sessions: [{ title: "AI for Content Creation", time: "Day & time TBD" }],
        },
        {
          week: 4,
          title: "AI for Code",
          icon: "💻",
          subtitle: "Programming with AI Assistance",
          description: "Learn to use AI as a coding partner — from generating code to debugging and learning new languages.",
          objectives: [
            "Use AI coding assistants (Copilot, Claude, Cursor)",
            "Generate, debug, and refactor code with AI",
            "Build a simple project with AI pair programming",
            "Understand the limits of AI-generated code",
          ],
          sessions: [{ title: "AI for Code", time: "Day & time TBD" }],
        },
        {
          week: 5,
          title: "AI for Data",
          icon: "📊",
          subtitle: "Data Analysis with AI",
          description: "Use AI to analyze data, generate insights, and create visualizations.",
          objectives: [
            "Upload and analyze datasets with AI tools",
            "Generate charts and visualizations from data",
            "Extract insights and summaries from complex data",
            "Understand data privacy when using AI tools",
          ],
          sessions: [{ title: "AI for Data", time: "Day & time TBD" }],
        },
        {
          week: 6,
          title: "Building with AI APIs",
          icon: "🔌",
          subtitle: "Integrating AI into Applications",
          description: "Connect AI models to your own applications using APIs.",
          objectives: [
            "Understand what an API is and how AI APIs work",
            "Make API calls to AI models (OpenAI, Anthropic)",
            "Build a simple AI-powered app or chatbot",
            "Manage API keys, costs, and rate limits",
          ],
          sessions: [{ title: "Building with AI APIs", time: "Day & time TBD" }],
        },
        {
          week: 7,
          title: "AI Ethics & Safety",
          icon: "🛡️",
          subtitle: "Responsible AI Use",
          description: "Explore the ethical dimensions of AI — bias, safety, regulation, and responsible development.",
          objectives: [
            "Identify bias in AI systems and how to mitigate it",
            "Understand AI safety and alignment challenges",
            "Discuss regulation and governance of AI",
            "Develop a personal framework for responsible AI use",
          ],
          sessions: [{ title: "AI Ethics & Safety", time: "Day & time TBD" }],
        },
        {
          week: 8,
          title: "Capstone Project",
          icon: "🎯",
          subtitle: "Show What You've Built",
          description: "Present a project that demonstrates your AI skills — from concept to execution.",
          objectives: [
            "Design and build an AI-powered project",
            "Present your project to the cohort",
            "Give and receive constructive feedback",
            "Plan your continued AI learning journey",
          ],
          sessions: [{ title: "Capstone Presentations", time: "Day & time TBD" }],
        },
      ],
    },
    {
      slug: "ai-automation-bootcamp",
      name: "AI Automation Bootcamp",
      shortName: "AI Automation",
      type: "single-event",
      totalWeeks: 1,
      sessionsPerWeek: 1,
      startDate: "2026-04-24",
      instructor: "TBA",
      sessionTimes: ["Friday April 24 · 2 hours"],
      lastSessionDayOffset: 0,
      weekSummaries: [
        { week: 1, topic: "AI Automation", icon: "⚡" },
      ],
      weeks: [
        {
          week: 1,
          title: "AI Automation Bootcamp",
          icon: "⚡",
          subtitle: "Automate Your Workflow with AI",
          description:
            "A hands-on 2-hour intensive on using AI to automate repetitive tasks — from no-code tools to AI-powered workflows.",
          objectives: [
            "Identify tasks in your workflow that AI can automate",
            "Use no-code AI automation tools (Zapier AI, Make, etc.)",
            "Build an automated workflow from scratch",
            "Understand when automation helps vs. when it hurts",
          ],
          sessions: [{ title: "AI Automation Bootcamp", time: "Friday · 2-hour session" }],
        },
      ],
    },
  ],
  tutorConfig: {
    enabled: true,
    systemPrompt: `You are the AI Tutor for "The Forge", a program by Beyond Code Collective that teaches AI skills to the next generation of digital creators and professionals.

You are helping students learn AI fundamentals, tools, and applications. The program includes:
- Basic AI Fundamentals (4 weeks): What is AI, how it learns, tools & prompting, real-world applications
- AI for Digital Natives (8 weeks): AI landscape, prompt engineering, AI for content/code/data, APIs, ethics
- AI Automation Bootcamp: Hands-on workflow automation with AI

Guidelines:
- Be encouraging and meet students where they are — some are beginners, some are more advanced.
- Use clear, modern language. These are digital natives who learn by doing.
- Provide hands-on examples and exercises when possible.
- When answering questions, give practical, actionable answers with examples.
- Encourage experimentation and creative use of AI tools.
- Keep responses focused — 2-3 short paragraphs max unless they ask for more detail.`,
  },
  coppa: { required: false },
  seo: {
    title: "The Forge — AI Skills Training by Beyond Code Collective",
    description:
      "The Forge teaches AI fundamentals, prompt engineering, and automation skills. From beginners to builders — powered by Beyond Code Collective.",
    ogTitle: "The Forge — AI Skills Training",
    ogDescription:
      "Learn AI fundamentals, prompt engineering, and automation with hands-on training.",
  },
  organization: "Beyond Code Collective",
};
