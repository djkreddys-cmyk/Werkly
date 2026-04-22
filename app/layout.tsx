import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://werkly.in"),
  title: "Werkly Consulting Pvt LTD | IT and Non-IT Hiring Partner",
  description:
    "Werkly Consulting Pvt LTD delivers tailored HR and recruitment solutions across IT and Non-IT hiring with structured execution, domain-focused search, and measurable outcomes.",
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
