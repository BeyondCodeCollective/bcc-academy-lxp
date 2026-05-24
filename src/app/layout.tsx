import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Space_Mono, Bricolage_Grotesque } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { getProgram } from "@/lib/programs/server";
import {
  TEXT_SCALE_COOKIE,
  parseTextScale,
  rootFontSizeFor,
} from "@/lib/accessibility/scale";
import { AuthErrorBanner } from "@/components/auth-error-banner";
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

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const specialGothic = localFont({
  src: "../fonts/SpecialGothic-Variable.ttf",
  variable: "--font-special-gothic",
  display: "swap",
});

const gtStandard = localFont({
  src: "../fonts/GT-Standard-Regular.ttf",
  variable: "--font-gt-standard",
  display: "swap",
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
      className={`${geistSans.variable} ${spaceMono.variable} ${bricolage.variable} ${specialGothic.variable} ${gtStandard.variable} h-full antialiased`}
      style={{ fontSize: rootFontSizeFor(textScale) }}
    >
      <body className="min-h-full flex flex-col font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#E54D2E]"
        >
          Skip to main content
        </a>
        <AuthErrorBanner />
        <div id="main-content" className="flex flex-1 flex-col">
          {children}
        </div>
        <Analytics />
        {program.gaId && <GoogleAnalytics gaId={program.gaId} />}
      </body>
    </html>
  );
}
