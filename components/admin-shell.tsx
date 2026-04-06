"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

type AdminShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AdminShell({
  eyebrow,
  title,
  description,
  children,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(8,96,108,0.08),rgba(255,255,255,0)_22%),var(--color-paper)]">
      <header className="border-b border-[rgba(8,96,108,0.12)] bg-white/92 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Image
              src="/Werkly Logo.png"
              alt="Werkly logo"
              width={640}
              height={176}
              className="h-12 w-auto object-contain"
              priority
            />
            <div className="hidden sm:block">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-strong)]">
                Werkly CRM
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Internal hiring operations workspace
              </p>
            </div>
          </div>

          <Link
            href="https://www.werkly.in"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[rgba(8,96,108,0.2)] hover:text-[var(--color-dark)]"
          >
            Open Website
          </Link>
        </div>
      </header>

      <main>
        <section className="section-shell py-12 sm:py-16">
          <div className="mb-10 max-w-3xl">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-[var(--color-ink)] sm:text-5xl">
              {title}
            </h1>
            <p className="muted-copy mt-5 text-base leading-8 sm:text-lg">
              {description}
            </p>
          </div>
          {children}
        </section>
      </main>
    </div>
  );
}
