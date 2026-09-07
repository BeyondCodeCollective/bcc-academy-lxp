"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp } from "@/lib/motion";
import { testimonials } from "@/data/testimonials";
import { Quotes, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import Image from "next/image";

export default function TestimonialSection() {
  const [active, setActive] = useState(0);
  const testimonial = testimonials[active];

  const prev = () =>
    setActive((i) => (i === 0 ? testimonials.length - 1 : i - 1));
  const next = () =>
    setActive((i) => (i === testimonials.length - 1 ? 0 : i + 1));

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-off-white">
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-12 font-mono text-center"
        >
          [ From Our Learners ]
        </motion.p>

        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className="grid lg:grid-cols-5 gap-10 lg:gap-16 items-center"
            >
              {/* Portrait */}
              <div className="lg:col-span-2 relative">
                <div className="aspect-[3/4] rounded-none overflow-hidden border-2 border-cobalt/20 relative">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-true-black/50 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5">
                    <div className="inline-flex items-center px-3 py-1 text-xs font-bold bg-electric-green text-true-black">
                      {testimonial.pathway} Pathway
                    </div>
                  </div>
                </div>
              </div>

              {/* Quote */}
              <div className="lg:col-span-3">
                <Quotes size={48} weight="fill" className="text-cobalt/20 mb-6" />

                <blockquote>
                  <p className="text-xl md:text-2xl lg:text-3xl text-true-black leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                </blockquote>

                <div className="mt-8">
                  <p className="text-lg font-semibold text-true-black">
                    {testimonial.name}
                  </p>
                  <p className="mt-1 text-sm text-grey-3">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-12 flex items-center justify-between">
            {/* Dots */}
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className="relative p-2 flex items-center justify-center"
                  aria-label={`View testimonial ${i + 1}`}
                >
                  <span className={`block h-2 rounded-full transition-all duration-300 ${
                    i === active
                      ? "w-8 bg-cobalt"
                      : "w-2 bg-cobalt/20 hover:bg-cobalt/40"
                  }`} />
                </button>
              ))}
            </div>

            {/* Arrows */}
            <div className="flex items-center gap-3">
              <button
                onClick={prev}
                className="w-11 h-11 rounded-full border-2 border-true-black/10 flex items-center justify-center text-true-black hover:border-cobalt hover:text-cobalt transition-colors"
                aria-label="Previous testimonial"
              >
                <ArrowLeft size={18} weight="bold" />
              </button>
              <button
                onClick={next}
                className="w-11 h-11 rounded-full border-2 border-true-black/10 flex items-center justify-center text-true-black hover:border-cobalt hover:text-cobalt transition-colors"
                aria-label="Next testimonial"
              >
                <ArrowRight size={18} weight="bold" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
