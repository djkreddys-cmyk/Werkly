import { EnquiryModal } from "@/components/enquiry-modal";

const navItems = [
  { label: "Process", href: "#process" },
  { label: "Sectors", href: "#expertise" },
  { label: "Contact", href: "#contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(9,19,24,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <a href="#top" className="flex items-center text-sm font-semibold tracking-[0.12em] text-white">
          <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,var(--color-brand-cyan),var(--color-accent-strong))] shadow-[0_10px_24px_rgba(9,19,24,0.28)]">
            <span className="absolute inset-[2px] rounded-[0.85rem] bg-[rgba(9,19,24,0.24)]" />
            <span className="relative text-lg font-extrabold text-white">
              W
            </span>
          </span>
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
