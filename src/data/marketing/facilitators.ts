export interface Facilitator {
  id: string;
  name: string;
  title: string;
  org: string;
  teaches: string;
  course: string;
  yearsInIndustry: number;
  bio: string;
  pathway: string;
  image: string;
}

export const facilitators: Facilitator[] = [
  {
    id: "uc-berkeley",
    name: "Dr. Maya Johnson",
    title: "Data Science Faculty",
    org: "UC Berkeley",
    teaches: "Data Science & Analytics",
    course: "Applied Data Science for Real-World Impact",
    yearsInIndustry: 18,
    bio: "Former lead data scientist at Google. Published researcher in equitable AI. Now building the pipeline she never had.",
    pathway: "Launchers",
    image: "/images/bcc/faces/face-01.jpg",
  },
  {
    id: "mit-raica",
    name: "Prof. Alex Chen",
    title: "Creative AI Researcher",
    org: "MIT / RAICA",
    teaches: "Creative AI & Machine Learning",
    course: "Creative AI: From Concept to Product",
    yearsInIndustry: 14,
    bio: "MIT Media Lab alum. Built AI tools used by millions. Believes the next generation of creators will blend art and algorithms.",
    pathway: "Builders",
    image: "/images/bcc/faces/face-05.jpg",
  },
  {
    id: "rap-research-lab",
    name: "A.D. Carson",
    title: "Hip-Hop Data Scientist",
    org: "Rap Research Lab",
    teaches: "Data Science + Culture",
    course: "Data Storytelling Through Hip-Hop",
    yearsInIndustry: 12,
    bio: "Pioneered the intersection of data science and hip-hop culture. Proving that data is a language everyone already speaks.",
    pathway: "Explorers",
    image: "/images/bcc/faces/face-08.jpg",
  },
  {
    id: "figma",
    name: "Jordan Rivera",
    title: "Design Advocate",
    org: "Figma",
    teaches: "UX/UI Design",
    course: "Design Systems That Scale",
    yearsInIndustry: 10,
    bio: "Designed products used by 50M+ people. Champions design as a superpower for underrepresented communities.",
    pathway: "Builders",
    image: "/images/bcc/faces/face-10.jpg",
  },
];
