const navItems = [
  { label: "Services", href: "#services" },
  { label: "Process", href: "#process" },
  { label: "Sectors", href: "#roles" },
  { label: "Contact", href: "#contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(5,7,11,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <a href="#top" className="flex items-center gap-3 text-sm font-semibold tracking-[0.12em] text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(207,217,230,0.42)] bg-[rgba(207,217,230,0.12)] text-base text-[var(--color-accent)]">
            W
          </span>
          Werkly
        </a>
        <nav className="hidden items-center gap-8 text-sm text-white/80 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </a>
          ))}
        </nav>
        <a
          href="#contact"
          className="inline-flex items-center justify-center rounded-xl border border-[var(--color-accent)] bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium !text-[var(--color-dark)] transition hover:opacity-95"
        >
          Get Started
        </a>
      </div>
    </header>
  );
}
