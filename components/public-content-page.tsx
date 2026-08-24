import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function PublicContentPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="public-site min-h-screen bg-[var(--color-paper)]">
      <SiteHeader />
      <main className="pt-[72px]">
        <header className="public-page-hero">
          <div className="section-shell py-12 sm:py-16 lg:py-20">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-4 max-w-4xl font-[family-name:var(--font-display)] text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--color-ink)] sm:text-5xl lg:text-[3.6rem]">
              {title}
            </h1>
            <p className="muted-copy mt-5 max-w-3xl text-base leading-8 sm:text-lg lg:text-xl">{intro}</p>
          </div>
        </header>
        <div className="section-shell py-10 sm:py-14 lg:py-16">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function ContentSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-[var(--color-line)] py-8 first:pt-0 last:border-0 last:pb-0 sm:py-10">
      <h2 className="text-2xl font-semibold leading-snug tracking-[-0.025em] text-[var(--color-ink)] sm:text-[2rem]">
        {title}
      </h2>
      <div className="content-copy mt-4 space-y-4 text-base leading-8 text-[var(--color-muted)]">
        {children}
      </div>
    </section>
  );
}

export function RelatedLinks({
  title = "Continue exploring",
  links,
}: {
  title?: string;
  links: { href: string; label: string; description: string }[];
}) {
  return (
    <aside className="mt-12 border-t border-[var(--color-line)] pt-8">
      <h2 className="text-xl font-semibold text-[var(--color-ink)]">{title}</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-2xl border border-[var(--color-line)] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,47,54,0.05)] transition hover:-translate-y-0.5 hover:border-[rgba(8,96,108,0.28)] hover:shadow-[0_14px_34px_rgba(15,47,54,0.09)]"
          >
            <span className="font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-dark)]">{link.label} →</span>
            <span className="mt-1 block text-sm leading-6 text-[var(--color-muted)]">
              {link.description}
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
