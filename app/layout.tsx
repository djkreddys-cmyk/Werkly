import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
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
      className={`${inter.variable} ${playfair.variable} scroll-smooth`}
    >
      <body className="min-h-screen bg-[var(--color-cream)] text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
