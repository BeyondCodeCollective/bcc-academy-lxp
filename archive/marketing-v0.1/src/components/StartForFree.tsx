"use client";

import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/motion";
import { FileText, Chalkboard, Toolbox, ArrowRight } from "@phosphor-icons/react";

const offerings = [
  {
    icon: FileText,
    title: "Free AI Career Review",
    description:
      "Upload your resume. Our AI analyzes it. Then a human career coach reviews it with you.",
    cta: "Get Your Free Review",
    image: "/images/bcc/community/community-03.jpg",
  },
  {
    icon: Chalkboard,
    title: "Free Workshops",
    description:
      "Weekly live workshops on AI, data, design, and more. No signup wall. Just show up.",
    cta: "See This Week's Workshops",
    image: "/images/bcc/community/community-01.jpg",
  },
  {
    icon: Toolbox,
    title: "Tools & Resources",
    description:
      "Curated guides, templates, and tools to get started — whether you're 7 or 70.",
    cta: "Browse Resources",
    image: "/images/bcc/community/community-07.jpg",
  },
];

export default function StartForFree() {
  return (
    <section id="start-free" className="py-24 md:py-32 px-6 bg-off-white">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="mb-16"
        >
          <p className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
            [ No Barrier to Entry ]
          </p>
          <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-true-black uppercase">
            Start for Free
          </h2>
        </motion.div>

        {/* Stacked horizontal cards — alternating image side */}
        <div className="space-y-4">
          {offerings.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group grid md:grid-cols-3 border-2 border-true-black/5 hover:border-cobalt/30 transition-all duration-300 overflow-hidden bg-white"
              >
                {/* Image — alternates left/right */}
                <div
                  className={`h-48 md:h-auto relative overflow-hidden ${
                    i % 2 === 1 ? "md:order-2 md:col-span-1" : "md:col-span-1"
                  }`}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Content */}
                <div
                  className={`p-8 md:p-10 flex flex-col justify-center md:col-span-2 ${
                    i % 2 === 1 ? "md:order-1" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-cobalt/10 flex items-center justify-center">
                      <Icon size={22} weight="duotone" className="text-cobalt" />
                    </div>
                    <span className="text-xs font-bold text-cobalt uppercase tracking-[0.2em] font-mono">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-display font-bold text-true-black uppercase">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-base text-grey-3 leading-relaxed max-w-lg">
                    {item.description}
                  </p>
                  <span
                    title="Coming soon"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-cobalt/50 cursor-default self-start"
                  >
                    {item.cta}
                    <ArrowRight size={16} weight="bold" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
