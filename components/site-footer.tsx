const quickLinks = [
  { label: "Sectors", href: "#expertise" },
  { label: "Contact", href: "#contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-line)] bg-[rgba(255,255,255,0.78)] text-[var(--color-ink)] backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-5 px-5 py-8 text-center sm:px-8">
        <div className="w-full max-w-[640px] space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-strong)]">
            Werkly
          </p>
          <h2 className="mx-auto w-full max-w-[560px] font-[family-name:var(--font-display)] text-[1.85rem] leading-[1.18] text-[var(--color-ink)]">
            Nextgen HR solutions with structured Non-IT recruitment delivery.
          </h2>
          <p className="mx-auto w-full max-w-[620px] text-sm leading-7 text-[var(--color-muted)]">
            Werkly Consulting Pvt LTD supports clients with customized search and selection solutions across diverse Non-IT industries.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[var(--color-ink)]/80">
          {quickLinks.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-[var(--color-dark)]">
              {item.label}
            </a>
          ))}
          <a href="mailto:hr@werkly.in" className="transition hover:text-[var(--color-dark)]">
            hr@werkly.in
          </a>
        </div>
      </div>
    </footer>
  );
}
