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
      className={`${sourceSans.variable} ${libreBaskerville.variable} scroll-smooth`}
    >
      <body className="min-h-screen bg-[var(--color-paper)] text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
