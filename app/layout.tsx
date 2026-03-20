import type { Metadata } from "next";
import { Lora, Work_Sans } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
      className={`${workSans.variable} ${lora.variable} scroll-smooth`}
    >
      <body className="min-h-screen bg-[var(--color-paper)] text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}
