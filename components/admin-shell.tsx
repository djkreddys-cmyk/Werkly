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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(241,166,75,0.16),transparent_16%),linear-gradient(180deg,#075560_0%,#083f48_34%,#f4efe7_34%,#f8f4ee_100%)]">
      <header className="border-b border-[rgba(255,255,255,0.08)] bg-[rgba(7,70,79,0.9)] backdrop-blur">
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                Werkly CRM
              </p>
              <p className="mt-1 text-sm text-white/72">
                Internal hiring operations workspace
              </p>
            </div>
          </div>

          <Link
            href="https://www.werkly.in"
            className="inline-flex items-center justify-center rounded-xl border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.1)] px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--color-accent)] hover:bg-[rgba(255,255,255,0.16)]"
          >
            Open Website
          </Link>
        </div>
      </header>

      <main>
        <section className="section-shell py-12 sm:py-16">
          <div className="mb-10 max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/74 sm:text-lg">
              {description}
            </p>
          </div>
          {children}
        </section>
      </main>
    </div>
  );
}
