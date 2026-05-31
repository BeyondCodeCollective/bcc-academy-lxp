"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Script from "next/script";
import { fadeInUp } from "@/lib/marketing-motion";
import type { Event } from "@/data/marketing/events";
import Image from "next/image";

declare global {
  interface Window {
    EBWidgets?: {
      createWidget: (opts: {
        widgetType: "checkout";
        eventId: string;
        modal: boolean;
        modalTriggerElementId: string;
        onOrderComplete?: () => void;
      }) => void;
    };
  }
}

const fallbackImages = [
  "/images/bcc/initiatives/forge.jpg",
  "/images/bcc/community/community-07.jpg",
  "/images/bcc/community/community-02.jpg",
  "/images/bcc/community/community-05.jpg",
  "/images/bcc/initiatives/catalysts.jpg",
  "/images/bcc/community/community-06.jpg",
];

const formatIcons: Record<string, string> = {
  "In-Person": "📍",
  Virtual: "🎬",
  Hybrid: "🖥️",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

interface EventCardProps {
  event: Event;
  fallbackIndex?: number;
}

export default function EventCard({ event, fallbackIndex = 0 }: EventCardProps) {
  const formatIcon = formatIcons[event.format] || "🖥️";
  const image = event.imageUrl ?? fallbackImages[fallbackIndex % fallbackImages.length];
  const isExternal = event.url?.startsWith("http");

  // Numeric IDs come from the live Eventbrite API. Static fallback events
  // (no token configured) use string slugs and don't get the embedded
  // checkout — they keep the plain external link.
  const eventbriteId = /^\d+$/.test(event.id) ? event.id : null;
  const triggerId = eventbriteId
    ? `eventbrite-widget-modal-trigger-${eventbriteId}`
    : undefined;

  useEffect(() => {
    if (!eventbriteId || !triggerId) return;
    let cancelled = false;
    let attempts = 0;
    const init = () => {
      if (cancelled) return;
      if (window.EBWidgets) {
        window.EBWidgets.createWidget({
          widgetType: "checkout",
          eventId: eventbriteId,
          modal: true,
          modalTriggerElementId: triggerId,
        });
      } else if (attempts < 50) {
        attempts++;
        setTimeout(init, 100);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [eventbriteId, triggerId]);

  const inner = (
    <>
      {/* Event image */}
      <div className="h-44 relative overflow-hidden bg-grey-1">
        <Image
          src={image}
          alt={event.title}
          fill
          unoptimized={!!event.imageUrl}
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-true-black/20 to-transparent" />
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/90 text-true-black">
            {formatIcon} {event.format}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3">
          <time className="text-sm font-bold text-cobalt font-mono">
            {formatDate(event.date)}
          </time>
          <span
            className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: event.pathwayColor + "20",
              color: event.pathwayColor,
            }}
          >
            {event.pathway}
          </span>
        </div>

        <h3 className="text-lg font-display font-bold text-true-black uppercase leading-tight">
          {event.title}
        </h3>
        <p className="mt-1 text-xs text-grey-3 font-mono">{event.time}</p>

        <p className="mt-3 text-sm text-grey-3 leading-relaxed line-clamp-2">
          {event.description}
        </p>

        <div className="mt-4 pt-4 border-t border-true-black/5 flex items-center justify-between">
          <span className="text-xs text-grey-3">
            w/{" "}
            <span className="text-true-black font-semibold">{event.partner}</span>
          </span>
          {event.location && (
            <span className="text-xs text-grey-3 font-mono flex items-center gap-1">
              📍 {event.location.split(",")[0]}
            </span>
          )}
        </div>

        {event.url && (
          <div className="mt-4 pt-4 border-t border-true-black/5">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-cobalt group-hover:gap-3 transition-all">
              Register →
            </span>
          </div>
        )}
      </div>
    </>
  );

  const cardClasses =
    "group flex flex-col border-2 border-true-black/5 hover:border-cobalt/30 transition-all duration-300 bg-white h-full text-left";

  // Live Eventbrite events: render as a button so Eventbrite's SDK can bind
  // its modal trigger without fighting the browser's anchor navigation.
  // (An <a target="_blank"> would open a new tab AND open the modal in the
  // background, which is the exact bug we were seeing.) If the SDK script
  // failed to load (ad-blocker, network), onClick falls back to opening
  // the Eventbrite URL in a new tab.
  if (eventbriteId && event.url) {
    return (
      <>
        <Script
          id="eventbrite-widget-sdk"
          src="https://www.eventbrite.com/static/widgets/eb_widgets.js"
          strategy="lazyOnload"
        />
        <motion.button
          variants={fadeInUp}
          type="button"
          id={triggerId}
          onClick={() => {
            if (!window.EBWidgets && event.url) {
              window.open(event.url, "_blank", "noopener,noreferrer");
            }
          }}
          className={cardClasses}
        >
          {inner}
        </motion.button>
      </>
    );
  }

  // Static fallback events (no token configured): plain external link.
  if (event.url) {
    return (
      <motion.a
        variants={fadeInUp}
        href={event.url}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={cardClasses}
      >
        {inner}
      </motion.a>
    );
  }

  return (
    <motion.div variants={fadeInUp} className={cardClasses}>
      {inner}
    </motion.div>
  );
}
