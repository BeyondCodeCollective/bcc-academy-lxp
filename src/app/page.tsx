import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getProgram } from "@/lib/programs/server";
import { LoginForm } from "@/components/login-form";
import { MarketingHome } from "@/components/marketing/MarketingHome";

const MARKETING_HOSTS = new Set([
  "bccacademy.io",
  "www.bccacademy.io",
  "localhost",
  "127.0.0.1",
  "192.168.1.83",
]);

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const program = await getProgram();
  const url = `https://${program.domain}`;

  return {
    title: program.seo.title,
    description: program.seo.description,
    openGraph: {
      title: program.seo.ogTitle,
      description: program.seo.ogDescription,
      url,
      siteName: program.name,
      images: [
        {
          url: "https://bccacademy.io/images/bcc/community/community-og.webp",
          width: 1456,
          height: 816,
          alt: "BCC Academy students in the classroom",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: program.seo.ogTitle,
      description: program.seo.ogDescription,
      images: ["https://bccacademy.io/images/bcc/community/community-og.webp"],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function LoginPage() {
  const h = await headers();
  const host = (h.get("host") ?? "").replace(/:\d+$/, "");
  if (MARKETING_HOSTS.has(host)) {
    return <MarketingHome />;
  }

  const program = await getProgram();

  if (program.slug === "marketing") {
    return <MarketingHome />;
  }

  return (
    <LoginForm
      logo={program.logo}
      programName={program.name}
      tagline={program.tagline}
      taglineColor={program.colors.tagline}
      organization={program.organization}
    />
  );
}
