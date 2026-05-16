export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  pathway: string;
  image: string;
}

export const testimonials: Testimonial[] = [
  {
    id: "1",
    quote:
      "I tried learning to code three times before. Udemy, YouTube, a bootcamp. Every time I quit. Beyond Code Centers was different — not because the content was easier, but because someone actually noticed when I stopped showing up. My facilitator called me. That call changed everything.",
    name: "Terri Washington",
    role: "Career Pivoter → Junior Data Analyst",
    pathway: "Pivoters",
    image: "/images/bcc/testimonial-01.jpg",
  },
  {
    id: "2",
    quote:
      "I'm 62 years old. Everyone told me tech wasn't for me. My facilitator never once made me feel behind. She met me exactly where I was — and now I'm building dashboards for my church's nonprofit. Age is not a barrier when someone believes in you.",
    name: "James Mitchell",
    role: "Retiree → Community Data Lead",
    pathway: "Wisdom Leaders",
    image: "/images/bcc/faces/face-08.jpg",
  },
  {
    id: "3",
    quote:
      "My daughter and I enrolled together — she's 14, I'm 38. We're both in different pathways but we study at the same kitchen table. BCC is the first place that made space for both of us. That's not something you can get from a YouTube playlist.",
    name: "Keisha & Maya Brooks",
    role: "Explorer (age 14) & Pivoter (age 38)",
    pathway: "Explorers",
    image: "/images/bcc/community/community-02.jpg",
  },
];
