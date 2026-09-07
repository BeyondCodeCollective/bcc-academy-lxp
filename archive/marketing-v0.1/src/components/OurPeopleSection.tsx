"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp } from "@/lib/motion";
import { facilitators } from "@/data/facilitators";
import Image from "next/image";

export default function OurPeopleSection() {
  const [active, setActive] = useState(0);
  const person = facilitators[active];

  return (
    <section id="our-people" className="py-24 md:py-32 px-6 bg-off-white">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="mb-16"
        >
          <p className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
            [ Meet Your Guides ]
          </p>
          <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-true-black uppercase">
            Our People
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Portrait */}
          <div className="relative aspect-[4/5] rounded-none overflow-hidden border-2 border-cobalt/20">
            <AnimatePresence mode="wait">
              <motion.div
                key={person.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                className="absolute inset-0"
              >
                <Image
                  src={person.image}
                  alt={person.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Details */}
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
              >
                <div className="text-sm font-bold text-cobalt uppercase tracking-[0.2em] mb-3 font-mono">
                  [ {person.org} ]
                </div>
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-true-black leading-tight uppercase">
                  {person.name}
                </h3>
                <p className="mt-2 text-lg text-grey-3">
                  {person.title}
                </p>

                <p className="mt-6 text-lg text-grey-3 leading-relaxed">
                  {person.bio}
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-5 rounded-none bg-true-black border border-true-black">
                    <p className="text-xs font-semibold text-electric-green uppercase tracking-[0.2em] mb-2 font-mono">
                      Teaching
                    </p>
                    <p className="text-base font-semibold text-white">
                      {person.course}
                    </p>
                  </div>
                  <div className="p-5 rounded-none bg-true-black border border-true-black">
                    <p className="text-xs font-semibold text-electric-green uppercase tracking-[0.2em] mb-2 font-mono">
                      Experience
                    </p>
                    <p className="text-base font-semibold text-white">
                      {person.yearsInIndustry}+ years in {person.teaches.split(" &")[0].split(" +")[0]}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation dots */}
            <div className="mt-10 flex items-center gap-6">
              {facilitators.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setActive(i)}
                  className={`group flex items-center gap-3 transition-all duration-300 ${
                    i === active ? "opacity-100" : "opacity-40 hover:opacity-70"
                  }`}
                  aria-label={`View ${f.name}`}
                >
                  <div
                    className={`w-11 h-11 rounded-full border-2 overflow-hidden flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      i === active
                        ? "border-cobalt scale-110 shadow-[0_0_15px_rgba(29,89,255,0.3)]"
                        : "border-grey-2"
                    }`}
                  >
                    <Image
                      src={f.image}
                      alt={f.name}
                      width={44}
                      height={44}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <span
                    className={`hidden md:block text-sm font-medium transition-colors duration-300 ${
                      i === active ? "text-cobalt" : "text-grey-3"
                    }`}
                  >
                    {f.name.split(" ").slice(-1)[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
