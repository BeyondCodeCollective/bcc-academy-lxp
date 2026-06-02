import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Geist, Bricolage_Grotesque } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { TextScaleProvider } from "@/components/text-scale-provider";
import { GoogleAnalyticsProvider } from "@/components/google-analytics-provider";
import "./globals.css";

const AuthErrorBanner = dynamic(
  () => import("@/components/auth-error-banner").then((m) => m.AuthErrorBanner),
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const specialGothic = localFont({
  src: "../fonts/SpecialGothic-Variable.subset.woff2",
  variable: "--font-special-gothic",
  display: "swap",
});

const gtStandard = localFont({
  src: "../fonts/GT-Standard-Regular.subset.woff2",
  variable: "--font-gt-standard",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Beyond Code Collective — Where everyone builds together",
  description:
    "A community-based learning and workforce ecosystem giving people lifelong access to the skills, relationships, and pathways shaping the future of work. Ages 7 to 87. By us, for everyone.",
  metadataBase: new URL("https://bccacademy.io"),
  openGraph: {
    title: "Beyond Code Collective",
    description:
      "A community-based learning and workforce ecosystem for ages 7 to 87. Where everyone builds together.",
    url: "https://bccacademy.io",
    siteName: "BCC Academy",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Beyond Code Collective",
    description:
      "A community-based learning and workforce ecosystem for ages 7 to 87. Where everyone builds together.",
  },
  alternates: {
    canonical: "https://bccacademy.io",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${bricolage.variable} ${specialGothic.variable} ${gtStandard.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <TextScaleProvider />
        <GoogleAnalyticsProvider />
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
      </body>
    </html>
  );
}
