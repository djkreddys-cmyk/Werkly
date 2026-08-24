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
    <div className="min-h-screen bg-[var(--color-paper)]">
      <SiteHeader />
      <main className="pt-[76px]">
        <header className="hero-surface border-b border-[var(--color-line)]">
          <div className="section-shell py-14 sm:py-20">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-4 max-w-4xl font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight text-[var(--color-ink)] sm:text-5xl">
              {title}
            </h1>
            <p className="muted-copy mt-5 max-w-3xl text-base leading-8 sm:text-lg">{intro}</p>
          </div>
        </header>
        <div className="section-shell py-12 sm:py-16">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function ContentSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[var(--color-line)] py-8 first:pt-0 last:border-0 last:pb-0">
      <h2 className="text-2xl font-semibold leading-snug text-[var(--color-ink)] sm:text-3xl">
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
    <aside className="mt-10 border-t border-[var(--color-line)] pt-8">
      <h2 className="text-xl font-semibold text-[var(--color-ink)]">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="border-l-2 border-[var(--color-accent)] bg-white px-5 py-4 transition hover:bg-[rgba(8,96,108,0.04)]"
          >
            <span className="font-semibold text-[var(--color-ink)]">{link.label}</span>
            <span className="mt-1 block text-sm leading-6 text-[var(--color-muted)]">
              {link.description}
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}

