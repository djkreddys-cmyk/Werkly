import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://werkly.in"),
  title: "Werkly Consulting Pvt LTD | Non-IT Search and Selection Partner",
  description:
    "Werkly Consulting Pvt LTD delivers end-to-end, tailor-made HR and recruitment solutions across Non-IT sectors with structured execution, domain-specific teams, and measurable outcomes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-[var(--color-paper)] text-slate-950 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
