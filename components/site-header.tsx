"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { EnquiryModal } from "@/components/enquiry-modal";

const navItems = [
  { label: "Jobs", href: "/jobs" },
  { label: "Sectors", target: "expertise" },
  { label: "Process", target: "process" },
  { label: "Contact", target: "contact" },
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
        <nav className="hidden items-center gap-9 text-sm font-medium uppercase tracking-[0.16em] text-white/78 md:flex">
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
        <EnquiryModal />
      </div>
    </header>
  );
}
