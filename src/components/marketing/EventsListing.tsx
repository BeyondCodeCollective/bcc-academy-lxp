"use client";

import { motion } from "framer-motion";
import { staggerContainer } from "@/lib/marketing-motion";
import type { Event } from "@/data/marketing/events";
import EventCard from "./EventCard";

interface EventsListingProps {
  events: Event[];
}

export default function EventsListing({ events }: EventsListingProps) {
  if (events.length === 0) {
    return (
      <p className="text-center text-grey-3 py-12">
        No events scheduled right now. Check back soon.
      </p>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {events.map((event, idx) => (
        <EventCard key={event.id} event={event} fallbackIndex={idx} />
      ))}
    </motion.div>
  );
}
