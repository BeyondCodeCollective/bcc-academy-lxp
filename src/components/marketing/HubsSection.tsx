"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/marketing-motion";
import { MapPin } from "@phosphor-icons/react";
import Image from "next/image";

const hubs = [
  {
    name: "The Forge ATL",
    city: "Atlanta, GA",
    status: "Standalone" as const,
    description:
      "Our flagship — a permanent, year-round hub anchoring the brand locally and serving as the central site for community partnerships and talent development.",
    image: "/images/bcc/initiatives/forge.jpg",
  },
  {
    name: "Forge in a Box",
    city: "NYC · LA · Hampton VA",
    status: "Residency" as const,
    description:
      "Time-bound programs housed inside existing community, educational, or cultural institutions — bringing The Forge to where trust already lives.",
    image: "/images/bcc/community/community-05.jpg",
  },
  {
    name: "Forge Experience",
    city: "Detroit · NJ · Oakland",
    status: "Activation" as const,
    description:
      "Mobile, short-term activations that bring The Forge experience to a community to gauge interest in something more permanent.",
    image: "/images/bcc/brand/forge-meeting.jpg",
  },
  {
    name: "Active Regions",
    city: "Puerto Rico · Palm Beach",
    status: "Exploring" as const,
    description:
      "Where local partners, learners, and demand are pulling The Forge model next — under evaluation for residency or experience.",
    image: "/images/bcc/brand/forge-collab.jpg",
  },
];

export default function HubsSection() {
  return (
    <section id="hubs" className="py-16 md:py-28 lg:py-36 px-6 bg-off-white">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <p className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
            [ The Forge &middot; Place-Based Hubs ]
          </p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-true-black uppercase leading-[0.9]">
            A third space.
            <br />
            Neither school
            <br />
            nor work.
          </h2>
          <p className="mt-6 text-lg text-grey-3 max-w-2xl mx-auto leading-relaxed">
            At The Forge, middle schoolers sit next to mid-career
            professionals, parents learn alongside their kids, and community
            leaders share tables with technologists. Everyone experiments,
            asks questions, and builds the confidence to shape the systems
            already shaping their lives.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {hubs.map((hub) => {
            const isOpen = hub.status === "Standalone" || hub.status === "Residency";
            return (
              <motion.div
                key={hub.name}
                variants={fadeInUp}
                className={`group border-2 transition-all duration-300 bg-white ${
                  isOpen
                    ? "border-cobalt/20 hover:border-cobalt/40"
                    : "border-true-black/5 hover:border-true-black/15"
                }`}
              >
                {/* Image */}
                <div className="h-48 relative overflow-hidden bg-grey-1">
                  <Image
                    src={hub.image}
                    alt={hub.name}
                    fill
                    className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
                      !isOpen ? "grayscale opacity-40" : ""
                    }`}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  {/* Status badge */}
                  <div className="absolute top-4 left-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        isOpen
                          ? "bg-electric-green text-true-black"
                          : "bg-white/90 text-grey-3"
                      }`}
                    >
                      {hub.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-display font-bold text-true-black uppercase">
                    {hub.name}
                  </h3>
                  <p className="mt-1 text-xs text-grey-3 font-mono flex items-center gap-1">
                    <MapPin size={10} weight="bold" />
                    {hub.city}
                  </p>
                  <p className={`mt-3 text-sm leading-relaxed ${isOpen ? "text-grey-3" : "text-grey-3/60"}`}>
                    {hub.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
