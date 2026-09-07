export interface Pathway {
  id: string;
  name: string;
  stage: string;
  tagline: string;
  description: string;
  color: string;
  icon: string;
  image: string;
}

export const pathways: Pathway[] = [
  {
    id: "explorers",
    name: "Explorers",
    stage: "Just getting started",
    tagline: "Discover you can build something",
    description:
      "For the curious. Whether you're 10 or 60, if you've never touched code and want to find out what's possible — this is where you begin.",
    color: "#00BCD4",
    icon: "🔭",
    image: "/images/bcc/community/community-02.jpg",
  },
  {
    id: "builders",
    name: "Builders",
    stage: "Ready to create",
    tagline: "Build real things with real teams",
    description:
      "You know the basics. Now ship something real — apps, AI tools, products — in cohorts with industry mentors guiding every sprint.",
    color: "#0097A7",
    icon: "🛠",
    image: "/images/bcc/community/community-05.jpg",
  },
  {
    id: "launchers",
    name: "Launchers",
    stage: "Breaking into tech",
    tagline: "The door is opening",
    description:
      "You're ready to make the leap. Gain the skills, portfolio, and network to land your first (or next) role in tech — with facilitators who've been there.",
    color: "#E85D26",
    icon: "🚀",
    image: "/images/bcc/initiatives/catalysts.jpg",
  },
  {
    id: "pivoters",
    name: "Pivoters",
    stage: "Changing direction",
    tagline: "Everything you know still counts",
    description:
      "You have experience — just not in tech yet. Translate your existing expertise into new digital fluency without starting over.",
    color: "#FF7043",
    icon: "🔄",
    image: "/images/bcc/community/community-03.jpg",
  },
  {
    id: "wisdom-leaders",
    name: "Wisdom Leaders",
    stage: "Sharing what you know",
    tagline: "Your experience is the curriculum",
    description:
      "You've built a career. Now mentor, teach, and lead the next generation — while picking up the digital tools to amplify your impact.",
    color: "#B0A99F",
    icon: "🌟",
    image: "/images/bcc/initiatives/forge.jpg",
  },
];
