const quickLinks = [
  { label: "Services", href: "#services" },
  { label: "Sectors", href: "#expertise" },
  { label: "Contact", href: "#contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[var(--color-dark)] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-5 py-7 text-center sm:px-8">
        <div className="max-w-[30rem] space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]/80">
            Werkly
          </p>
          <h2 className="mx-auto max-w-[27rem] font-[family-name:var(--font-display)] text-[1.85rem] leading-[1.18] text-white">
            Tailor-made HR solutions with structured Non-IT recruitment delivery.
          </h2>
          <p className="mx-auto max-w-[30rem] text-sm leading-7 text-white/65">
            Headquartered in Hyderabad with a branch office in Vijayawada, Werkly Consulting Pvt LTD supports clients with customized search and selection solutions across diverse Non-IT industries.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/70">
          {quickLinks.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </a>
          ))}
          <a href="mailto:hr@werkly.in" className="transition hover:text-white">
            hr@werkly.in
          </a>
        </div>
      </div>
    </footer>
  );
}
