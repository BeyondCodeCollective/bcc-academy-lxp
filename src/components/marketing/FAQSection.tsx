"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { slideInLeft } from "@/lib/marketing-motion";
import { CaretDown } from "@phosphor-icons/react";

const faqs = [
  {
    question: "What is Beyond Code Collective?",
    answer:
      "A community-based learning and workforce ecosystem giving people lifelong access to the skills, relationships, and pathways shaping the future of work. We teach learners ages 7 to 87 across in-person Forge hubs and virtual cohorts.",
  },
  {
    question: "Who is this for?",
    answer:
      "K\u201312 youth, parents and caregivers, adult learners and career switchers, educators and facilitators, alumni and community advocates. The ecosystem functions as a living system rather than a funnel \u2014 enter, exit, and re-enter as your life evolves.",
  },
  {
    question: "Is this an AI bootcamp?",
    answer:
      "No. We integrate AI as a tool in a much larger set of skills. AI as tool, not identity. We use AI where it deepens understanding, not where it shortcuts it \u2014 and we still teach learners to code, because coding doesn\u2019t disappear in an AI world; it evolves.",
  },
  {
    question: "What credentials will I earn?",
    answer:
      "Industry-recognized certifications aligned to high-demand roles: CompTIA (ITF+, A+, Network+), Salesforce (Agentic Administrator, Platform Developer), Microsoft (Azure, Power Platform), Grow with Google, Project Management foundations, and applied AI literacy.",
  },
  {
    question: "How is this different from BGC (Black Girls Code)?",
    answer:
      "BGC continues its identity-first, youth-centered mission. BCC scales the proven model to serve all future technologists \u2014 by us, for everyone. Both are part of the same family.",
  },
  {
    question: "Can my employer or community partner pay for this?",
    answer:
      "Yes. We work with employers, workforce development programs, and community partners. Many learners are supported through employer sponsorship, scholarships, or government workforce funding.",
  },
];

const easeExpo = [0.16, 1, 0.3, 1] as const;

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 md:py-28 lg:py-36 px-6 bg-grey-1">
      <div className="mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Left column — sticky header */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={slideInLeft}
            className="lg:col-span-2"
          >
            <div className="lg:sticky lg:top-32">
              <p className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
                [ Common Questions ]
              </p>
              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-true-black uppercase leading-[0.9]">
                Got
                <br />questions?
              </h2>
              <p className="mt-6 text-grey-3 leading-relaxed">
                Can&rsquo;t find what you&rsquo;re looking for? Reach out to us
                directly and a real human will get back to you.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <span
                  title="Coming soon"
                  className="inline-flex items-center px-6 py-3.5 border-2 border-cobalt/30 text-cobalt/50 text-sm font-bold cursor-default self-start"
                >
                  Contact Us
                </span>
                <span
                  title="Coming soon"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-cobalt/40 cursor-default self-start"
                >
                  Browse Free Resources &rarr;
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right column — accordion */}
          <div className="lg:col-span-3">
            <div className="border-t-2 border-true-black/10">
              {faqs.map((faq, i) => {
                const isOpen = openIndex === i;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.06, ease: easeExpo }}
                    className="border-b-2 border-true-black/10"
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      className="w-full flex items-center justify-between py-6 md:py-8 text-left group"
                      aria-expanded={isOpen}
                    >
                      <span className="flex items-baseline gap-3 md:gap-5 min-w-0">
                        <span className={`font-display text-xl md:text-3xl font-bold tabular-nums transition-colors duration-300 flex-shrink-0 ${isOpen ? "text-cobalt" : "text-true-black/15"}`}>
                          0{i + 1}
                        </span>
                        <span className={`text-base md:text-xl font-semibold pr-4 md:pr-8 transition-colors duration-300 ${isOpen ? "text-cobalt" : "text-true-black group-hover:text-cobalt"}`}>
                          {faq.question}
                        </span>
                      </span>
                      <CaretDown
                        size={20}
                        weight="bold"
                        className={`text-cobalt flex-shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.5, ease: easeExpo }}
                          className="overflow-hidden"
                        >
                          <p className="pb-6 md:pb-8 pl-9 md:pl-16 text-sm md:text-lg text-grey-3 leading-relaxed pr-4 md:pr-12">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
