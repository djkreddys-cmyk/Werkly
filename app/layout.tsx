import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://werkly.in"),
  title: "Werkly | Job Consultancy for Employers and Candidates",
  description:
    "Werkly is a job consultancy connecting employers with qualified talent and guiding candidates toward better career opportunities across multiple industries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${cormorant.variable} scroll-smooth`}
    >
      <body className="min-h-screen bg-[var(--color-paper)] text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
