"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/marketing-motion";
import { ArrowRight } from "@phosphor-icons/react";
import Image from "next/image";
import { classSessions, trackLabels } from "@/data/marketing/sessions";

export default function LiveSessionsSection() {
  return (
    <section
      id="sessions"
      className="py-16 md:py-28 lg:py-36 px-6 bg-dark-cobalt grain"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="mb-16"
        >
          <p className="text-electric-green text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
            [ Live Classroom ]
          </p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-white uppercase leading-[0.9]">
            In the room,
            <br />
            or in your feed.
          </h2>
        </motion.div>

        {/* Session Cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {classSessions.map((session) => (
            <motion.div
              key={session.id}
              variants={fadeInUp}
              className="group relative border border-white/10 bg-white/5 hover:border-white/20 transition-all duration-300 overflow-hidden"
            >
              {/* Live badge */}
              {session.status === "live" && (
                <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-true-black/80 px-2.5 py-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white font-mono">
                    LIVE NOW
                  </span>
                </div>
              )}

              {/* Image with overlay */}
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={session.image}
                  alt={session.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-dark-cobalt/60 group-hover:bg-dark-cobalt/40 transition-colors duration-300" />
              </div>

              {/* Card body */}
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="font-display text-lg md:text-xl font-bold text-white uppercase leading-tight">
                      {session.title}
                    </h3>
                    <span className="shrink-0 text-[10px] font-mono font-bold text-electric-green uppercase tracking-wider border border-electric-green/30 px-2 py-0.5">
                      {trackLabels[session.track]}
                    </span>
                  </div>
                  <p className="text-white/50 text-sm font-mono">
                    {session.schedule}
                  </p>
                </div>

                <a
                  href={session.joinUrl}
                  className="inline-flex items-center gap-2 self-start px-5 py-2.5 border border-white/20 text-white text-sm font-bold hover:bg-electric-green hover:text-true-black hover:border-electric-green transition-all duration-300 group-hover:border-white/40"
                >
                  {session.status === "live" ? "Join Live" : "View Schedule"}
                  <ArrowRight size={13} weight="bold" />
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer link */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="mt-12 text-center"
        >
          <a
            href="#events"
            className="inline-flex items-center gap-2 text-sm font-mono font-bold text-white/50 hover:text-electric-green transition-colors duration-300 tracking-wider uppercase"
          >
            View full schedule
            <ArrowRight size={13} weight="bold" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
