"use client";

import Image from "next/image";

const photos = [
  { src: "/images/bcc/forge-panel.jpg", alt: "Panel discussion at Beyond Code Centers ATL", wide: true },
  { src: "/images/bcc/brand/youth-group.jpg", alt: "Young learners after class", wide: true },
  { src: "/images/bcc/brand/group-selfie.jpg", alt: "BCC community gathering", wide: true },
  { src: "/images/bcc/community-selfie.jpg", alt: "BCC community members", wide: true },
  { src: "/images/bcc/community/community-05.jpg", alt: "Learners collaborating", wide: false },
  { src: "/images/bcc/brand/street-joy.jpg", alt: "Beyond Code community", wide: true },
  { src: "/images/bcc/studying-together.jpg", alt: "Studying together", wide: false },
  { src: "/images/bcc/community/community-06.jpg", alt: "Community workshop", wide: true },
  { src: "/images/bcc/brand/community-portrait.jpg", alt: "Builders portrait", wide: false },
  { src: "/images/bcc/initiatives/forge.jpg", alt: "Beyond Code Centers space", wide: false },
  { src: "/images/bcc/brand/friends-sky.jpg", alt: "Wisdom Leaders and Explorers", wide: true },
  { src: "/images/bcc/community/community-03.jpg", alt: "Mentorship session", wide: false },
  { src: "/images/bcc/community/community-02.jpg", alt: "Pair programming", wide: true },
  { src: "/images/bcc/community/community-04.jpg", alt: "Community event", wide: false },
];

export default function PhotoStrip() {
  const doubled = [...photos, ...photos];

  return (
    <div className="relative overflow-hidden bg-true-black py-2">

      <div className="flex animate-strip">
        {doubled.map((photo, i) => (
          <div
            key={`${photo.src}-${i}`}
            className={`flex-shrink-0 h-[220px] md:h-[320px] relative mx-1 overflow-hidden group ${
              photo.wide ? "w-[400px] md:w-[520px]" : "w-[280px] md:w-[360px]"
            }`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
              sizes="520px"
            />
            <div className="absolute inset-0 bg-true-black/20 group-hover:bg-transparent transition-colors duration-500" />
          </div>
        ))}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-electric-green z-10" />
    </div>
  );
}
