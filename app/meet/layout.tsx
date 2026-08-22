import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private Meeting",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function MeetingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

