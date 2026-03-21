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
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <a href="#top" className="relative flex h-full items-center overflow-visible">
          <Image
            src="/Werkly Logo.png"
            alt="Werkly logo"
            width={640}
            height={176}
            className="absolute left-0 top-1/2 h-[140px] w-auto -translate-y-1/2 object-contain"
            priority
          />
          <span className="block w-[320px]" aria-hidden="true" />
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
