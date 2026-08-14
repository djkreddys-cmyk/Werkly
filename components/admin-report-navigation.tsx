"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const reportSections = [
  { href: "/admin/reports", label: "Executive" },
  { href: "/admin/reports/jobs", label: "Jobs" },
  { href: "/admin/reports/candidates", label: "Candidates" },
  { href: "/admin/reports/clients", label: "Clients" },
  { href: "/admin/reports/hr", label: "HR" },
  { href: "/admin/reports/aging", label: "Exceptions" },
  { href: "/admin/reports/trends", label: "Trends" },
];

export function AdminReportNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Report sections"
      className="overflow-x-auto border border-[var(--color-line)] bg-white"
    >
      <div className="flex min-w-max items-center">
        {reportSections.map((section) => {
          const isActive =
            section.href === "/admin/reports"
              ? pathname === section.href
              : pathname === section.href || pathname.startsWith(`${section.href}/`);

          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={isActive ? "page" : undefined}
              className={`border-r border-[var(--color-line)] px-4 py-3 text-sm font-semibold transition last:border-r-0 ${
                isActive
                  ? "bg-[var(--color-dark)] text-white"
                  : "text-[var(--color-muted)] hover:bg-[rgba(8,96,108,0.05)] hover:text-[var(--color-ink)]"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
