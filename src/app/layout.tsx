import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Space_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { getProgram } from "@/lib/programs/server";
import {
  TEXT_SCALE_COOKIE,
  parseTextScale,
  rootFontSizeFor,
} from "@/lib/accessibility/scale";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const program = await getProgram();
  const url = `https://${program.domain}`;

  return {
    title: program.seo.title,
    description: program.seo.description,
    metadataBase: new URL(url),
    openGraph: {
      title: program.seo.ogTitle,
      description: program.seo.ogDescription,
      url,
      siteName: program.name,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: program.seo.ogTitle,
      description: program.seo.ogDescription,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [program, cookieStore] = await Promise.all([getProgram(), cookies()]);
  const textScale = parseTextScale(cookieStore.get(TEXT_SCALE_COOKIE)?.value);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${spaceMono.variable} h-full antialiased`}
      style={{ fontSize: rootFontSizeFor(textScale) }}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Analytics />
        {program.gaId && <GoogleAnalytics gaId={program.gaId} />}
      </body>
    </html>
  );
}
