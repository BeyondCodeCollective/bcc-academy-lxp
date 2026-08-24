export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  format: "In-Person" | "Virtual" | "Hybrid";
  partner: string;
  pathway: string;
  pathwayColor: string;
  location?: string;
  description: string;
}

export const events: Event[] = [
  {
    id: "forge-open-house",
    title: "The Forge ATL — Open House",
    date: "2026-04-19",
    time: "10:00 AM – 2:00 PM EST",
    format: "In-Person",
    partner: "BCC Academy",
    pathway: "All Pathways",
    pathwayColor: "#0097A7",
    location: "The Forge, Atlanta GA",
    description:
      "Tour our new Atlanta hub, meet facilitators, and discover your pathway.",
  },
  {
    id: "ai-career-workshop",
    title: "AI Career Review Workshop",
    date: "2026-04-22",
    time: "6:00 PM – 7:30 PM EST",
    format: "Virtual",
    partner: "IBM SkillsBuild",
    pathway: "Pivoters",
    pathwayColor: "#FF7043",
    description:
      "Free workshop: get your resume analyzed by AI, then reviewed by a human career coach.",
  },
  {
    id: "youth-code-jam",
    title: "Youth Code Jam: Build Your First Game",
    date: "2026-04-26",
    time: "11:00 AM – 1:00 PM EST",
    format: "In-Person",
    partner: "Black Girls Code",
    pathway: "Explorers",
    pathwayColor: "#00BCD4",
    location: "The Forge, Atlanta GA",
    description:
      "Ages 7–13 build their first game with Scratch and mentors from BGC.",
  },
  {
    id: "data-culture",
    title: "Data Science Meets Culture",
    date: "2026-04-29",
    time: "7:00 PM – 8:30 PM EST",
    format: "Virtual",
    partner: "Rap Research Lab",
    pathway: "Builders",
    pathwayColor: "#0097A7",
    description:
      "Explore how hip-hop and data science intersect in a live session with Rap Research Lab.",
  },
  {
    id: "ux-design-sprint",
    title: "UX Design Sprint: From Idea to Prototype",
    date: "2026-05-02",
    time: "5:00 PM – 7:00 PM EST",
    format: "Hybrid",
    partner: "Figma",
    pathway: "Launchers",
    pathwayColor: "#E85D26",
    location: "The Forge, Atlanta GA + Virtual",
    description:
      "A hands-on design sprint where you go from concept to clickable prototype in two hours.",
  },
  {
    id: "automation-101",
    title: "Automation 101: Work Smarter, Not Harder",
    date: "2026-05-09",
    time: "12:00 PM – 1:30 PM EST",
    format: "Virtual",
    partner: "Zapier",
    pathway: "Pivoters",
    pathwayColor: "#FF7043",
    description:
      "Learn to automate repetitive tasks with no-code tools — perfect for career pivoters.",
  },
];
