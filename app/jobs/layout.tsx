import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jobs in India - IT, Engineering and Non-IT Openings",
  description:
    "Explore current IT, engineering, business, operations, and Non-IT job openings across India. Review role details and apply directly through Werkly.",
  alternates: {
    canonical: "/jobs",
  },
  openGraph: {
    title: "Current Job Openings in India | Werkly Consulting",
    description:
      "Search active IT and Non-IT opportunities and apply directly through Werkly Consulting.",
    url: "/jobs",
  },
};

export default function JobsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

