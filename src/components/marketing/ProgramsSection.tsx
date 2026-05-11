"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/marketing-motion";
import { ArrowRight } from "@phosphor-icons/react";

const programs = [
  {
    id: "catalyst",
    label: "Catalyst",
    tagline: "Workforce development for organizations.",
    description:
      "BCC's employer and partner-facing initiative. CompTIA certification cohorts and workforce readiness training brought directly into organizations and institutions.",
    cta: "Learn More",
    href: "https://catalyst.bccacademy.io",
  },
  {
    id: "forge",
    label: "The Forge",
    tagline: "Human-led learning in physical hubs.",
    description:
      "Cohort-based, in-person, and first-come-first-serve. The Forge brings structured learning into your city — a space where humans teach humans, and technology is the tool, not the teacher.",
    cta: "Apply to The Forge",
    href: "https://forge.bccacademy.io",
  },
  {
    id: "atg",
    label: "After The Game",
    tagline: "Tech careers for athletes in transition.",
    description:
      "CompTIA Tech+ certification prep, MASS wraparound coaching, and financial literacy — built for former athletes ready to pivot into tech.",
    cta: "Apply to ATG",
    href: "https://atg.bccacademy.io",
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
          {programs.map((program) => (
            <motion.div
              key={program.id}
              variants={fadeInUp}
              className="group bg-true-black p-8 md:p-10 flex flex-col justify-between gap-8 hover:bg-white/5 transition-colors duration-300"
            >
              <div>
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
          ))}
        </motion.div>

      </div>
    </section>
  );
}
