"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EnquiryModal } from "@/components/enquiry-modal";

const navItems = [
  { label: "About", href: "/about" },
  { label: "Jobs", href: "/jobs" },
  { label: "Services", href: "/services" },
  { label: "Career Guides", href: "/career-guides" },
  { label: "Contact", href: "/contact" },
  { label: "Resume Builder", target: "resume-builder" },
];

function isLinkItem(item: (typeof navItems)[number]): item is { label: string; href: string } {
  return "href" in item;
}
export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  const handleNavClick = (target: string) => {
    setMobileOpen(false);
    if (typeof window === "undefined") return;
    if (window.location.hostname === "admin.werkly.in") {
      window.location.assign(`https://www.werkly.in/#${target}`);
      return;
    }
    if (pathname !== "/") {
      router.push(`/#${target}`);
      return;
    }
    window.history.pushState(null, "", `${window.location.pathname}#${target}`);
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[rgba(7,72,82,0.96)] shadow-[0_10px_30px_rgba(7,45,52,0.12)] backdrop-blur-xl">
      <div className="section-shell flex h-[72px] items-center gap-3">
        <Link href="/" aria-label="Werkly Consulting home" className="shrink-0">
          <Image
            src="/Werkly Logo.png"
            alt="Werkly Consulting"
            width={640}
            height={176}
            className="h-11 w-auto object-contain sm:h-12"
            priority
          />
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) =>
            isLinkItem(item) ? (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2 text-[0.78rem] font-semibold tracking-[0.03em] transition xl:px-4 ${
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "bg-white/10 text-white"
                    : "text-white/72 hover:bg-white/7 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.target}
                type="button"
                onClick={() => handleNavClick(item.target)}
                className="rounded-xl px-3 py-2 text-[0.78rem] font-semibold tracking-[0.03em] text-white/72 transition hover:bg-white/7 hover:text-white xl:px-4"
              >
                {item.label}
              </button>
            )
          )}
        </nav>

        <div className="ml-auto lg:ml-3">
          <EnquiryModal
            triggerLabel="Enquire"
            triggerClassName="inline-flex items-center justify-center rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-bold text-[#17353d] shadow-sm transition hover:bg-[#f6b762] sm:px-5"
          />
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((current) => !current)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/18 text-white lg:hidden"
        >
          <span className="sr-only">Menu</span>
          <span className="grid gap-1.5" aria-hidden="true">
            <span className={`block h-0.5 w-5 bg-current transition ${mobileOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 bg-current transition ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-current transition ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </span>
        </button>
      </div>

      {mobileOpen ? (
        <nav className="border-t border-white/10 bg-[#074852] px-4 py-3 lg:hidden" aria-label="Mobile navigation">
          <div className="mx-auto grid max-w-[92rem] grid-cols-2 gap-2">
            {navItems.map((item) =>
              isLinkItem(item) ? (
                <Link key={item.href} href={item.href} className="rounded-xl px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/8 hover:text-white">
                  {item.label}
                </Link>
              ) : (
                <button key={item.target} type="button" onClick={() => handleNavClick(item.target)} className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-white/85 hover:bg-white/8 hover:text-white">
                  {item.label}
                </button>
              )
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
