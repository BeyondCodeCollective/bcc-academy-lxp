"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/marketing-motion";
import {
  ArrowRight,
  Buildings,
  Lightning,
  Trophy,
  Rocket,
  type Icon,
} from "@phosphor-icons/react";

const programs: {
  id: string;
  label: string;
  tagline: string;
  description: string;
  cta: string;
  href: string;
  icon: Icon;
}[] = [
  {
    id: "catalyst",
    label: "Catalyst",
    tagline: "Adult learners. Real pathways. One ecosystem.",
    description:
      "Catalyst meets adult learners where they are and prepares them for where work is going. A core cohort delivers a shared digital and workforce foundation, then participants specialize into one of three tracks aligned to how today's labor market actually hires: direct placement, portfolio building, or an entrepreneurial path of their own.",
    cta: "Get Started",
    href: "#waitlist",
    icon: Buildings,
  },
  {
    id: "ai-automation",
    label: "AI Automation Bootcamp",
    tagline: "Automate your workflow with AI — a hands-on 2-hour intensive.",
    description:
      "A single-session bootcamp at Beyond Code Centers. Identify tasks AI can automate, build a workflow from scratch using no-code tools, and leave with something running.",
    cta: "Join Bootcamp",
    href: "/join/ai-automation",
    icon: Lightning,
  },
  {
    id: "atg",
    label: "After The Game",
    tagline: "Tech careers for athletes in transition.",
    description:
      "A cohort-based program that meets athletes in transition and prepares them for where work is going. Participants build a shared digital and workforce foundation, then specialize into direct placement, portfolio building, or an entrepreneurial path aligned to their strengths.",
    cta: "Apply to ATG",
    href: "https://atg.bccacademy.io",
    icon: Trophy,
  },
  {
    id: "entrepreneurship",
    label: "Entrepreneurship",
    tagline: "Build something that matters.",
    description:
      "A founders' track where you validate your idea, build an MVP, pitch to peers, and leave with the playbook — and the network — to launch. No-code and AI tools keep the focus on building, not boilerplate.",
    cta: "Build With Us",
    href: "#waitlist",
    icon: Rocket,
  },
];

export default function ProgramsSection() {
  return (
    <section id="programs" className="py-16 md:py-28 lg:py-36 px-6 bg-true-black">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="mb-16"
        >
          <p className="text-electric-green text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
            [ Our Programs ]
          </p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-white uppercase leading-[0.9]">
            Built with
            <br />
            and for
            <br />
            our learners.
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10"
        >
          {programs.map((program) => {
            const ProgramIcon = program.icon;
            return (
            <motion.div
              key={program.id}
              variants={fadeInUp}
              className="group bg-true-black p-8 md:p-10 flex flex-col justify-between gap-8 hover:bg-white/5 transition-colors duration-300"
            >
              <div>
                <div className="w-10 h-10 flex items-center justify-center bg-electric-green/10 mb-5">
                  <ProgramIcon size={20} weight="duotone" className="text-electric-green" />
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-bold text-white uppercase mb-3">
                  {program.label}
                </h3>
                <p className="text-electric-green text-sm font-mono mb-4">
                  {program.tagline}
                </p>
                <p className="text-white/50 text-sm leading-relaxed">
                  {program.description}
                </p>
              </div>
              <a
                href={program.href}
                className="inline-flex items-center gap-2 self-start px-6 py-3 border border-white/20 text-white text-sm font-bold hover:bg-electric-green hover:text-true-black hover:border-electric-green transition-all duration-300 group-hover:border-white/40"
              >
                {program.cta}
                <ArrowRight size={14} weight="bold" />
              </a>
            </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
