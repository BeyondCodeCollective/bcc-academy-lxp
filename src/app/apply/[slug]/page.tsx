// The generic application template. Every DB-driven application renders here;
// the older bespoke forms (/apply/sbft, /apply/home-for-summer,
// /apply/security-plus) are static siblings that win routing over this
// dynamic segment and keep working unchanged.

import { notFound } from "next/navigation";
import { getApplicationBySlug, isAccepting } from "@/lib/applications";
import { GenericApplyForm } from "./apply-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = await getApplicationBySlug(slug);
  if (!app) return {};
  return {
    title: `Apply — ${app.title} | BCC Academy`,
    description: app.description ?? `Application for ${app.title}.`,
  };
}

export default async function GenericApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = await getApplicationBySlug(slug);
  if (!app) notFound();

  if (!isAccepting(app)) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-5 py-16">
        <div className="border border-rule bg-surface-elevated p-8 sm:p-12 text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">
            Applications for {app.title} are closed
          </h1>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto">
            This application window has ended. Reach out to your program
            contact if you think this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GenericApplyForm
      slug={app.slug}
      title={app.title}
      description={app.description}
      questions={app.questions}
    />
  );
}
