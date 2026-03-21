import Image from "next/image";
import { EnquiryModal } from "@/components/enquiry-modal";

const navItems = [
  { label: "Process", href: "#process" },
  { label: "Sectors", href: "#expertise" },
  { label: "Contact", href: "#contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(190,72,26,0.94)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <a href="#top" className="flex items-center">
          <Image
            src="/Werkly Logo.png"
            alt="Werkly logo"
            width={220}
            height={60}
            className="h-12 w-auto object-contain"
            priority
          />
        </a>
        <nav className="hidden items-center gap-8 text-sm text-white/80 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </a>
          ))}
        </nav>
        <EnquiryModal />
      </div>
    </header>
  );
}
