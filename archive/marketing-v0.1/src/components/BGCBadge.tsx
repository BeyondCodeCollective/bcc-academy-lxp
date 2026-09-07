"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { fadeInUp } from "@/lib/motion";

export default function BGCBadge() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background image */}
      <Image
        src="https://images.unsplash.com/photo-1529390079861-591de354faf5?w=1920&q=80&auto=format&fit=crop"
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-navy/90" />

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeInUp}
          className="text-center"
        >
          {/* BGC Identity */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-none bg-white/5 border border-white/10 mb-8">
            <span className="text-3xl font-display font-bold text-white tracking-wide">
              BGC
            </span>
          </div>

          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-3xl mx-auto">
            Proudly home to{" "}
            <a
              href="https://wearebgc.org"
              className="bg-gradient-to-r from-teal to-teal-light bg-clip-text text-transparent hover:from-teal-light hover:to-teal transition-all underline underline-offset-4 decoration-teal/30 hover:decoration-teal"
              target="_blank"
              rel="noopener noreferrer"
            >
              Black Girls Code
            </a>
          </h2>

          <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            13+ years of building the next generation of tech leaders. Black
            Girls Code is the heartbeat of our mission — and its legacy is
            protected, centered, and growing.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
