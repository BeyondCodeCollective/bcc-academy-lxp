import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "../globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const specialGothic = localFont({
  src: "../../fonts/SpecialGothic-Variable.subset.woff2",
  variable: "--font-special-gothic",
  display: "swap",
});

const gtStandard = localFont({
  src: "../../fonts/GT-Standard-Regular.subset.woff2",
  variable: "--font-gt-standard",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Help Center | BCC Academy",
  description: "Documentation and guides for the BCC Academy Learning Experience Platform",
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistMono.variable} ${specialGothic.variable} ${gtStandard.variable}`}>
      <body className="font-body antialiased bg-off-white text-true-black">{children}</body>
    </html>
  );
}
