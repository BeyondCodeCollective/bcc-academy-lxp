"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/marketing-motion";
import type { Event } from "@/data/marketing/events";
import EventCard from "./EventCard";

interface EventsSectionProps {
  events: Event[];
}

export default function EventsSection({ events }: EventsSectionProps) {
  return (
    <section id="events" className="py-16 md:py-28 lg:py-36 px-6 bg-grey-1">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <p className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
            [ Upcoming Events ]
          </p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-true-black uppercase">
            Open doors,
            <br />on a cadence.
          </h2>
          <p className="mt-6 text-lg text-grey-3 max-w-2xl mx-auto leading-relaxed">
            Workshops, cohorts, family days, and meetups — recurring at every
            Forge, open to the community.
          </p>
        </motion.div>

        {events.length === 0 ? (
          <p className="text-center text-grey-3 py-12">
            No events scheduled right now. Check back soon.
          </p>
        ) : (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {events.map((event, idx) => (
              <EventCard key={event.id} event={event} fallbackIndex={idx} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
