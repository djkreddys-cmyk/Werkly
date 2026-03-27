import type { Metadata } from "next";
import { Manrope, Montserrat } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

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
    <html
      lang="en"
      className={`${manrope.variable} ${montserrat.variable} scroll-smooth`}
    >
      <body className="min-h-screen bg-[var(--color-paper)] text-slate-950 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
