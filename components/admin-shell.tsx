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

const menuItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/candidates", label: "Candidates" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/leaves", label: "Leaves" },
  { href: "/admin/reports", label: "Reports" },
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
  const accountPillTone =
    authType === "employee"
      ? "border-[rgba(255,255,255,0.14)] bg-white/10 text-white/84"
      : "border-[rgba(241,166,75,0.42)] bg-[rgba(241,166,75,0.16)] text-white";

  const visibleMenuItems =
    authType === "admin" || authRole === "super-admin"
      ? menuItems
      : menuItems.filter((item) => item.href !== "/admin/employees");

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
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-[rgba(8,96,108,0.12)] bg-[radial-gradient(circle_at_top,rgba(241,166,75,0.18),transparent_24%),linear-gradient(180deg,#0b5964_0%,#083f47_100%)] text-white lg:min-h-screen lg:w-[310px] lg:border-b-0 lg:border-r lg:border-r-[rgba(255,255,255,0.08)]">
          <div className="sticky top-0 px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4 lg:block">
              <div>
                <Link href="/admin" className="inline-flex items-center">
                  <Image
                    src="/Werkly Logo.png"
                    alt="Werkly logo"
                    width={640}
                    height={176}
                    className="h-16 w-auto object-contain sm:h-20"
                    priority
                  />
                </Link>
                <div className="mt-4 hidden lg:block">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                    Werkly CRM
                  </p>
                  <p className="mt-3 max-w-[220px] text-sm leading-6 text-white/72">
                    Internal hiring operations with role-based access, recruiter visibility, and cleaner daily workflows.
                  </p>
                </div>
              </div>

              <Link
                href="https://www.werkly.in"
                className="hidden rounded-xl border border-white/14 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--color-accent)] hover:bg-white/12 lg:inline-flex"
              >
                Open Website
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="hidden rounded-xl border border-white/14 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--color-accent)] hover:bg-white/12 lg:inline-flex"
              >
                Sign Out
              </button>
            </div>

            <div className="mt-6 hidden rounded-[1.7rem] border border-white/10 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:block">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(241,166,75,0.18)] text-sm font-semibold tracking-[0.12em] text-[var(--color-accent)]">
                  {getInitials(authName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{authName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/52">
                    Logged In Account
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${accountPillTone}`}
                >
                  {displayRole}
                </span>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/74">
                  Auto logout 10 min
                </span>
              </div>
              <p className="mt-4 break-all text-sm leading-6 text-white/76">
                {displayIdentifier}
              </p>
            </div>

            <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible">
              {visibleMenuItems.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`min-w-fit rounded-2xl px-4 py-3 text-sm font-semibold transition lg:w-full ${
                      isActive
                        ? "border border-[rgba(241,166,75,0.22)] bg-[linear-gradient(135deg,#f1a64b_0%,#f6bf71_100%)] text-[var(--color-ink)] shadow-[0_18px_36px_rgba(241,166,75,0.22)]"
                        : "border border-white/10 bg-white/6 text-white/84 hover:border-white/18 hover:bg-white/10"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span>{item.label}</span>
                      {isActive ? (
                        <span className="rounded-full bg-white/42 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)]">
                          Open
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="flex-1">
          <header className="border-b border-[rgba(8,96,108,0.12)] bg-white/84 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-6 sm:px-8 xl:flex-row xl:items-center xl:justify-between">
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

              <div className="flex flex-col gap-3 xl:min-w-[360px] xl:items-end">
                <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[var(--color-line)] bg-[linear-gradient(180deg,#ffffff_0%,#faf6f0_100%)] p-4 shadow-[0_16px_38px_rgba(15,47,54,0.08)] sm:flex-row sm:items-center sm:justify-between xl:w-full">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
                      Signed In As
                    </p>
                    <p className="mt-1 truncate text-base font-semibold text-[var(--color-ink)]">
                      {authName}
                    </p>
                    <p className="mt-1 truncate text-sm text-[var(--color-muted)]">
                      {displayIdentifier}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[rgba(8,96,108,0.12)] bg-[rgba(8,96,108,0.05)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
                      {displayRole}
                    </span>
                    <span className="rounded-full border border-[rgba(190,72,26,0.12)] bg-[rgba(190,72,26,0.06)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-strong)]">
                      Live session
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="https://www.werkly.in"
                    className="inline-flex rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
                  >
                    Open Website
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex rounded-xl bg-[var(--color-dark)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
