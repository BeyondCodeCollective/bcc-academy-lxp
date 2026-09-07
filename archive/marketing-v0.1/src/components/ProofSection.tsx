"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { heroReveal, fadeInUp, staggerContainer, staggerContainerSlow } from "@/lib/motion";
import { ArrowRight, Certificate, ShieldCheck, Cloud, Handshake, Robot, ChartLineUp } from "@phosphor-icons/react";
import VideoBackground from "@/components/VideoBackground";
import { VIDEO_URLS } from "@/data/videos";

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
              [ Day One ]
            </motion.p>

            <motion.h2
              variants={heroReveal}
              className="font-display text-4xl sm:text-6xl md:text-8xl lg:text-[10rem] font-bold text-white uppercase leading-[0.85]"
            >
              We just launched.
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="mt-4 font-display text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-electric-green uppercase leading-[0.9]"
            >
              Zero graduates.
            </motion.p>

            <motion.p
              variants={fadeInUp}
              className="mt-8 text-lg md:text-xl text-white/60 max-w-xl mx-auto font-mono"
            >
              And that&rsquo;s the point. You&rsquo;re not catching up —
              you&rsquo;re setting the standard.
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
              <span className="text-cobalt">Real careers.</span>
            </h2>
            <p className="mt-6 text-lg text-grey-3 max-w-2xl mx-auto leading-relaxed">
              Every pathway leads to industry-recognized certifications from the
              companies that are actually hiring. Not vanity badges — proof
              that opens doors.
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
                tracks: "A+, Security+, Network+",
                description: "The gold standard for IT careers. Our learners earn CompTIA certifications that 96% of hiring managers look for.",
                color: "text-cobalt",
                bg: "bg-cobalt/5",
              },
              {
                icon: Cloud,
                name: "Salesforce",
                tracks: "Admin, Platform Developer",
                description: "The #1 CRM in the world. Salesforce-certified professionals earn 25% more than their non-certified peers.",
                color: "text-cobalt",
                bg: "bg-cobalt/5",
              },
              {
                icon: Handshake,
                name: "Human Skills",
                tracks: "Communication, Leadership, Collaboration",
                description: "The skills AI can't replace. We teach facilitation, conflict resolution, and the soft skills that make teams work.",
                color: "text-cobalt",
                bg: "bg-cobalt/5",
              },
              {
                icon: Robot,
                name: "Zapier",
                tracks: "Automation, No-Code Workflows",
                description: "Automate the boring stuff. Learn to build workflows that save hours of repetitive work — no coding required.",
                color: "text-cobalt",
                bg: "bg-cobalt/5",
              },
              {
                icon: ChartLineUp,
                name: "Grow with Google",
                tracks: "Data Analytics, UX Design, IT Support",
                description: "Google Career Certificates designed for career changers. Get job-ready in months, not years.",
                color: "text-cobalt",
                bg: "bg-cobalt/5",
              },
              {
                icon: Certificate,
                name: "Microsoft",
                tracks: "Azure, Power Platform, 365",
                description: "Microsoft certifications open doors at 90% of Fortune 500 companies. We prep you to pass on the first try.",
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
              <span className="mr-2">Find Your Certification Path</span>
              <ArrowRight size={16} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
