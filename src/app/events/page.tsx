import { notFound } from "next/navigation";
import { getProgram } from "@/lib/programs/server";
import { getEvents, ORGANIZER_URL } from "@/lib/eventbrite";
import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import EventsListing from "@/components/marketing/EventsListing";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Events — BCC Academy",
  description:
    "Workshops, cohorts, and meetups from the Beyond Code Collective and our partners.",
};

export default async function EventsPage() {
  const program = await getProgram();
  if (program.slug !== "marketing") {
    notFound();
  }

  const events = await getEvents();

  return (
    <div className="marketing-scope min-h-screen bg-grey-1">
      <Header />
      <main className="pt-32 md:pt-40 pb-24 px-6">
        <div className="mx-auto max-w-7xl">
          <header className="text-center mb-16 md:mb-20">
            <p className="text-cobalt text-sm font-semibold tracking-[0.3em] uppercase mb-4 font-mono">
              [ All Upcoming Events ]
            </p>
            <h1 className="font-display text-5xl md:text-7xl font-bold text-true-black uppercase">
              Find your
              <br />next room.
            </h1>
            <p className="mt-6 text-lg text-grey-3 max-w-2xl mx-auto leading-relaxed">
              Workshops, cohorts, and family days from Beyond Code Collective
              and our partners. Free to attend, open to the community.
            </p>
          </header>

          <EventsListing events={events} />

          <div className="mt-20 text-center">
            <a
              href={ORGANIZER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-true-black/60 hover:text-cobalt font-mono uppercase tracking-wider transition-colors"
            >
              View on Eventbrite
              <ArrowUpRight size={14} weight="bold" />
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
