import type { Metadata } from "next";
import { Geist_Mono, Archivo } from "next/font/google";
import "../globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
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
    <html lang="en" className={`${geistMono.variable} ${archivo.variable}`}>
      <body className="font-body antialiased bg-off-white text-true-black">{children}</body>
    </html>
  );
}
