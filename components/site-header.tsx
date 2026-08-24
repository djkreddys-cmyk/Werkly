"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { EnquiryModal } from "@/components/enquiry-modal";

const navItems = [
  { label: "About", href: "/about" },
  { label: "Jobs", href: "/jobs" },
  { label: "Services", href: "/services" },
  { label: "Career Guides", href: "/career-guides" },
  { label: "Contact", href: "/contact" },
  { label: "Resume Builder", target: "resume-builder" },
];

function isLinkItem(
  item: (typeof navItems)[number]
): item is { label: string; href: string } {
  return "href" in item;
}

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const isAdminHost = () =>
    typeof window !== "undefined" && window.location.hostname === "admin.werkly.in";

  const handleNavClick = (target: string) => {
    if (typeof window === "undefined") return;
    if (isAdminHost()) {
      window.location.assign(`https://www.werkly.in/#${target}`);
      return;
    }
    if (pathname !== "/") {
      router.push(`/#${target}`);
      return;
    }
    const nextUrl = `${window.location.pathname}#${target}`;
    window.history.pushState(null, "", nextUrl);
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLogoClick = () => {
    if (typeof window === "undefined") return;
    if (isAdminHost()) {
      window.location.assign("https://www.werkly.in/");
      return;
    }
    if (pathname !== "/") {
      router.push("/");
      return;
    }
    window.history.pushState(null, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[rgba(8,96,108,0.94)] backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] w-full max-w-[92rem] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <button type="button" onClick={handleLogoClick} className="flex items-center">
          <Image
            src="/Werkly Logo.png"
            alt="Werkly logo"
            width={640}
            height={176}
            className="h-[136px] w-auto object-contain"
            priority
          />
        </button>
        <nav className="hidden items-center gap-5 text-xs font-medium uppercase tracking-[0.13em] text-white/78 lg:flex xl:gap-7">
          {navItems.map((item) => (
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
        </nav>
        <details className="relative ml-auto lg:hidden">
          <summary className="cursor-pointer list-none rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">
            Menu
          </summary>
          <div className="absolute right-0 top-12 z-50 grid min-w-56 gap-1 rounded-2xl border border-[var(--color-line)] bg-white p-2 text-sm font-medium text-[var(--color-ink)] shadow-xl">
            {navItems.map((item) =>
              isLinkItem(item) ? (
                <Link key={item.href} href={item.href} className="rounded-xl px-4 py-3 hover:bg-slate-50">
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.target}
                  type="button"
                  onClick={() => handleNavClick(item.target)}
                  className="rounded-xl px-4 py-3 text-left hover:bg-slate-50"
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </details>
        <EnquiryModal />
      </div>
    </header>
  );
}
