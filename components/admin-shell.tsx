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
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutHandlerRef = useRef<() => Promise<void>>(async () => {});

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f4ee_0%,#f4efe7_100%)]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-[rgba(8,96,108,0.12)] bg-[linear-gradient(180deg,#08606c_0%,#0a4f59_100%)] text-white lg:min-h-screen lg:w-[280px] lg:border-b-0 lg:border-r lg:border-r-[rgba(255,255,255,0.08)]">
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
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Internal hiring operations, job publishing, onboarding, and follow-up tracking.
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
                        ? "bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[0_10px_24px_rgba(241,166,75,0.22)]"
                        : "border border-white/10 bg-white/6 text-white/84 hover:border-white/18 hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="flex-1">
          <header className="border-b border-[rgba(8,96,108,0.12)] bg-white/88 backdrop-blur">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-6 sm:px-8">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent-strong)]">
                  {eyebrow}
                </p>
                <h1 className="mt-3 text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                  {description}
                </p>
              </div>

              <Link
                href="https://www.werkly.in"
                className="inline-flex rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent-strong)] lg:hidden"
              >
                Website
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
              >
                Sign Out
              </button>
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
