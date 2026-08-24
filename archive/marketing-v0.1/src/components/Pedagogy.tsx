"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import Image from "next/image";

const principles = [
  {
    number: "01",
    title: "Every learner has a named human guide",
    description:
      "No anonymous forums. No ticket queues. You get a real person who knows where you are and where you're headed.",
    image: "/images/bcc/initiatives/forge.jpg",
  },
  {
    number: "02",
    title: "Learning happens in conversation",
    description:
      "Our programs are built around live dialogue — weekly check-ins, cohort discussions, and real-time feedback. Not pre-recorded lectures.",
    image: "/images/bcc/community/community-06.jpg",
  },
  {
    number: "03",
    title: "AI amplifies — it never replaces",
    description:
      "We use AI to surface insights, personalize paths, and spot when someone needs support. The human always makes the call.",
    image: "/images/bcc/community/community-03.jpg",
  },
];

export default function Pedagogy() {
  return (
    <section id="pedagogy" className="py-24 md:py-32 px-6 bg-charcoal">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="max-w-2xl mb-20"
        >
          <p className="text-electric-green text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
            [ Our Pedagogy ]
          </p>
          <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-[0.95] uppercase">
            Technology
            <br />serves people.
            <br />
            <span className="text-electric-green">Never the
            <br />other way around.</span>
          </h2>
          <p className="mt-6 text-lg text-white/60 leading-relaxed">
            Every program we build is grounded in one belief: real learning
            requires real human connection. The screen is the medium — the
            relationship is the method.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="space-y-8"
        >
          {principles.map((principle, i) => (
            <motion.div
              key={principle.number}
              variants={fadeInUp}
              className="group grid md:grid-cols-2 gap-0 rounded-none overflow-hidden border-2 border-white/10 hover:border-electric-green/30 transition-all duration-300"
            >
              {/* Image */}
              <div
                className={`h-64 md:h-auto min-h-[320px] relative overflow-hidden ${
                  i % 2 === 1 ? "md:order-2" : ""
                }`}
              >
                <Image
                  src={principle.image}
                  alt={principle.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-cobalt/20" />
              </div>

              {/* Content side */}
              <div
                className={`flex flex-col justify-center p-8 md:p-12 bg-white/5 ${
                  i % 2 === 1 ? "md:order-1" : ""
                }`}
              >
                <span className="text-sm font-display font-bold text-electric-green/50 tracking-wider">
                  {principle.number}
                </span>
                <h3 className="mt-3 text-2xl md:text-3xl font-display font-bold text-white leading-tight uppercase">
                  {principle.title}
                </h3>
                <p className="mt-4 text-white/60 leading-relaxed">
                  {principle.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
