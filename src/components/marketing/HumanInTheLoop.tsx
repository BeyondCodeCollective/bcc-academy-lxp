"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { statPunch, slideInLeft, slideInRight, fadeInUp } from "@/lib/marketing-motion";
import Image from "next/image";
import VideoBackground from "@/components/marketing/VideoBackground";
import { VIDEO_URLS } from "@/data/marketing/videos";

const principles = [
  {
    number: "01",
    title: "Every learner has a named human guide",
    description:
      "Not a chatbot. Not a ticket queue. A real person who knows your name, checks in weekly, adapts your plan when life happens, and reaches out if you go quiet. That's why our learners actually finish.",
    image: "/images/bcc/community/community-01.jpg",
    video: VIDEO_URLS.humanInTheLoop.principle01,
  },
  {
    number: "02",
    title: "Learning happens in conversation",
    description:
      "Weekly live check-ins, cohort discussions, and real-time feedback — not pre-recorded lectures gathering dust. Your facilitator reviews what you shipped, unblocks where you're stuck, and adjusts the pace.",
    image: "/images/bcc/community/community-06.jpg",
    video: VIDEO_URLS.humanInTheLoop.principle02,
  },
  {
    number: "03",
    title: "AI amplifies — it never replaces",
    description:
      "Our AI tracks learning velocity, flags disengagement early, and personalizes content recommendations. But every intervention — every message, every pivot — comes from a real person.",
    image: "/images/bcc/community/community-03.jpg",
    video: VIDEO_URLS.humanInTheLoop.principle03,
  },
];

export default function HumanInTheLoop() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // 95% zooms up and fades as you scroll past — more dramatic range
  const statScale = useTransform(scrollYProgress, [0.1, 0.4], [1, 1.3]);
  const statOpacity = useTransform(scrollYProgress, [0.2, 0.4], [1, 0]);

  return (
    <section ref={sectionRef} id="human-in-the-loop" className="bg-dark-cobalt grain overflow-hidden">
      {/* Beat 1: The Stat — dramatic, full-width */}
      <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-6 overflow-hidden">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={statPunch}
          className="text-center"
        >
          <p className="text-electric-green/60 text-sm font-semibold tracking-[0.3em] uppercase mb-10 font-mono">
            [ Our Difference ]
          </p>

          <motion.p
            style={{ scale: statScale, opacity: statOpacity }}
            className="text-[25vw] md:text-[22vw] lg:text-[18vw] font-display font-bold text-electric-green leading-none"
          >
            95%
          </motion.p>

          <p className="mt-6 text-lg md:text-xl text-white/60 font-mono max-w-xl mx-auto">
            completion rate. The industry average for self-paced online learning is 3–15%.
          </p>

          <h2 className="mt-10 font-display text-4xl md:text-6xl lg:text-7xl font-bold text-white uppercase">
            Human in the Loop
          </h2>
        </motion.div>
      </div>

      {/* Divider */}
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="border-t border-white/10 relative">
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-dark-cobalt px-6 text-xs text-white/30 font-mono uppercase tracking-[0.3em]">
            [ How It Works ]
          </span>
        </div>
      </div>

      {/* Beat 2: The How — 3 principle cards, alternating */}
      <div className="py-24 md:py-32 px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {principles.map((principle, i) => {
            const isReversed = i % 2 === 1;
            const slideVariant = isReversed ? slideInRight : slideInLeft;

            return (
              <motion.div
                key={principle.number}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={slideVariant}
                className="group grid md:grid-cols-2 gap-0 overflow-hidden border-2 border-white/5 hover:border-electric-green/30 transition-all duration-500"
              >
                {/* Number + video side */}
                <div
                  className={`relative min-h-[280px] md:min-h-[360px] flex items-center justify-center overflow-hidden ${
                    isReversed ? "md:order-2" : ""
                  }`}
                >
                  {/* Background video */}
                  <VideoBackground
                    src={principle.video}
                    poster={principle.image}
                    overlay="bg-dark-cobalt/70 group-hover:bg-dark-cobalt/55 transition-colors duration-700"
                  />

                  {/* Giant number */}
                  <span className="relative z-10 text-[14rem] md:text-[18rem] font-display font-bold text-electric-green/10 leading-none select-none group-hover:text-electric-green/25 transition-colors duration-700">
                    {principle.number}
                  </span>
                </div>

                {/* Content side */}
                <div
                  className={`flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-white/[0.03] ${
                    isReversed ? "md:order-1" : ""
                  }`}
                >
                  <span className="text-sm font-display font-bold text-electric-green uppercase tracking-wider">
                    Principle {principle.number}
                  </span>
                  <h3 className="mt-3 text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white leading-tight uppercase">
                    {principle.title}
                  </h3>
                  <p className="mt-4 text-base text-white/50 leading-relaxed max-w-lg">
                    {principle.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
