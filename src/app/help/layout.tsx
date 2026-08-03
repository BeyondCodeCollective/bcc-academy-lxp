import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center | BCC Academy",
  description: "Documentation and guides for the BCC Academy Learning Experience Platform",
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
