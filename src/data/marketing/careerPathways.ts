export type PathwayKey =
  | "cybersecurity"
  | "cloud-devops"
  | "data-ai"
  | "enterprise-systems";

export type CertLevel = "foundational" | "intermediate" | "advanced";

export interface CertRung {
  level: CertLevel;
  name: string;
  description: string;
}

export interface RoleStage {
  title: string;
  level: "entry" | "mid" | "senior";
  salary: { low: number; high: number };
}

export interface Capstone {
  title: string;
  preview: string;
}

export interface CareerPathway {
  key: PathwayKey;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  accent: string;
  wefRoles: string[];
  wefSkills: string[];
  certLadder: CertRung[];
  roleProgression: RoleStage[];
  capstone: Capstone;
  skillsBuilt: string[];
  status: "live" | "in-design";
}

export const careerPathways: Record<PathwayKey, CareerPathway> = {
  cybersecurity: {
    key: "cybersecurity",
    name: "Cybersecurity Analyst → Security Engineer",
    shortName: "Cybersecurity",
    tagline: "Defend the systems that run the world.",
    description:
      "A clear, recognizable certification ladder into one of the most in-demand fields in tech. Strong wage outcomes and a direct line into roles employers can't fill fast enough.",
    accent: "#1D59FF",
    wefRoles: [
      "Security Management Specialists (#5 fastest-growing)",
      "Information Security Analysts (#13 fastest-growing)",
    ],
    wefSkills: ["Networks & Cybersecurity (#2)", "Technological Literacy (#3)"],
    certLadder: [
      {
        level: "foundational",
        name: "CompTIA ITF+",
        description: "On-ramp for learners new to IT. Builds shared technical literacy before specialization.",
      },
      {
        level: "foundational",
        name: "CompTIA Network+",
        description: "Network fundamentals. The language every security pro speaks.",
      },
      {
        level: "intermediate",
        name: "CompTIA Security+",
        description: "Industry-standard credential employers screen for. Your first hireable cert.",
      },
      {
        level: "intermediate",
        name: "CompTIA CySA+",
        description: "Behavioral analytics for threat detection. Step up into SOC analyst roles.",
      },
      {
        level: "advanced",
        name: "CISSP / CISA",
        description: "Senior-track credentials for security leadership and audit roles.",
      },
    ],
    roleProgression: [
      {
        title: "SOC Analyst (Tier 1)",
        level: "entry",
        salary: { low: 65000, high: 80000 },
      },
      {
        title: "Information Security Analyst",
        level: "mid",
        salary: { low: 85000, high: 110000 },
      },
      {
        title: "Security Engineer",
        level: "senior",
        salary: { low: 115000, high: 150000 },
      },
    ],
    capstone: {
      title: "Simulated breach investigation",
      preview:
        "You'll respond to a live attack scenario, trace the intrusion across the network, and present a remediation plan to a panel of industry partners.",
    },
    skillsBuilt: [
      "Networks & cybersecurity",
      "Threat detection & response",
      "Analytical thinking",
      "Technical communication",
    ],
    status: "live",
  },

  "cloud-devops": {
    key: "cloud-devops",
    name: "Cloud & DevOps Engineering",
    shortName: "Cloud & DevOps",
    tagline: "Build and run the platforms everything else lives on.",
    description:
      "A pathway for builders who want depth — Linux, cloud infrastructure, automation, and the engineering practices that move modern software.",
    accent: "#E54D2E",
    wefRoles: [
      "Software Developers (#4 fastest-growing)",
      "IoT Specialists (#10 fastest-growing)",
      "DevOps Engineers (#14 fastest-growing)",
    ],
    wefSkills: ["Technological Literacy (#3)", "Analytical Thinking (#9)"],
    certLadder: [
      {
        level: "foundational",
        name: "CompTIA Network+ or CCNA",
        description: "Network foundations for cloud infrastructure work.",
      },
      {
        level: "intermediate",
        name: "Red Hat RHCSA (Linux)",
        description: "Linux is the operating system of the cloud. Master it.",
      },
      {
        level: "intermediate",
        name: "AWS SysOps or Azure AZ-500",
        description: "Cloud platform credential employers actively recruit for.",
      },
      {
        level: "advanced",
        name: "Kubernetes CKA / CKAD",
        description: "Container orchestration — the senior-track skill.",
      },
    ],
    roleProgression: [
      {
        title: "Cloud Administrator",
        level: "entry",
        salary: { low: 70000, high: 90000 },
      },
      {
        title: "DevOps Engineer",
        level: "mid",
        salary: { low: 95000, high: 130000 },
      },
      {
        title: "Platform Engineer",
        level: "senior",
        salary: { low: 130000, high: 175000 },
      },
    ],
    capstone: {
      title: "Cloud-native deployment with CI/CD",
      preview:
        "Deploy a full-stack cloud-native application with an automated CI/CD pipeline. Real infrastructure, real production patterns, real portfolio piece.",
    },
    skillsBuilt: [
      "Cloud infrastructure",
      "Linux & networking",
      "Automation & CI/CD",
      "Systems thinking",
    ],
    status: "in-design",
  },

  "data-ai": {
    key: "data-ai",
    name: "Data & Applied AI",
    shortName: "Data & Applied AI",
    tagline: "Turn raw data into the decisions that move organizations.",
    description:
      "The #1 fastest-growing skill cluster in the world. A pathway designed for analytical thinkers who want to work alongside AI, not be replaced by it.",
    accent: "#7C3AED",
    wefRoles: [
      "Big Data Specialists (#1 fastest-growing)",
      "AI/ML Specialists (#3 fastest-growing)",
      "Data Warehousing Specialists (#6 fastest-growing)",
      "Data Analysts & Scientists (#11 fastest-growing)",
    ],
    wefSkills: ["AI & Big Data (#1)", "Analytical Thinking (#9)"],
    certLadder: [
      {
        level: "foundational",
        name: "SQL Foundations",
        description: "The language of data. Non-negotiable for any analytics role.",
      },
      {
        level: "foundational",
        name: "Data Fundamentals",
        description: "Statistics, data modeling, and the literacy every modern role demands.",
      },
      {
        level: "intermediate",
        name: "AI for Work Certification",
        description: "Applied AI tools and prompt engineering for real workflows.",
      },
      {
        level: "intermediate",
        name: "Responsible AI & Governance Badge",
        description: "How to use AI ethically and accountably in production.",
      },
      {
        level: "advanced",
        name: "AICP (AI Governance & Ethics)",
        description: "Senior-track credential for leading AI initiatives responsibly.",
      },
    ],
    roleProgression: [
      {
        title: "Data Analyst",
        level: "entry",
        salary: { low: 60000, high: 80000 },
      },
      {
        title: "AI Operations Specialist",
        level: "mid",
        salary: { low: 85000, high: 115000 },
      },
      {
        title: "Business Intelligence Analyst",
        level: "senior",
        salary: { low: 110000, high: 145000 },
      },
    ],
    capstone: {
      title: "AI-enhanced business intelligence dashboard",
      preview:
        "Build a working dashboard that surfaces real insights from a real dataset, augmented with AI. Present to a panel of operators who'd actually use it.",
    },
    skillsBuilt: [
      "AI & big data",
      "SQL & data modeling",
      "Analytical thinking",
      "Responsible AI practice",
    ],
    status: "in-design",
  },

  "enterprise-systems": {
    key: "enterprise-systems",
    name: "Enterprise Systems & Digital Operations",
    shortName: "Enterprise Systems",
    tagline: "Run the platforms that run modern organizations.",
    description:
      "A pathway for systems thinkers and people-people. The fastest route into a tech-adjacent salary without writing code all day — high demand, high impact.",
    accent: "#059669",
    wefRoles: [
      "Digital Transformation Roles",
      "Workflow Automation Specialists",
      "Technical Project Coordinators",
    ],
    wefSkills: ["Technological Literacy (#3)", "Talent Management (#8)"],
    certLadder: [
      {
        level: "foundational",
        name: "Salesforce Administrator",
        description: "The most in-demand admin credential in enterprise software.",
      },
      {
        level: "intermediate",
        name: "ServiceNow CSA (optional)",
        description: "Workflow platform used across enterprise IT and operations.",
      },
      {
        level: "intermediate",
        name: "Low-code Workflow Automation",
        description: "Zapier, n8n, and the automation tools modernizing every team.",
      },
    ],
    roleProgression: [
      {
        title: "Salesforce Admin / CRM Specialist",
        level: "entry",
        salary: { low: 60000, high: 85000 },
      },
      {
        title: "Technical Project Coordinator",
        level: "mid",
        salary: { low: 75000, high: 105000 },
      },
      {
        title: "Digital Transformation Analyst",
        level: "senior",
        salary: { low: 95000, high: 130000 },
      },
    ],
    capstone: {
      title: "End-to-end workflow automation",
      preview:
        "Implement a complete workflow automation for a real organization. From requirements to deployment, with documentation a stakeholder could actually use.",
    },
    skillsBuilt: [
      "Enterprise platform admin",
      "Workflow automation",
      "Talent & systems management",
      "Cross-functional communication",
    ],
    status: "in-design",
  },
};
