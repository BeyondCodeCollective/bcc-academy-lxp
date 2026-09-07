"use client";

import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/motion";
import { partners } from "@/data/partners";

export default function PartnersBar() {
  return (
    <section className="py-16 md:py-20 px-6 bg-true-black border-y border-white/10">
      <div className="mx-auto max-w-7xl">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="text-center text-sm text-white/40 uppercase tracking-[0.3em] mb-10 font-mono"
        >
          [ Trusted Partners & Collaborators ]
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
        >
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="text-white/40 hover:text-electric-green transition-colors duration-300 text-sm md:text-base font-semibold tracking-wide"
              title={partner.name}
            >
              {partner.name}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
