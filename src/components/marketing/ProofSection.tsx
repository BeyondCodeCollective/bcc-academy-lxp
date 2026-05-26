"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { heroReveal, fadeInUp, staggerContainer, staggerContainerSlow } from "@/lib/marketing-motion";
import { ShieldCheck, ChartLineUp, Rocket } from "@phosphor-icons/react";
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
      <div ref={sectionRef} className="relative min-h-[70dvh] md:min-h-[80dvh] flex items-center justify-center overflow-hidden">
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
            <motion.h2
              variants={heroReveal}
              className="font-display text-4xl sm:text-6xl md:text-8xl lg:text-[10rem] font-bold text-white uppercase leading-[0.85]"
            >
              Inspire. Educate.{" "}
              <span className="text-electric-green">Launch.</span>
            </motion.h2>

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
            className="text-center mb-16 max-w-3xl mx-auto"
          >
            <p className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
              [ How It Works ]
            </p>
            <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-true-black uppercase leading-[0.9]">
              One cohort.
              <br />
              <span className="text-cobalt">Three paths.</span>
            </h2>
            <p className="mt-6 text-lg text-grey-3 leading-relaxed">
              Every learner starts together, building a shared digital and
              workforce foundation. Then they specialize into one of three
              tracks aligned to how the labor market actually hires:
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16"
          >
            {[
              {
                title: "Direct Placement",
                description:
                  "Employer-integrated pathways with industry certifications — CompTIA, Salesforce, Google, Microsoft — designed for learners who want a clear on-ramp to a specific role.",
                icon: ShieldCheck,
              },
              {
                title: "Portfolio Building",
                description:
                  "Project-based learning with real deliverables. Build a body of work that speaks louder than a résumé — for freelancers, founders, and anyone who wants to lead with what they've made.",
                icon: ChartLineUp,
              },
              {
                title: "Entrepreneurial Path",
                description:
                  "Validate an idea, build an MVP, and launch. No-code and AI tools keep the focus on creating, not coding — with mentorship from founders who've done it before.",
                icon: Rocket,
              },
            ].map((track) => {
              const Icon = track.icon;
              return (
                <motion.div
                  key={track.title}
                  variants={fadeInUp}
                  className="p-6 md:p-8 border-2 border-true-black/5 bg-white hover:border-cobalt/30 transition-all duration-300"
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-cobalt/5 mb-5">
                    <Icon size={24} weight="duotone" className="text-cobalt" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-true-black uppercase mb-3">
                    {track.title}
                  </h3>
                  <p className="text-sm text-grey-3 leading-relaxed">
                    {track.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>

        </div>
      </div>
    </section>
  );
}
