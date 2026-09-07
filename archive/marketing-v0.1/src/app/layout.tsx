import type { Metadata } from "next";
import { Space_Mono, Bricolage_Grotesque, Plus_Jakarta_Sans, Geist_Mono, Source_Serif_4 } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";
import ChatButton from "@/components/ChatButton";
import "./globals.css";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
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

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  icons: {
    icon: "/icon.png",
  },
  title: "BCC Academy — Every Step, Someone's With You",
  description:
    "A global, intergenerational learning ecosystem for ages 7 to 70+. Every learner gets a real human facilitator. 95% completion rate. Proudly home to Black Girls Code.",
  keywords: [
    "BCC Academy",
    "Black Girls Code",
    "tech education",
    "human facilitator",
    "cohort-based learning",
    "coding bootcamp alternative",
    "Atlanta tech",
  ],
  openGraph: {
    title: "BCC Academy — Every Step, Someone's With You",
    description:
      "A global, intergenerational learning ecosystem for ages 7 to 70+. Every learner gets a real human facilitator.",
    url: "https://theforgeacademy.com",
    siteName: "BCC Academy",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "BCC Academy — Every Step, Someone's With You",
    description:
      "A global, intergenerational learning ecosystem for ages 7 to 70+. Every learner gets a real human facilitator.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${specialGothic.variable} ${gtStandard.variable} ${bricolage.variable} ${jakarta.variable} ${geistMono.variable} ${sourceSerif.variable}`}>
      <body className="font-body antialiased">
        {children}
        <ChatButton />
        <Analytics />
        <GoogleAnalytics gaId="G-KJF6CKFSTP" />
      </body>
    </html>
  );
}
