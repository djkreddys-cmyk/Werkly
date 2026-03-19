const quickLinks = [
  { label: "Services", href: "#services" },
  { label: "Open Roles", href: "#roles" },
  { label: "Contact", href: "#contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-md space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
            Werkly
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-slate-950">
            Hiring that feels focused, human, and fast.
          </h2>
          <p className="text-sm leading-7 text-slate-600">
            Boutique recruitment support for growing teams across product, operations, and GTM hiring.
          </p>
        </div>
        <div className="flex flex-col gap-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:gap-8">
          {quickLinks.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-slate-950">
              {item.label}
            </a>
          ))}
          <a href="mailto:hello@werkly.in" className="transition hover:text-slate-950">
            hello@werkly.in
          </a>
        </div>
      </div>
    </footer>
  );
}
