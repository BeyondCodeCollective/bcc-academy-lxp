"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/marketing-motion";
import { MapPin, ArrowRight } from "@phosphor-icons/react";
import Image from "next/image";
import { forgeHubs } from "@/data/marketing/hubs";

export default function HubsSection() {
  return (
    <section id="hubs" className="py-16 md:py-28 lg:py-36 px-6 bg-off-white">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="mb-16"
        >
          <p className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
            [ Beyond Code Centers &middot; Find a Hub Near You ]
          </p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-true-black uppercase leading-[0.9]">
            A third space.
            <br />
            Neither school
            <br />
            nor work.
          </h2>
          <p className="mt-6 text-lg text-grey-3 max-w-2xl leading-relaxed">
            Beyond Code Centers is a physical place where humans teach humans and
            technology is the tool, not the teacher. Find one in your city
            — or get on the list when we expand.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {forgeHubs.map((hub) => {
            const isActive = hub.status === "active";
            return (
              <motion.div
                key={hub.id}
                variants={fadeInUp}
                className={`group border-2 bg-white transition-all duration-300 ${
                  isActive
                    ? "border-cobalt/20 hover:border-cobalt/50"
                    : "border-true-black/5 hover:border-true-black/20"
                }`}
              >
                <div className="h-52 relative overflow-hidden bg-grey-1">
                  <Image
                    src={hub.image}
                    alt={hub.name}
                    fill
                    className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
                      !isActive ? "grayscale opacity-50" : ""
                    }`}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute top-4 left-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        isActive
                          ? "bg-electric-green text-true-black"
                          : "bg-white/90 text-grey-3"
                      }`}
                    >
                      {isActive ? "Open" : "Coming Soon"}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-display font-bold text-true-black uppercase">
                    {hub.name}
                  </h3>
                  <p className="mt-1 text-xs text-grey-3 font-mono flex items-center gap-1">
                    <MapPin size={10} weight="bold" />
                    {hub.neighborhood ? `${hub.neighborhood} · ` : ""}{hub.city}, {hub.state}
                  </p>
                  {isActive && (
                    <a
                      href="/#programs"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-cobalt hover:text-dark-cobalt transition-colors"
                    >
                      View programs at Beyond Code Centers
                      <ArrowRight size={12} weight="bold" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Waitlist card */}
          <motion.div
            variants={fadeInUp}
            className="border-2 border-dashed border-true-black/15 bg-transparent p-5 flex flex-col justify-between"
          >
            <div>
              <p className="text-xs font-mono text-grey-3 uppercase tracking-wider mb-2">
                [ Your City ]
              </p>
              <h3 className="text-lg font-display font-bold text-true-black uppercase mb-3">
                Don&rsquo;t see your city?
              </h3>
              <p className="text-sm text-grey-3 leading-relaxed">
                We&rsquo;re expanding. Get on the waitlist and we&rsquo;ll let you know when Beyond Code Centers comes to you.
              </p>
            </div>
            <a
              href="#waitlist"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-true-black hover:text-cobalt transition-colors"
            >
              Join the waitlist
              <ArrowRight size={12} weight="bold" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
