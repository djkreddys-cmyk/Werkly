"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const quickLinks = [
  { label: "Jobs", href: "/jobs" },
  { label: "Sectors", target: "expertise" },
  { label: "Process", target: "process" },
  { label: "Contact", target: "contact" },
  { label: "Resume Builder", target: "resume-builder" },
];

function isLinkItem(
  item: (typeof quickLinks)[number]
): item is { label: string; href: string } {
  return "href" in item;
}

export function SiteFooter() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavClick = (target: string) => {
    if (typeof window === "undefined") return;
    if (pathname !== "/") {
      router.push(`/#${target}`);
      return;
    }
    const nextUrl = `${window.location.pathname}#${target}`;
    window.history.pushState(null, "", nextUrl);
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
            Recruitment support built for both IT and Non-IT hiring teams.
          </h2>
          <p className="mx-auto w-full max-w-[620px] text-sm leading-7 text-white/68">
            Werkly Consulting Pvt LTD supports companies with customized search and selection solutions across technology, business, engineering, operations, and leadership hiring.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/80">
          {quickLinks.map((item) => (
            isLinkItem(item) ? (
              <Link key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ) : (
              <button
                key={item.target}
                type="button"
                onClick={() => handleNavClick(item.target)}
                className="transition hover:text-white"
              >
                {item.label}
              </button>
            )
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <a
            href="https://www.linkedin.com/in/werkly-consulting-35603b3ba/"
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-white/12 px-4 py-2 text-white/80 transition hover:border-white/25 hover:text-white"
          >
            LinkedIn
          </a>
          <a
            href="https://www.instagram.com/werklyconsulting/"
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-white/12 px-4 py-2 text-white/80 transition hover:border-white/25 hover:text-white"
          >
            Instagram
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-white/80">
          <a href="tel:+917036797909" className="transition hover:text-white">
            Phone: +91 7036797909
          </a>
          <a
            href="https://wa.me/917036797909"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-white"
          >
            WhatsApp: Chat on WhatsApp
          </a>
        </div>
      </div>
    </footer>
  );
}
