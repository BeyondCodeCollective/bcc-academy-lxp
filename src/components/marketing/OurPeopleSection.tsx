"use client";

import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/marketing-motion";
import { facilitators, type Facilitator } from "@/data/marketing/facilitators";
import Image from "next/image";

function getInitials(name: string): string {
  // Strip credentials/suffixes like ", M.Ed." before computing initials
  const stripped = name.split(",")[0];
  const parts = stripped.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const monogramThemes = [
  { bg: "bg-cobalt", fg: "text-electric-green" },
  { bg: "bg-true-black", fg: "text-electric-green" },
  { bg: "bg-electric-green", fg: "text-true-black" },
];

function InstructorPortrait({
  person,
  themeIndex,
}: {
  person: Facilitator;
  themeIndex: number;
}) {
  if (person.monogram) {
    const theme = monogramThemes[themeIndex % monogramThemes.length];
    return (
      <div
        className={`relative aspect-square w-full overflow-hidden ${theme.bg} flex items-center justify-center`}
        aria-label={`${person.name} — high-resolution photo coming soon`}
      >
        <span
          className={`font-display ${theme.fg} font-bold leading-none select-none`}
          style={{ fontSize: "clamp(5rem, 12vw, 9rem)" }}
        >
          {getInitials(person.name)}
        </span>
        <span className="absolute bottom-3 right-3 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
          [ Photo coming soon ]
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-grey-1">
      <Image
        src={person.image}
        alt={person.name}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 380px"
      />
    </div>
  );
}

export default function OurPeopleSection() {
  return (
    <section id="our-people" className="py-24 md:py-32 px-6 bg-off-white">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="mb-16 max-w-3xl"
        >
          <p className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
            [ By Us, For Everyone ]
          </p>
          <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-true-black uppercase leading-[0.9]">
            Mentors who
            <br />reflect the room.
          </h2>
          <p className="mt-6 text-lg text-grey-3 leading-relaxed">
            Confidence grows when learners see themselves reflected in the
            space, the curriculum, and the facilitators. Our people teach
            from where they&rsquo;ve actually been.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
        >
          {facilitators.map((person, i) => (
            <motion.article
              key={person.id}
              variants={fadeInUp}
              className="group flex flex-col bg-white border-2 border-true-black/5 hover:border-cobalt/30 transition-colors duration-300"
            >
              <InstructorPortrait person={person} themeIndex={i} />

              <div className="flex flex-col gap-4 p-6 md:p-7">
                <div>
                  <p className="text-[11px] font-bold text-cobalt uppercase tracking-[0.2em] font-mono mb-2">
                    [ {person.org} ]
                  </p>
                  <h3 className="text-xl md:text-2xl font-display font-bold text-true-black leading-tight uppercase">
                    {person.name}
                  </h3>
                  <p className="mt-1 text-sm text-grey-3">
                    {person.title}
                  </p>
                </div>

                <div className="border-t border-true-black/10 pt-4">
                  <p className="text-[10px] font-semibold text-true-black uppercase tracking-[0.2em] font-mono mb-1.5">
                    Teaches
                  </p>
                  <p className="text-sm font-semibold text-true-black leading-snug">
                    {person.course}
                  </p>
                </div>

                <p className="text-sm text-grey-3 leading-relaxed">
                  {person.bio}
                </p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
