"use client";

import Image from "next/image";
import Link from "next/link";
import { EnquiryModal } from "@/components/enquiry-modal";

const navItems = [
  { label: "Sectors", target: "expertise" },
  { label: "Process", target: "process" },
  { label: "Contact", target: "contact" },
  { label: "Resume Builder", target: "resume-builder" },
];

export function SiteHeader() {
  const handleNavClick = (target: string) => {
    if (typeof window === "undefined") return;
    const nextUrl = `${window.location.pathname}#${target}`;
    window.history.replaceState(null, "", nextUrl);
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[rgba(8,96,108,0.94)] backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="/Werkly Logo.png"
            alt="Werkly logo"
            width={640}
            height={176}
            className="h-[136px] w-auto object-contain"
            priority
          />
        </Link>
        <nav className="hidden items-center gap-9 text-sm font-medium uppercase tracking-[0.16em] text-white/78 md:flex">
          {navItems.map((item) => (
            <button
              key={item.target}
              type="button"
              onClick={() => handleNavClick(item.target)}
              className="transition hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <EnquiryModal />
      </div>
    </header>
  );
}
