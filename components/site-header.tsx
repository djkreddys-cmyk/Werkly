import Image from "next/image";
import { EnquiryModal } from "@/components/enquiry-modal";

const navItems = [
  { label: "Process", href: "#process" },
  { label: "Sectors", href: "#expertise" },
  { label: "Contact", href: "#contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50">
      <div className="hidden border-b border-white/10 bg-[#1b2227] text-white/70 md:block">
        <div className="mx-auto flex h-9 w-full max-w-7xl items-center justify-between px-5 text-xs sm:px-8">
          <div className="flex items-center gap-5">
            <span>Hyderabad Headquarters</span>
            <span className="text-white/35">|</span>
            <a href="mailto:hr@werkly.in" className="transition hover:text-white">
              hr@werkly.in
            </a>
          </div>
          <p className="tracking-[0.18em] text-white/55">
            Non-IT Search and Selection Partner
          </p>
        </div>
      </div>
      <div className="border-b border-slate-200/80 bg-[rgba(255,255,255,0.96)] shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
          <a href="#top" className="flex items-center">
            <Image
              src="/Werkly Logo.png"
              alt="Werkly logo"
              width={640}
              height={176}
              className="h-[56px] w-auto object-contain"
              priority
            />
          </a>
          <nav className="hidden items-center gap-9 text-sm font-medium uppercase tracking-[0.16em] text-slate-700 md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-[var(--color-brand-cyan)]">
                {item.label}
              </a>
            ))}
          </nav>
          <EnquiryModal />
        </div>
      </div>
    </header>
  );
}
