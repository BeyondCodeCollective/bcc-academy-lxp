import type { Metadata, Viewport } from "next";
import { Geist, Space_Mono } from "next/font/google";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "After The Game — IT Career Training by Beyond Code Collective",
  description:
    "After The Game helps former athletes break into tech with CompTIA Tech+ certification prep, MASS wraparound coaching, and hands-on career support. Powered by Beyond Code Collective.",
  metadataBase: new URL("https://atg.bccacademy.io"),
  openGraph: {
    title: "After The Game — IT Career Training",
    description:
      "CompTIA Tech+ certification prep and career coaching for former athletes.",
    url: "https://atg.bccacademy.io",
    siteName: "After The Game",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "After The Game — IT Career Training",
    description:
      "CompTIA Tech+ certification prep and career coaching for former athletes.",
  },
  alternates: {
    canonical: "https://atg.bccacademy.io",
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
      className={`${geistSans.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
