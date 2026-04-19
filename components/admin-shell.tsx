"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";

type AdminShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  showMenu?: boolean;
};

const moduleSections = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/admin",
    description: "Overview and daily pulse",
    items: [] as Array<{ href: string; label: string }>,
  },
  {
    key: "hr",
    label: "HR Module",
    href: "/admin/employees",
    description: "Employees, leaves, attendance",
    items: [
      { href: "/admin/employees", label: "Employee Creation" },
      { href: "/admin/leaves", label: "Leave Types & Access" },
      { href: "/admin/reports", label: "Attendance & Reports" },
    ],
  },
  {
    key: "jobs",
    label: "Jobs Module",
    href: "/admin/jobs",
    description: "Jobs, candidates, clients",
    items: [
      { href: "/admin/jobs", label: "Jobs" },
      { href: "/admin/candidates", label: "Candidates" },
      { href: "/admin/clients", label: "Clients" },
    ],
  },
];

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

function formatRoleLabel(role: string) {
  if (!role) {
    return "Internal User";
  }

  return role
    .split("-")
    .join(" ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "WK";
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function getActiveModuleKey(pathname: string) {
  if (pathname.startsWith("/admin/employees") || pathname.startsWith("/admin/leaves") || pathname.startsWith("/admin/reports")) {
    return "hr";
  }

  if (pathname.startsWith("/admin/jobs") || pathname.startsWith("/admin/candidates") || pathname.startsWith("/admin/clients")) {
    return "jobs";
  }

  return "dashboard";
}

export function AdminShell({
  eyebrow,
  title,
  description,
  children,
  showMenu = true,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [authType] = useState(() =>
    typeof window === "undefined"
      ? "admin"
      : window.localStorage.getItem("werklyAuthType") ?? "admin"
  );
  const [authRole] = useState(() =>
    typeof window === "undefined"
      ? "super-admin"
      : window.localStorage.getItem("werklyAuthRole") ?? "super-admin"
  );
  const [authName] = useState(() =>
    typeof window === "undefined"
      ? "Werkly User"
      : window.localStorage.getItem("werklyAuthName") ?? "Werkly User"
  );
  const [authIdentifier] = useState(() =>
    typeof window === "undefined"
      ? "hr@werkly.in"
      : window.localStorage.getItem("werklyAdminEmail") ?? "hr@werkly.in"
  );
  const [authEmployeeCode] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem("werklyEmployeeCode") ?? ""
  );
  const logoutTimerRef = useRef<number | null>(null);
  const logoutHandlerRef = useRef<() => Promise<void>>(async () => {});
  const displayIdentifier = authEmployeeCode || authIdentifier;
  const displayRole =
    authType === "employee" ? formatRoleLabel(authRole || "employee") : "Super Admin";
  const activeModuleKey = getActiveModuleKey(pathname);
  const visibleSections = moduleSections.map((section) => {
    if (section.key !== "hr") {
      return section;
    }

    if (authType === "admin" || authRole === "super-admin") {
      return section;
    }

    return {
      ...section,
      items: section.items.filter((item) => item.href !== "/admin/employees"),
      href: "/admin/leaves",
    };
  });
  const activeSection =
    visibleSections.find((section) => section.key === activeModuleKey) ?? visibleSections[0];

  async function handleLogout() {
    const token =
      typeof window === "undefined"
        ? ""
        : window.localStorage.getItem("werklyAdminToken") ?? "";

    try {
      if (token) {
        const clientTime = new Date();
        await fetch("/api/admin/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            clientTime: clientTime.toISOString(),
            clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            clientUtcOffsetMinutes: -clientTime.getTimezoneOffset(),
          }),
        });
      }
    } catch {
      // Clear local session even if the logout audit call fails.
    } finally {
      window.localStorage.removeItem("werklyAdminToken");
      window.localStorage.removeItem("werklyAdminEmail");
      window.localStorage.removeItem("werklyAuthType");
      window.localStorage.removeItem("werklyAuthName");
      window.localStorage.removeItem("werklyAuthRole");
      window.localStorage.removeItem("werklyEmployeeCode");
      router.push("/admin/login");
      router.refresh();
    }
  }

  useEffect(() => {
    logoutHandlerRef.current = handleLogout;
  });

  useEffect(() => {
    if (!showMenu || typeof window === "undefined") {
      return;
    }

    const token = window.localStorage.getItem("werklyAdminToken") ?? "";
    if (!token) {
      return;
    }

    const resetLogoutTimer = () => {
      if (logoutTimerRef.current) {
        window.clearTimeout(logoutTimerRef.current);
      }

      logoutTimerRef.current = window.setTimeout(() => {
        void logoutHandlerRef.current();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];

    resetLogoutTimer();
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetLogoutTimer, { passive: true });
    });

    return () => {
      if (logoutTimerRef.current) {
        window.clearTimeout(logoutTimerRef.current);
      }

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetLogoutTimer);
      });
    };
  }, [pathname, showMenu]);

  if (!showMenu) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(241,166,75,0.16),transparent_18%),linear-gradient(180deg,#08606c_0%,#0a4f59_100%)] px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
          <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="hidden rounded-[2rem] border border-white/10 bg-white/8 p-10 text-white shadow-[0_30px_80px_rgba(4,22,27,0.24)] backdrop-blur lg:block">
              <Link href="/admin/login" className="inline-flex items-center">
                <Image
                  src="/Werkly Logo.png"
                  alt="Werkly logo"
                  width={640}
                  height={176}
                  className="h-16 w-auto object-contain"
                  priority
                />
              </Link>
              <p className="mt-10 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                {eyebrow}
              </p>
              <h1 className="mt-4 text-5xl font-semibold leading-tight text-white">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/76">
                {description}
              </p>
            </div>

            <div className="rounded-[2rem] border border-[rgba(255,255,255,0.12)] bg-white/96 p-6 shadow-[0_24px_70px_rgba(4,22,27,0.18)] sm:p-8">
              <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
                <Link href="/admin/login" className="inline-flex items-center">
                  <Image
                    src="/Werkly Logo.png"
                    alt="Werkly logo"
                    width={640}
                    height={176}
                    className="h-14 w-auto object-contain"
                    priority
                  />
                </Link>
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(8,96,108,0.12),transparent_18%),radial-gradient(circle_at_top_right,rgba(241,166,75,0.16),transparent_22%),linear-gradient(180deg,#fffdf8_0%,#f4efe7_52%,#f9f5ef_100%)]">
      <div className="min-h-screen">
        <header className="border-b border-[rgba(8,96,108,0.12)] bg-[linear-gradient(180deg,rgba(11,89,100,0.96),rgba(8,63,71,0.98))] text-white shadow-[0_18px_48px_rgba(10,36,41,0.16)]">
          <div className="mx-auto w-full max-w-[1800px] px-5 py-5 sm:px-8">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between xl:min-w-[420px]">
                  <div>
                    <Link href="/admin" className="inline-flex items-center">
                      <Image
                        src="/Werkly Logo.png"
                        alt="Werkly logo"
                        width={640}
                        height={176}
                        className="h-14 w-auto object-contain sm:h-16"
                        priority
                      />
                    </Link>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                      Werkly CRM Modules
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(241,166,75,0.18)] text-sm font-semibold tracking-[0.12em] text-[var(--color-accent)]">
                    {getInitials(authName)}
                  </div>
                </div>

                <div className="flex flex-col gap-3 xl:min-w-[420px] xl:items-end">
                  <div className="flex w-full flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
                        Logged In Account
                      </p>
                      <p className="mt-1 truncate text-base font-semibold text-white">
                        {authName}
                      </p>
                      <p className="mt-1 truncate text-sm text-white/74">{displayIdentifier}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-[rgba(241,166,75,0.42)] bg-[rgba(241,166,75,0.16)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                        {displayRole}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/74">
                        Auto logout 10 min
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="https://www.werkly.in"
                      className="inline-flex rounded-xl border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--color-accent)] hover:bg-white/12"
                    >
                      Open Website
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                {visibleSections.map((section) => {
                  const isActive = section.key === activeModuleKey;

                  return (
                    <Link
                      key={section.key}
                      href={section.href}
                      className={`rounded-[1.45rem] border p-4 transition ${
                        isActive
                          ? "border-[rgba(241,166,75,0.28)] bg-[linear-gradient(135deg,rgba(241,166,75,0.94),rgba(246,191,113,0.92))] text-[var(--color-ink)] shadow-[0_18px_36px_rgba(241,166,75,0.18)]"
                          : "border-white/10 bg-white/6 text-white hover:border-white/18 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold">{section.label}</p>
                          <p
                            className={`mt-2 text-sm leading-6 ${
                              isActive ? "text-[rgba(23,53,61,0.78)]" : "text-white/68"
                            }`}
                          >
                            {section.description}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                            isActive
                              ? "bg-white/42 text-[var(--color-ink)]"
                              : "bg-white/10 text-white/76"
                          }`}
                        >
                          {isActive ? "Open" : "Module"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {activeSection.items.length ? (
                <nav className="flex flex-wrap gap-3">
                  {activeSection.items.map((item) => {
                    const isActive =
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "bg-white text-[var(--color-ink)] shadow-[0_12px_24px_rgba(15,23,42,0.12)]"
                            : "border border-white/10 bg-white/6 text-white/84 hover:border-white/18 hover:bg-white/10"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1800px] px-5 py-8 sm:px-8 sm:py-10">
          <section className="accent-card overflow-hidden">
            <div className="border-b border-[var(--color-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(250,246,239,0.76))] px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-strong)]">
                  {eyebrow}
                </p>
                <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                  {description}
                </p>
              </div>

                <div className="flex flex-wrap gap-2 xl:max-w-[360px] xl:justify-end">
                  <span className="rounded-full border border-[rgba(8,96,108,0.12)] bg-[rgba(8,96,108,0.05)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
                    {activeSection.label}
                  </span>
                  <span className="rounded-full border border-[rgba(190,72,26,0.12)] bg-[rgba(190,72,26,0.06)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-strong)]">
                    {displayRole}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-8 sm:px-8 sm:py-10">{children}</div>
          </section>
        </main>
      </div>
    </div>
  );
}
