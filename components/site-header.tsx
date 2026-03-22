"use client";

import Image from "next/image";
import Link from "next/link";
import { EnquiryModal } from "@/components/enquiry-modal";

const navItems = [
  { label: "Sectors", href: "/#expertise" },
  { label: "Process", href: "/#process" },
  { label: "Contact", href: "/#contact" },
  { label: "Resume Builder", href: "/#resume-builder" },
];

export function SiteHeader() {
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
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <EnquiryModal />
      </div>
    </header>
  );
}
