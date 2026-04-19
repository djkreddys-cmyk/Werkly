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
    key: "hr",
    label: "HR",
    href: "/admin/employees",
    description: "Employees, leaves, attendance",
    items: [
      { href: "/admin/employees/new", label: "Employee Creation" },
      { href: "/admin/employees/existing", label: "Existing Employees" },
      { href: "/admin/leaves", label: "Leave Types & Access" },
      { href: "/admin/reports", label: "Attendance & Reports" },
    ],
  },
  {
    key: "jobs",
    label: "Jobs",
    href: "/admin/jobs",
    description: "Job creation and existing jobs",
    items: [
      { href: "/admin/jobs/new", label: "New Job" },
      { href: "/admin/jobs/existing", label: "Existing Jobs" },
    ],
  },
  {
    key: "candidates",
    label: "Candidates",
    href: "/admin/candidates",
    description: "Job applicants and website enquiries",
    items: [
      { href: "/admin/candidates", label: "Job Applicants" },
      { href: "/admin/candidate-enquiries", label: "Candidate Enquiries" },
    ],
  },
  {
    key: "clients",
    label: "Clients",
    href: "/admin/clients",
    description: "Client onboarding and existing clients",
    items: [
      { href: "/admin/clients/new", label: "New Client" },
      { href: "/admin/clients/existing", label: "Existing Clients" },
    ],
  },
];

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 10H16.5M10 3C11.9 5.1 12.98 7.53 13.04 10C12.98 12.47 11.9 14.9 10 17M10 3C8.1 5.1 7.02 7.53 6.96 10C7.02 12.47 8.1 14.9 10 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M7.5 4.5H6.5C5.39543 4.5 4.5 5.39543 4.5 6.5V13.5C4.5 14.6046 5.39543 15.5 6.5 15.5H7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M11 6L14.5 9.5L11 13M14.5 9.5H8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

  if (pathname.startsWith("/admin/jobs")) {
    return "jobs";
  }

  if (pathname.startsWith("/admin/candidates") || pathname.startsWith("/admin/candidate-enquiries")) {
    return "candidates";
  }

  if (pathname.startsWith("/admin/clients")) {
    return "clients";
  }

  return "hr";
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
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [expandedModuleKey, setExpandedModuleKey] = useState<string | null>(null);
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

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setExpandedModuleKey(activeModuleKey);
  }, [activeModuleKey]);

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
    if (typeof window === "undefined") {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const closeMenus = () => {
      setExpandedModuleKey(null);
      setIsProfileMenuOpen(false);
    };

    window.addEventListener("resize", closeMenus);
    return () => window.removeEventListener("resize", closeMenus);
  }, []);

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

  if (!isHydrated) {
    return (
      <div className="crm-shell-bg min-h-screen">
        <div className="min-h-screen">
          <header className="crm-topbar text-white">
            <div className="mx-auto w-full max-w-[1800px] px-5 py-4 sm:px-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-5 lg:gap-8">
                  <div className="flex items-center">
                    <Link href="/admin" className="inline-flex h-16 items-center overflow-visible sm:h-20">
                        <Image
                          src="/Werkly Logo.png"
                          alt="Werkly logo"
                          width={640}
                          height={176}
                          className="h-[104px] w-auto max-w-none object-contain sm:h-[120px]"
                          priority
                        />
                      </Link>
                  </div>
                </div>
              </div>
            </div>
          </header>

        <main className="mx-auto w-full max-w-[1800px] px-5 py-6 sm:px-8 sm:py-8">
          <section className="crm-panel overflow-hidden">
            <div className="crm-page-header border-b border-[var(--color-line)] px-6 py-6 sm:px-8">
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
                </div>
              </div>

              <div className="px-5 py-8 sm:px-8 sm:py-10">{children}</div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-shell-bg min-h-screen">
      <div className="min-h-screen">
        <header className="crm-topbar text-white">
          <div className="mx-auto w-full max-w-[1800px] px-5 py-4 sm:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-4 lg:gap-8 xl:min-w-[620px]">
                <div className="flex items-center gap-4">
                  <Link href="/admin" className="inline-flex h-16 items-center overflow-visible sm:h-20">
                    <Image
                      src="/Werkly Logo.png"
                      alt="Werkly logo"
                      width={640}
                      height={176}
                      className="h-[104px] w-auto max-w-none object-contain sm:h-[120px]"
                      priority
                    />
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {visibleSections.map((section) => {
                    const isActive = section.key === activeModuleKey;
                    const isExpanded = expandedModuleKey === section.key;

                    return (
                      <div key={section.key} className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setExpandedModuleKey((current) =>
                              current === section.key ? null : section.key
                            );
                          }}
                          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                            isActive
                              ? "border-[rgba(241,166,75,0.35)] bg-[rgba(241,166,75,0.92)] text-[var(--color-ink)] shadow-[0_10px_22px_rgba(241,166,75,0.16)]"
                              : "border-white/12 bg-[rgba(255,255,255,0.06)] text-white hover:border-[rgba(241,166,75,0.32)] hover:bg-[rgba(255,255,255,0.11)]"
                          }`}
                        >
                          <span>{section.label}</span>
                          <ChevronDownIcon
                            className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>

                        {section.items.length && isExpanded ? (
                          <div className="absolute left-0 top-full z-30 mt-3 min-w-[220px] overflow-hidden rounded-[1rem] border border-[rgba(255,255,255,0.14)] bg-[linear-gradient(180deg,rgba(9,68,76,0.99),rgba(7,52,59,0.99))] p-2 shadow-[0_22px_44px_rgba(3,18,22,0.34)] backdrop-blur">
                            {section.items.map((item) => {
                              const isItemActive =
                                item.href === "/admin"
                                  ? pathname === "/admin"
                                  : pathname.startsWith(item.href);

                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  className={`block rounded-xl px-4 py-3 text-sm font-semibold transition ${
                                    isItemActive
                                      ? "bg-[rgba(241,166,75,0.92)] text-[var(--color-ink)] shadow-[0_10px_20px_rgba(15,23,42,0.12)]"
                                      : "text-white/92 hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                                  }`}
                                  onClick={() => setExpandedModuleKey(null)}
                                >
                                  {item.label}
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-start xl:ml-auto xl:min-w-[420px] xl:justify-end">
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedModuleKey(null);
                      setIsProfileMenuOpen((current) => !current);
                    }}
                    className="inline-flex items-center gap-3 rounded-[1rem] border border-white/14 bg-[rgba(255,255,255,0.08)] px-3 py-2 text-left text-white transition hover:border-[rgba(241,166,75,0.48)] hover:bg-[rgba(255,255,255,0.12)]"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(241,166,75,0.18)] text-sm font-semibold tracking-[0.12em] text-[var(--color-accent)]">
                      {getInitials(authName)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{authName}</span>
                      <span className="block truncate text-xs text-white/68">
                        {displayRole}
                      </span>
                    </span>
                    <ChevronDownIcon
                      className={`h-4 w-4 text-white/76 transition ${
                        isProfileMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isProfileMenuOpen ? (
                    <div className="absolute right-0 z-30 mt-3 w-[320px] overflow-hidden rounded-[1.15rem] border border-white/12 bg-[linear-gradient(180deg,rgba(9,68,76,0.99),rgba(7,52,59,0.99))] p-4 text-white shadow-[0_24px_60px_rgba(5,24,28,0.34)] backdrop-blur">
                      <div className="rounded-[1rem] border border-white/10 bg-white/7 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
                          Login Details
                        </p>
                        <p className="mt-2 text-base font-semibold text-white">{authName}</p>
                        <p className="mt-1 text-sm text-white/72">{displayIdentifier}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-[rgba(241,166,75,0.42)] bg-[rgba(241,166,75,0.16)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                            {displayRole}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/7 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/74">
                            Auto logout 10 min
                          </span>
                        </div>
                      </div>

                        <div className="mt-4 grid gap-2">
                          <Link
                            href="https://www.werkly.in"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-between rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:border-[rgba(241,166,75,0.48)] hover:bg-[rgba(255,255,255,0.12)] hover:text-[var(--color-accent)]"
                          >
                            <span>Visit Website</span>
                            <GlobeIcon className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex items-center justify-between rounded-xl border border-[rgba(241,166,75,0.24)] bg-[rgba(241,166,75,0.16)] px-4 py-3 text-sm font-semibold text-white transition hover:border-[rgba(241,166,75,0.48)] hover:bg-[rgba(241,166,75,0.24)] hover:text-[var(--color-accent)]"
                          >
                            <span>Logout</span>
                            <LogoutIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1800px] px-5 py-6 sm:px-8 sm:py-8">
          <section className="crm-panel overflow-hidden">
            <div className="crm-page-header border-b border-[var(--color-line)] px-6 py-5 sm:px-8">
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
                  <span className="rounded-lg border border-[rgba(8,96,108,0.12)] bg-[rgba(8,96,108,0.06)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
                    {activeSection.label}
                  </span>
                  <span className="rounded-lg border border-[rgba(190,72,26,0.12)] bg-[rgba(190,72,26,0.06)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-strong)]">
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
