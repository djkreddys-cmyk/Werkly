"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const companyLinks = [
  { label: "About Werkly", href: "/about" },
  { label: "Recruitment Services", href: "/services" },
  { label: "Contact", href: "/contact" },
];

const policyLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Editorial Policy", href: "/editorial-policy" },
];

export function SiteFooter() {
  const router = useRouter();
  const pathname = usePathname();

  const openSection = (target: string) => {
    if (pathname !== "/") {
      router.push(`/#${target}`);
      return;
    }
    window.history.pushState(null, "", `${window.location.pathname}#${target}`);
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer className="bg-[#073f48] text-white">
      <div className="section-shell py-12 sm:py-14">
        <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-2 lg:grid-cols-[1.45fr_0.8fr_0.8fr_1fr]">
          <div className="max-w-md">
            <Image src="/Werkly Logo.png" alt="Werkly Consulting" width={640} height={176} className="h-14 w-auto object-contain" />
            <p className="mt-5 text-sm leading-7 text-white/68">
              Structured IT and Non-IT recruitment support for technology, engineering,
              operations, commercial, and leadership teams across India.
            </p>
            <p className="mt-4 text-xs leading-6 text-white/50">
              Werkly does not charge candidates to obtain an interview or job offer.
            </p>
          </div>

          <FooterColumn title="Company" links={companyLinks} />

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">Candidates</p>
            <div className="mt-4 grid gap-3 text-sm text-white/72">
              <Link href="/jobs" className="transition hover:text-white">Current Jobs</Link>
              <Link href="/career-guides" className="transition hover:text-white">Career Guides</Link>
              <button type="button" onClick={() => openSection("resume-builder")} className="text-left transition hover:text-white">Resume Builder</button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">Connect</p>
            <div className="mt-4 grid gap-3 text-sm text-white/72">
              <a href="mailto:hr@werkly.in" className="transition hover:text-white">hr@werkly.in</a>
              <a href="tel:+917036797909" className="transition hover:text-white">+91 70367 97909</a>
              <a href="https://wa.me/917036797909" target="_blank" rel="noreferrer" className="transition hover:text-white">WhatsApp</a>
              <div className="mt-2 flex gap-2">
                <a href="https://www.linkedin.com/in/werkly-consulting-35603b3ba/" target="_blank" rel="noreferrer" className="rounded-lg border border-white/14 px-3 py-2 text-xs font-semibold hover:border-white/30 hover:text-white">LinkedIn</a>
                <a href="https://www.instagram.com/werklyconsulting/" target="_blank" rel="noreferrer" className="rounded-lg border border-white/14 px-3 py-2 text-xs font-semibold hover:border-white/30 hover:text-white">Instagram</a>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-6 text-xs text-white/48 lg:flex-row lg:items-center lg:justify-between">
          <p>© {new Date().getFullYear()} Werkly Consulting Pvt LTD. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {policyLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-white">{link.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">{title}</p>
      <div className="mt-4 grid gap-3 text-sm text-white/72">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="transition hover:text-white">{link.label}</Link>
        ))}
      </div>
    </div>
  );
}
