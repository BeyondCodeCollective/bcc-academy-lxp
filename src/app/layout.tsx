import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Geist, Geist_Mono, Archivo } from "next/font/google";
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

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Display face for headings — editorial weight/character on top of the SF body.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
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
    "A community-based learning and workforce ecosystem giving people lifelong access to the skills, relationships, and pathways shaping the future of work. Ages 7 to 77. By us, for everyone.",
  metadataBase: new URL("https://bccacademy.io"),
  openGraph: {
    title: "Beyond Code Collective",
    description:
      "A community-based learning and workforce ecosystem for ages 7 to 77. Where everyone builds together.",
    url: "https://bccacademy.io",
    siteName: "BCC Academy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Beyond Code Collective",
    description:
      "A community-based learning and workforce ecosystem for ages 7 to 77. Where everyone builds together.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <TextScaleProvider />
        <GoogleAnalyticsProvider />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#1D59FF]"
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
