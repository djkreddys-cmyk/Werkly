const navItems = [
  { label: "Services", href: "#services" },
  { label: "Process", href: "#process" },
  { label: "Open Roles", href: "#roles" },
  { label: "Contact", href: "#contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-[rgba(248,244,236,0.75)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <a href="#top" className="flex items-center gap-3 text-sm font-semibold tracking-[0.22em] text-slate-900 uppercase">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-900/15 bg-white text-base tracking-[0.16em]">
            W
          </span>
          Werkly
        </a>
        <nav className="hidden items-center gap-8 text-sm text-slate-700 md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-slate-950">
              {item.label}
            </a>
          ))}
        </nav>
        <a
          href="#contact"
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Book a Hiring Call
        </a>
      </div>
    </header>
  );
}
