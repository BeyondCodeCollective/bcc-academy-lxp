"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { fadeInUp, staggerContainer } from "@/lib/motion";

const cards = [
  {
    title: "Upskill Your Team",
    description:
      "Cohort-based corporate training designed for real retention. Your team learns together with a dedicated facilitator — not a video library they'll never finish.",
    features: [
      "Custom cohort programs",
      "Dedicated facilitator per team",
      "95% completion guarantee",
      "Skills in AI, data, UX, automation",
    ],
    cta: "Learn About Corporate Training",
    accent: "teal",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80&auto=format&fit=crop",
  },
  {
    title: "Hire From Our Pipeline",
    description:
      "Access a diverse pipeline of job-ready talent from our Launcher and Pivoter programs. No upfront cost — you only pay when you hire.",
    features: [
      "Pre-vetted, cohort-trained talent",
      "Diverse backgrounds and perspectives",
      "No upfront recruitment fees",
      "Ongoing post-hire support",
    ],
    cta: "Explore Our Talent Pipeline",
    accent: "orange",
    image:
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80&auto=format&fit=crop",
  },
];

export default function ForEmployers() {
  return (
    <section id="employers" className="py-24 md:py-32 px-6 bg-navy-dark">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <p className="text-teal text-sm font-semibold tracking-[0.2em] uppercase mb-4">
            For Organizations
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white">
            For Employers
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {cards.map((card) => (
            <motion.div
              key={card.title}
              variants={fadeInUp}
              className="group relative overflow-hidden rounded-none border border-white/5 hover:border-white/10 transition-all duration-300"
            >
              {/* Image header */}
              <div className="relative h-56 overflow-hidden">
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-dark to-transparent" />
              </div>

              <div className="p-8">
                <h3 className="text-2xl font-display font-bold text-white">
                  {card.title}
                </h3>
                <p className="mt-3 text-white/50 leading-relaxed text-sm">
                  {card.description}
                </p>
                <ul className="mt-5 space-y-2.5">
                  {card.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-white/60"
                    >
                      <svg
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${card.accent === "teal" ? "text-teal" : "text-orange"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <span
                  title="Coming soon"
                  className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold cursor-default opacity-50 ${
                    card.accent === "teal"
                      ? "text-teal"
                      : "text-orange"
                  }`}
                >
                  {card.cta}
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
