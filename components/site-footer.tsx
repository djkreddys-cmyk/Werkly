 "use client";

const quickLinks = [
  { label: "Sectors", target: "expertise" },
  { label: "Process", target: "process" },
  { label: "Contact", target: "contact" },
  { label: "Resume Builder", target: "resume-builder" },
];

export function SiteFooter() {
  const handleNavClick = (target: string) => {
    if (typeof window === "undefined") return;
    const nextUrl = `${window.location.pathname}#${target}`;
    window.history.replaceState(null, "", nextUrl);
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer className="border-t border-white/10 bg-[var(--color-dark)] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-5 px-5 py-8 text-center sm:px-8">
        <div className="w-full max-w-[640px] space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]/90">
            Werkly
          </p>
          <h2 className="mx-auto w-full max-w-[560px] font-[family-name:var(--font-display)] text-[1.85rem] leading-[1.18] text-white">
            Nextgen HR solutions with structured Non-IT recruitment delivery.
          </h2>
          <p className="mx-auto w-full max-w-[620px] text-sm leading-7 text-white/68">
            Werkly Consulting Pvt LTD supports clients with customized search and selection solutions across diverse Non-IT industries.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/80">
          {quickLinks.map((item) => (
            <button
              key={item.target}
              type="button"
              onClick={() => handleNavClick(item.target)}
              className="transition hover:text-white"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}
