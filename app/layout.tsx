import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const googleAdSenseClientId = "ca-pub-7220106906849353";

export const metadata: Metadata = {
  metadataBase: new URL("https://werkly.in"),
  title: "Werkly Consulting Pvt LTD | IT and Non-IT Hiring Partner",
  description:
    "Werkly Consulting Pvt LTD delivers tailored HR and recruitment solutions across IT and Non-IT hiring with structured execution, domain-focused search, and measurable outcomes.",
  other: {
    "google-adsense-account": googleAdSenseClientId,
  },
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
        <Script
          id="google-adsense"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${googleAdSenseClientId}`}
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
