import Link from "next/link";
import { notFound } from "next/navigation";
import { pathways } from "@/data/pathways";

interface PathwayPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return pathways.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: PathwayPageProps) {
  const { slug } = await params;
  const pathway = pathways.find((p) => p.id === slug);
  if (!pathway) return { title: "Pathway Not Found" };

  return {
    title: `${pathway.name} (${pathway.stage}) — BCC Academy`,
    description: pathway.description,
  };
}

export default async function PathwayPage({ params }: PathwayPageProps) {
  const { slug } = await params;
  const pathway = pathways.find((p) => p.id === slug);

  if (!pathway) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <div className="text-6xl mb-6" role="img" aria-hidden="true">
          {pathway.icon}
        </div>
        <div
          className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
          style={{
            backgroundColor: pathway.color + "20",
            color: pathway.color,
          }}
        >
          Ages {pathway.stage}
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold text-white">
          {pathway.name}
        </h1>
        <p
          className="mt-4 text-2xl font-display italic"
          style={{ color: pathway.color }}
        >
          &ldquo;{pathway.tagline}&rdquo;
        </p>
        <p className="mt-6 text-lg text-text-secondary leading-relaxed">
          {pathway.description}
        </p>
        <p className="mt-10 text-sm text-text-secondary">
          Full pathway details coming soon.
        </p>
        <Link
          href="/#pathways"
          className="mt-6 inline-flex items-center gap-2 text-teal hover:text-teal-light font-semibold transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to All Pathways
        </Link>
      </div>
    </div>
  );
}
