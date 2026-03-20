import type { Metadata } from "next";
import { Libre_Baskerville, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
});

const libreBaskerville = Libre_Baskerville({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
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
      className={`${sourceSans.variable} ${libreBaskerville.variable} scroll-smooth`}
    >
      <body className="min-h-screen bg-[var(--color-paper)] text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
