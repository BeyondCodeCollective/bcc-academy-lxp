"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp } from "@/lib/marketing-motion";
import { pathways } from "@/data/marketing/pathways";
import { Compass, Wrench, Rocket, ArrowsClockwise, Star, ArrowRight } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import VideoBackground from "@/components/marketing/VideoBackground";
import { VIDEO_URLS } from "@/data/marketing/videos";

const pathwayIcons = [Compass, Wrench, Rocket, ArrowsClockwise, Star];

const pathwayVideos = [
  VIDEO_URLS.pathways.explorers,
  VIDEO_URLS.pathways.builders,
  VIDEO_URLS.pathways.launchers,
  VIDEO_URLS.pathways.pivoters,
  VIDEO_URLS.pathways.wisdomLeaders,
];

export default function PathwaysSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const pathway = pathways[activeIndex];
  const Icon = pathwayIcons[activeIndex];

  return (
    <section id="pathways" className="py-16 md:py-28 lg:py-36 px-6 bg-off-white">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="text-center mb-6"
        >
          <p className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
            [ Core Learner Paths ]
          </p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-true-black uppercase leading-[0.9]">
            A living system.
            <br />Not a funnel.
          </h2>
          <p className="mt-6 text-lg text-grey-3 max-w-xl mx-auto leading-relaxed">
            Enter, exit, and re-enter as your life and career evolve.
            Take a 2-minute quiz and we&rsquo;ll point you to the
            entry point that fits where you are now.
          </p>
          <a
            href="/quiz"
            className="mt-8 inline-flex items-center px-10 py-5 bg-true-black text-white text-base font-bold transition-all duration-300 hover:bg-cobalt btn-press"
          >
            Take the Career Quiz
          </a>
        </motion.div>

        {/* Numbered circle navigator */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="mt-14 mb-10"
        >
          <p className="text-xs text-grey-3 font-mono uppercase tracking-[0.2em] text-center mb-6">
            Or explore the pathways yourself
          </p>

          <div className="relative flex items-center justify-center">
            {/* Connecting line */}
            <div className="absolute top-5 left-[10%] right-[10%] h-px bg-true-black/10 hidden sm:block" />

            <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-8 md:gap-14 relative z-10 w-full sm:w-auto overflow-x-auto">
              {pathways.map((p, i) => {
                const isActive = i === activeIndex;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveIndex(i)}
                    className="flex flex-col items-center gap-2 group min-w-[56px]"
                    aria-label={`View ${p.name} pathway`}
                  >
                    <div
                      className={`w-11 h-11 flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                        isActive
                          ? "bg-true-black text-white scale-110"
                          : "bg-white text-grey-3 border-2 border-true-black/10 group-hover:border-cobalt/40 group-hover:text-cobalt"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs font-semibold transition-colors duration-300 whitespace-nowrap ${
                        isActive ? "text-true-black" : "text-grey-3 group-hover:text-cobalt"
                      }`}
                    >
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Pathway detail card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={pathway.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
            className="border-2 border-true-black/5 bg-white overflow-hidden"
          >
            <div className="grid md:grid-cols-2">
              {/* Image/video side */}
              <div className="h-64 md:h-auto md:min-h-[360px] relative overflow-hidden bg-grey-1">
                {/* Video background */}
                <VideoBackground
                  src={pathwayVideos[activeIndex]}
                  poster={pathway.image}
                  overlay="bg-true-black/20"
                />
                {/* Fallback static image underneath */}
                <Image
                  src={pathway.image}
                  alt={pathway.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Content side */}
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <p className="text-xs text-cobalt font-bold uppercase tracking-[0.2em] font-mono mb-2">
                  [ {pathway.stage} ]
                </p>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 flex items-center justify-center bg-electric-green/10">
                    <Icon size={20} weight="duotone" className="text-cobalt" />
                  </div>
                  <h3 className="text-3xl md:text-4xl font-display font-bold text-true-black uppercase">
                    {pathway.name}
                  </h3>
                </div>

                <p className="text-sm italic text-grey-3 font-mono mb-4">
                  &ldquo;{pathway.tagline}&rdquo;
                </p>

                <p className="text-base text-grey-3 leading-relaxed">
                  {pathway.description}
                </p>

                <Link
                  href={`/pathways/${pathway.id}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-cobalt hover:text-dark-cobalt transition-colors duration-300 self-start group"
                >
                  Explore {pathway.name} pathway
                  <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
