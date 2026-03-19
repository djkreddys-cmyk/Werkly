const quickLinks = [
  { label: "Services", href: "#services" },
  { label: "Sectors", href: "#roles" },
  { label: "Contact", href: "#contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[var(--color-dark)] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-md space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]/80">
            Werkly
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-white">
            Connecting talent with dependable opportunities.
          </h2>
          <p className="text-sm leading-7 text-white/65">
            Recruitment consultancy support for employers and job seekers across pharma, biotech, operations, hospitality, and allied sectors.
          </p>
        </div>
        <div className="flex flex-col gap-6 text-sm text-white/70 sm:flex-row sm:items-center sm:gap-8">
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
