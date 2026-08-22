import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { StructuredData } from "@/components/structured-data";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "@/lib/seo";
import "./globals.css";

const googleAdSenseClientId = "ca-pub-7220106906849353";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    "recruitment company India",
    "IT recruitment",
    "Non-IT recruitment",
    "HR consulting",
    "job openings India",
    "staffing solutions",
    "Werkly jobs",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} recruitment and hiring solutions`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "recruitment",
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
      <head>
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${googleAdSenseClientId}`}
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-[var(--color-paper)] text-slate-950 antialiased">
        <StructuredData
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": `${SITE_URL}/#organization`,
              name: SITE_NAME,
              url: SITE_URL,
              logo: absoluteUrl("/Werkly%20Logo.png"),
              description: DEFAULT_DESCRIPTION,
              areaServed: {
                "@type": "Country",
                name: "India",
              },
              knowsAbout: [
                "IT recruitment",
                "Non-IT recruitment",
                "staffing",
                "HR consulting",
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              url: SITE_URL,
              name: SITE_NAME,
              description: DEFAULT_DESCRIPTION,
              publisher: { "@id": `${SITE_URL}/#organization` },
              inLanguage: "en-IN",
            },
          ]}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
