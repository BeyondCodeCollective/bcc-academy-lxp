"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { heroReveal, fadeInUp, staggerContainer, staggerContainerSlow } from "@/lib/marketing-motion";
import { ArrowRight, Certificate, ShieldCheck, Cloud, Handshake, Robot, ChartLineUp } from "@phosphor-icons/react";
import VideoBackground from "@/components/marketing/VideoBackground";
import { VIDEO_URLS } from "@/data/marketing/videos";

export default function ProofSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const videoScale = useTransform(scrollYProgress, [0, 0.5], [1.1, 1]);
  const textY = useTransform(scrollYProgress, [0.1, 0.4], ["20%", "0%"]);

  return (
    <section id="proof" className="overflow-hidden">
      {/* Cinematic video block — full width, story moment */}
      <div ref={sectionRef} className="relative min-h-[70vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden">
        <motion.div className="absolute inset-0" style={{ scale: videoScale }}>
          <VideoBackground
            src={VIDEO_URLS.proof}
            poster="/images/bcc/community/community-04.jpg"
            overlay="bg-[linear-gradient(to_top,#000_0%,rgba(0,0,0,0.88)_28%,rgba(0,0,0,0.72)_55%,rgba(0,0,0,0.58)_80%,rgba(0,0,0,0.48)_100%)]"
          />
        </motion.div>
        {/* Noise dither — kills gradient banding over video */}
        <div className="grain absolute inset-0 pointer-events-none mix-blend-overlay opacity-50" />

        {/* Title card overlay */}
        <motion.div
          className="relative z-10 text-center px-6 max-w-5xl"
          style={{ y: textY }}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainerSlow}
          >
            <motion.p
              variants={fadeInUp}
              className="text-electric-green text-sm font-semibold tracking-[0.3em] uppercase mb-8 font-mono"
            >
              [ Year One &middot; Validation in Place ]
            </motion.p>

            <motion.h2
              variants={heroReveal}
              className="font-display text-4xl sm:text-6xl md:text-8xl lg:text-[10rem] font-bold text-white uppercase leading-[0.85]"
            >
              Inspire.
              <br />Educate.
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="mt-4 font-display text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-electric-green uppercase leading-[0.9]"
            >
              Launch.
            </motion.p>

            <motion.p
              variants={fadeInUp}
              className="mt-8 text-lg md:text-xl text-white/60 max-w-xl mx-auto font-mono"
            >
              Three commitments. One ecosystem. Built with the people
              it serves — proof, not messaging.
            </motion.p>
          </motion.div>
        </motion.div>

      </div>

      {/* What You'll Learn — Certifications & Curriculum */}
      <div className="py-16 md:py-28 lg:py-36 px-6 bg-off-white">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <p className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
              [ What You&rsquo;ll Learn ]
            </p>
            <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-true-black uppercase leading-[0.9]">
              Real credentials.
              <br />
              <span className="text-cobalt">Real employers.</span>
            </h2>
            <p className="mt-6 text-lg text-grey-3 max-w-2xl mx-auto leading-relaxed">
              Every pathway is aligned to high-demand roles employers actually
              hire for. We shift from placement promises to employer-integrated
              learning — taught by partners working in the field.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              {
                icon: ShieldCheck,
                name: "CompTIA",
                tracks: "ITF+, A+, Network+",
                description: "Foundational and infrastructure certifications — the entry stack for IT and tech-adjacent careers, taught with industry mentors.",
                color: "text-cobalt",
                bg: "bg-cobalt/5",
              },
              {
                icon: Cloud,
                name: "Salesforce",
                tracks: "Agentic Administrator, Platform Developer",
                description: "Admin and developer pathways on the platform behind a quarter of enterprise CRM work — applied learning, not slideware.",
                color: "text-cobalt",
                bg: "bg-cobalt/5",
              },
              {
                icon: Handshake,
                name: "MASS Coaching",
                tracks: "Mindset, Soft Skills, Career Transformation",
                description: "Our signature coaching program for clarity, courage, and career momentum — designed and led by Angel Aviles for emerging professionals turning potential into traction.",
                color: "text-cobalt",
                bg: "bg-cobalt/5",
              },
              {
                icon: Robot,
                name: "Project Management",
                tracks: "Agile, Scrum, PMP Foundations",
                description: "Durable skills that survive any tech cycle — facilitation, scope, and shipping work as a team, on time, in real conditions.",
                color: "text-cobalt",
                bg: "bg-cobalt/5",
              },
              {
                icon: ChartLineUp,
                name: "Grow with Google",
                tracks: "Data Analytics, UX Design, IT Support",
                description: "Google Career Certificates paired with mentorship — the credential plus the human relationships that turn it into a job.",
                color: "text-cobalt",
                bg: "bg-cobalt/5",
              },
              {
                icon: Certificate,
                name: "Microsoft",
                tracks: "Azure, Power Platform, MakeCode",
                description: "Cloud, low-code, and youth on-ramps from a partner whose tools sit on every desk in the workforce we&rsquo;re preparing learners to enter.",
                color: "text-cobalt",
                bg: "bg-cobalt/5",
              },
            ].map((cert) => {
              const Icon = cert.icon;
              return (
                <motion.div
                  key={cert.name}
                  variants={fadeInUp}
                  className="group p-6 md:p-8 border-2 border-true-black/5 bg-white hover:border-cobalt/30 transition-all duration-300"
                >
                  <div className={`w-12 h-12 flex items-center justify-center ${cert.bg} mb-5`}>
                    <Icon size={24} weight="duotone" className={cert.color} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-true-black uppercase">
                    {cert.name}
                  </h3>
                  <p className="mt-1 text-xs font-mono text-cobalt font-semibold uppercase tracking-wider">
                    {cert.tracks}
                  </p>
                  <p className="mt-3 text-sm text-grey-3 leading-relaxed">
                    {cert.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <a
              href="/quiz"
              className="group inline-flex items-center px-10 py-5 bg-electric-green text-true-black text-base font-bold transition-all duration-300 hover:shadow-[0_8px_30px_rgba(229,247,1,0.3)] btn-press"
            >
              <span className="mr-2">Find Your Pathway</span>
              <ArrowRight size={16} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
