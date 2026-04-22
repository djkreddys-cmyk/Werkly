"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useCrmAccessControl } from "@/hooks/use-crm-access-control";
import type { CrmModuleAccessKey } from "@/lib/access-control";
import type { ClientRecord, EmployeeRecord, NotificationLogRecord } from "@/lib/crm";
import type { JobApplication, JobSummary } from "@/lib/jobs";

type AdminShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  showMenu?: boolean;
};

const moduleSections: Array<{
  key: Extract<CrmModuleAccessKey, "hr" | "jobs" | "candidates" | "clients">;
  label: string;
  href: string;
  description: string;
  items: Array<{
    href: string;
    label: string;
  }>;
}> = [
  {
    key: "hr",
    label: "HR",
    href: "/admin/employees",
    description: "Employees, leaves, attendance",
    items: [
      { href: "/admin/employees/new", label: "Employee Creation" },
      { href: "/admin/employees/existing", label: "Existing Employees" },
      { href: "/admin/leaves", label: "Leave Types & Access" },
      { href: "/admin/reports/hr", label: "Reports" },
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
      { href: "/admin/reports/jobs", label: "Reports" },
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
      { href: "/admin/reports/candidates", label: "Reports" },
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
      { href: "/admin/reports/clients", label: "Reports" },
    ],
  },
];

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const SCREEN_IDLE_THRESHOLD_MS = 60 * 1000;
const SCREEN_HEARTBEAT_MS = 15 * 1000;

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

function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M6.5 8V6.75C6.5 4.82 8.07 3.25 10 3.25C11.93 3.25 13.5 4.82 13.5 6.75V8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect x="4.5" y="8" width="11" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 11V13.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 3.5C7.79086 3.5 6 5.29086 6 7.5V9.6C6 10.14 5.81 10.66 5.46 11.06L4.3 12.4C3.67 13.12 4.18 14.25 5.14 14.25H14.86C15.82 14.25 16.33 13.12 15.7 12.4L14.54 11.06C14.19 10.66 14 10.14 14 9.6V7.5C14 5.29086 12.2091 3.5 10 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.25 15.5C8.52 16.24 9.2 16.75 10 16.75C10.8 16.75 11.48 16.24 11.75 15.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M13.2 13.2L16.5 16.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
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
  if (
    pathname.startsWith("/admin/employees") ||
    pathname.startsWith("/admin/leaves") ||
    pathname.startsWith("/admin/reports/hr")
  ) {
    return "hr";
  }

  if (pathname.startsWith("/admin/jobs") || pathname.startsWith("/admin/reports/jobs")) {
    return "jobs";
  }

  if (
    pathname.startsWith("/admin/candidates") ||
    pathname.startsWith("/admin/candidate-enquiries") ||
    pathname.startsWith("/admin/reports/candidates")
  ) {
    return "candidates";
  }

  if (pathname.startsWith("/admin/clients") || pathname.startsWith("/admin/reports/clients")) {
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
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const searchMenuRef = useRef<HTMLDivElement | null>(null);
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
  const [token] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem("werklyAdminToken") ?? ""
  );
  const logoutTimerRef = useRef<number | null>(null);
  const logoutHandlerRef = useRef<() => Promise<void>>(async () => {});
  const lastScreenActivityRef = useRef<number>(Date.now());
  const lastScreenTickRef = useRef<number>(Date.now());
  const pendingActiveMsRef = useRef(0);
  const pendingIdleMsRef = useRef(0);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationLogRecord[]>([]);
  const [jobsIndex, setJobsIndex] = useState<JobSummary[]>([]);
  const [clientsIndex, setClientsIndex] = useState<ClientRecord[]>([]);
  const [employeesIndex, setEmployeesIndex] = useState<EmployeeRecord[]>([]);
  const [applicationsIndex, setApplicationsIndex] = useState<JobApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread">("unread");
  const [expandedModuleKey, setExpandedModuleKey] = useState<string | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profilePasswordMessage, setProfilePasswordMessage] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const { roleAccess } = useCrmAccessControl(
    token,
    authType,
    authRole,
    authEmployeeCode,
    authIdentifier
  );
  const displayIdentifier = authEmployeeCode || authIdentifier;
  const displayRole =
    authType === "employee" ? formatRoleLabel(authRole || "employee") : "Super Admin";
  const isAdminView = authType === "admin" || authRole === "super-admin";
  const activeModuleKey = getActiveModuleKey(pathname);
  const visibleSections = moduleSections.map((section) => {
    const moduleKey: Extract<CrmModuleAccessKey, "hr" | "jobs" | "candidates" | "clients"> =
      section.key;
    if (!roleAccess.modules[moduleKey]) {
      return null;
    }

    if (section.key !== "hr") {
      return {
        ...section,
        items: section.items.filter((item) => {
          if (item.href.includes("/reports/")) {
            return roleAccess.modules.reports;
          }
          if (item.href === "/admin/jobs/new") {
            return roleAccess.fields["jobs.createEdit"];
          }
          if (item.href === "/admin/candidate-enquiries") {
            return roleAccess.modules.candidates;
          }
          if (item.href === "/admin/clients/new") {
            return roleAccess.fields["clients.onboarding"];
          }

          return true;
        }),
      };
    }

    if (authType === "admin" || authRole === "super-admin") {
      return {
        ...section,
        items: section.items.filter((item) => {
          if (item.href.includes("/reports/")) {
            return roleAccess.modules.reports;
          }

          return true;
        }),
      };
    }

    return {
      ...section,
      items: section.items.filter(
        (item) =>
          item.href !== "/admin/employees" &&
          item.href !== "/admin/employees/new" &&
          item.href !== "/admin/employees/existing" &&
          (!item.href.includes("/reports/") || roleAccess.modules.reports)
      ),
      href: "/admin/leaves",
    };
  }).filter((section): section is (typeof moduleSections)[number] => Boolean(section && section.items.length > 0));
  const activeSection =
    visibleSections.find((section) => section.key === activeModuleKey) ??
    visibleSections[0] ?? {
      key: "dashboard",
      label: "Dashboard",
      href: "/admin",
      description: "CRM workspace",
      items: [],
    };

  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
          keepalive: true,
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
    if (!showMenu || typeof window === "undefined" || !isHydrated) {
      return;
    }

    const token = window.localStorage.getItem("werklyAdminToken") ?? "";
    if (!token) {
      return;
    }

    lastScreenActivityRef.current = Date.now();
    lastScreenTickRef.current = Date.now();
    pendingActiveMsRef.current = 0;
    pendingIdleMsRef.current = 0;

    const flushScreenActivity = async () => {
      const activeSeconds = Math.floor(pendingActiveMsRef.current / 1000);
      const idleSeconds = Math.floor(pendingIdleMsRef.current / 1000);

      if (activeSeconds <= 0 && idleSeconds <= 0) {
        return;
      }

      pendingActiveMsRef.current = 0;
      pendingIdleMsRef.current = 0;

      try {
        await fetch("/api/admin/activity", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            routePath: pathname,
            routeLabel: title,
            activeSeconds,
            idleSeconds,
            clientTime: new Date().toISOString(),
          }),
          keepalive: true,
        });
      } catch {
        // Ignore activity tracking failures so they do not interrupt CRM usage.
      }
    };

    const markInteraction = () => {
      lastScreenActivityRef.current = Date.now();
    };

    const captureElapsed = () => {
      if (document.visibilityState === "hidden") {
        lastScreenTickRef.current = Date.now();
        return;
      }

      const now = Date.now();
      const elapsed = now - lastScreenTickRef.current;
      lastScreenTickRef.current = now;

      if (elapsed <= 0) {
        return;
      }

      const isIdle = now - lastScreenActivityRef.current > SCREEN_IDLE_THRESHOLD_MS;
      if (isIdle) {
        pendingIdleMsRef.current += elapsed;
      } else {
        pendingActiveMsRef.current += elapsed;
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];

    const intervalId = window.setInterval(() => {
      captureElapsed();
      void flushScreenActivity();
    }, SCREEN_HEARTBEAT_MS);

    const handleVisibilityChange = () => {
      captureElapsed();
      if (document.visibilityState === "hidden") {
        void flushScreenActivity();
      } else {
        lastScreenActivityRef.current = Date.now();
      }
    };

    const handleBeforeUnload = () => {
      captureElapsed();
      void flushScreenActivity();
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markInteraction, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      captureElapsed();
      window.clearInterval(intervalId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markInteraction);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void flushScreenActivity();
    };
  }, [isHydrated, pathname, showMenu, title]);

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
      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
      if (searchMenuRef.current && !searchMenuRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!showMenu || !isHydrated || !token) {
      return;
    }

    let isMounted = true;

    const loadNotifications = async () => {
      setIsNotificationsLoading(true);
      setNotificationError("");

      try {
        const response = await fetch("/api/admin/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });
        const result = (await response.json()) as {
          notifications?: NotificationLogRecord[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(result.message || "Unable to load notifications.");
        }

        if (isMounted) {
          setNotifications(result.notifications ?? []);
        }
      } catch (loadError) {
        if (isMounted) {
          setNotificationError(
            loadError instanceof Error ? loadError.message : "Unable to load notifications."
          );
        }
      } finally {
        if (isMounted) {
          setIsNotificationsLoading(false);
        }
      }
    };

    void loadNotifications();
    const refreshId = window.setInterval(() => {
      void loadNotifications();
    }, 120000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshId);
    };
  }, [isHydrated, pathname, showMenu, token]);

  useEffect(() => {
    if (!showMenu || !isHydrated || !token) {
      return;
    }

    let isMounted = true;

    Promise.all([
      fetch("/api/admin/jobs", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
      fetch("/api/admin/clients", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
      fetch("/api/admin/employees", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
      fetch("/api/admin/applications", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
    ])
      .then(async ([jobsResponse, clientsResponse, employeesResponse, applicationsResponse]) => {
        const jobsResult = (await jobsResponse.json()) as { jobs?: JobSummary[] };
        const clientsResult = (await clientsResponse.json()) as { clients?: ClientRecord[] };
        const employeesResult = (await employeesResponse.json()) as { employees?: EmployeeRecord[] };
        const applicationsResult = (await applicationsResponse.json()) as { applications?: JobApplication[] };

        if (!isMounted) {
          return;
        }

        setJobsIndex(jobsResult.jobs ?? []);
        setClientsIndex(clientsResult.clients ?? []);
        setEmployeesIndex(employeesResult.employees ?? []);
        setApplicationsIndex(applicationsResult.applications ?? []);
      })
      .catch(() => {
        // Global search stays silent if preload fails.
      });

    return () => {
      isMounted = false;
    };
  }, [isHydrated, showMenu, token]);

  useEffect(() => {
    const closeMenus = () => {
      setExpandedModuleKey(null);
      setIsProfileMenuOpen(false);
      setIsNotificationsOpen(false);
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

  const unreadNotifications = notifications.filter((item) => !item.isRead).length;
  const searchResults = searchQuery.trim()
    ? [
        ...jobsIndex
          .filter(
            (job) =>
              job.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
              String(job.jobCode || "").toLowerCase().includes(searchQuery.trim().toLowerCase())
          )
          .slice(0, 4)
          .map((job) => ({
            id: `job-${job.id}`,
            label: job.title,
            sublabel: `${job.jobCode || "Pending ID"} • ${job.clientName || "No client"}`,
            href: "/admin/jobs/existing",
            type: "Job",
          })),
        ...clientsIndex
          .filter(
            (client) =>
              client.companyName.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
              String(client.contactPerson || "").toLowerCase().includes(searchQuery.trim().toLowerCase())
          )
          .slice(0, 4)
          .map((client) => ({
            id: `client-${client.id}`,
            label: client.companyName,
            sublabel: `${client.contactPerson} • ${client.assignedEmployeeName || "Not assigned"}`,
            href: `/admin/clients/${client.id}`,
            type: "Client",
          })),
        ...applicationsIndex
          .filter(
            (application) =>
              application.candidateName.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
              String(application.candidateEmail || "").toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
              String(application.candidatePhone || "").toLowerCase().includes(searchQuery.trim().toLowerCase())
          )
          .slice(0, 4)
          .map((application) => ({
            id: `application-${application.id}`,
            label: application.candidateName,
            sublabel: `${application.jobTitle || "No job"} • ${application.recruiterName || "Unassigned"}`,
            href: `/admin/candidates/${application.id}`,
            type: "Candidate",
          })),
        ...employeesIndex
          .filter(
            (employee) =>
              employee.fullName.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
              String(employee.employeeCode || "").toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
              employee.email.toLowerCase().includes(searchQuery.trim().toLowerCase())
          )
          .slice(0, 4)
          .map((employee) => ({
            id: `employee-${employee.id}`,
            label: employee.fullName,
            sublabel: `${employee.employeeCode || "Pending"} • ${employee.role}`,
            href: "/admin/employees/existing",
            type: "Employee",
          })),
      ].slice(0, 10)
    : [];

  const visibleNotifications =
    notificationFilter === "unread"
      ? notifications.filter((item) => !item.isRead)
      : notifications;

  async function handleNotificationRead(id: string, actionUrl?: string) {
    if (!token) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/notifications/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json()) as NotificationLogRecord & { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to update notification.");
      }

      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
      if (actionUrl) {
        setIsNotificationsOpen(false);
        router.push(actionUrl);
      }
    } catch (error) {
      setNotificationError(
        error instanceof Error ? error.message : "Unable to update notification."
      );
    }
  }

  async function handleProfilePasswordChange() {
    if (!token || authType !== "employee") {
      return;
    }
    if (profileNewPassword.trim().length < 6) {
      setProfilePasswordMessage("New password must be at least 6 characters long.");
      return;
    }
    if (profileNewPassword !== profileConfirmPassword) {
      setProfilePasswordMessage("New password and confirm password must match.");
      return;
    }

    setIsUpdatingPassword(true);
    setProfilePasswordMessage("");

    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: profileNewPassword }),
      });
      const result = (await response.json()) as {
        token?: string;
        user?: {
          type: "admin" | "employee";
          name: string;
          email?: string;
          role: string;
          employeeCode?: string;
        };
        message?: string;
      };

      if (!response.ok || !result.token || !result.user) {
        throw new Error(result.message || "Unable to change password.");
      }

      window.localStorage.setItem("werklyAdminToken", result.token);
      window.localStorage.setItem(
        "werklyAdminEmail",
        result.user.employeeCode ?? result.user.email ?? authIdentifier
      );
      window.localStorage.setItem("werklyAuthType", result.user.type);
      window.localStorage.setItem("werklyAuthName", result.user.name);
      window.localStorage.setItem("werklyAuthRole", result.user.role);
      if (result.user.employeeCode) {
        window.localStorage.setItem("werklyEmployeeCode", result.user.employeeCode);
      }

      setProfileNewPassword("");
      setProfileConfirmPassword("");
      setProfilePasswordMessage("Password updated successfully.");
      window.setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (error) {
      setProfilePasswordMessage(
        error instanceof Error ? error.message : "Unable to change password."
      );
    } finally {
      setIsUpdatingPassword(false);
    }
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
                              const itemPath = item.href.split("?")[0];
                              const isItemActive =
                                itemPath === "/admin"
                                  ? pathname === "/admin"
                                  : pathname.startsWith(itemPath);

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
              <div className="flex justify-start xl:ml-auto xl:min-w-[720px] xl:justify-end">
                <div className="flex items-center gap-3">
                  <div className="relative hidden lg:block" ref={searchMenuRef}>
                    <div className="flex min-w-[320px] items-center gap-3 rounded-[1rem] border border-white/14 bg-[rgba(255,255,255,0.08)] px-4 py-3 text-white">
                      <SearchIcon className="h-4 w-4 text-white/70" />
                      <input
                        value={searchQuery}
                        onFocus={() => setIsSearchOpen(true)}
                        onChange={(event) => {
                          setSearchQuery(event.target.value);
                          setIsSearchOpen(true);
                        }}
                        placeholder="Search jobs, clients, candidates, employees"
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/58"
                      />
                    </div>

                    {isSearchOpen && searchQuery.trim() ? (
                      <div className="absolute right-0 z-30 mt-3 w-[420px] overflow-hidden rounded-[1.15rem] border border-white/12 bg-[linear-gradient(180deg,rgba(9,68,76,0.99),rgba(7,52,59,0.99))] p-3 text-white shadow-[0_24px_60px_rgba(5,24,28,0.34)] backdrop-blur">
                        {searchResults.length === 0 ? (
                          <div className="rounded-xl border border-white/8 bg-white/6 px-4 py-3 text-sm text-white/76">
                            No matching records yet. Try job ID, client name, candidate email, or employee code.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {searchResults.map((item) => (
                              <Link
                                key={item.id}
                                href={item.href}
                                onClick={() => {
                                  setIsSearchOpen(false);
                                  setSearchQuery("");
                                }}
                                className="block rounded-xl border border-white/8 bg-white/6 px-4 py-3 transition hover:bg-white/10"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-white">{item.label}</p>
                                    <p className="mt-1 text-sm text-white/70">{item.sublabel}</p>
                                  </div>
                                  <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/74">
                                    {item.type}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="relative" ref={notificationMenuRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedModuleKey(null);
                        setIsProfileMenuOpen(false);
                        setIsNotificationsOpen((current) => !current);
                      }}
                      className="relative inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-white/14 bg-[rgba(255,255,255,0.08)] text-white transition hover:border-[rgba(241,166,75,0.48)] hover:bg-[rgba(255,255,255,0.12)]"
                    >
                      <BellIcon className="h-5 w-5" />
                      {unreadNotifications > 0 ? (
                        <span className="absolute -right-1 -top-1 inline-flex min-w-[22px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-ink)]">
                          {unreadNotifications}
                        </span>
                      ) : null}
                    </button>

                    {isNotificationsOpen ? (
                      <div className="absolute right-0 z-30 mt-3 w-[360px] overflow-hidden rounded-[1.15rem] border border-white/12 bg-[linear-gradient(180deg,rgba(9,68,76,0.99),rgba(7,52,59,0.99))] p-4 text-white shadow-[0_24px_60px_rgba(5,24,28,0.34)] backdrop-blur">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
                              Notification Center
                            </p>
                            <p className="mt-2 text-base font-semibold text-white">
                              Saved reminders and activity alerts
                            </p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                            {unreadNotifications} unread
                          </span>
                        </div>
                        <div className="mt-4 flex gap-2">
                          {[
                            { key: "unread", label: "Unread" },
                            { key: "all", label: "All" },
                          ].map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setNotificationFilter(item.key as "all" | "unread")}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                                notificationFilter === item.key
                                  ? "bg-[var(--color-accent)] text-[var(--color-ink)]"
                                  : "border border-white/10 bg-white/6 text-white/72 hover:bg-white/10"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        {notificationError ? (
                          <p className="mt-4 rounded-xl border border-[rgba(241,166,75,0.18)] bg-[rgba(241,166,75,0.12)] px-3 py-2 text-sm text-white/90">
                            {notificationError}
                          </p>
                        ) : null}

                        {isNotificationsLoading ? (
                          <p className="mt-4 text-sm text-white/70">Loading notifications...</p>
                        ) : visibleNotifications.length === 0 ? (
                          <p className="mt-4 text-sm text-white/70">
                            {notificationFilter === "unread"
                              ? "No unread notifications are available right now."
                              : "No saved reminders are available yet."}
                          </p>
                        ) : (
                          <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                            {visibleNotifications.map((item) => (
                              <div
                                key={item.id}
                                className={`w-full rounded-[1rem] border px-4 py-3 text-left transition ${
                                  item.isRead
                                    ? "border-white/8 bg-white/6 text-white/72"
                                    : "border-[rgba(241,166,75,0.22)] bg-[rgba(255,255,255,0.1)] text-white hover:border-[rgba(241,166,75,0.4)]"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold">{item.title}</p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/55">
                                      {item.category}
                                    </p>
                                  </div>
                                  {!item.isRead ? (
                                    <span className="rounded-full bg-[var(--color-accent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink)]">
                                      New
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-sm leading-6">{item.message}</p>
                                <p className="mt-2 text-xs text-white/55">
                                  {new Date(item.createdAt).toLocaleString("en-IN", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {!item.isRead ? (
                                    <button
                                      type="button"
                                      onClick={() => void handleNotificationRead(item.id)}
                                      className="rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                                    >
                                      Mark Read
                                    </button>
                                  ) : null}
                                  {item.actionUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => void handleNotificationRead(item.id, item.actionUrl)}
                                      className="rounded-xl bg-[var(--color-accent)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:opacity-90"
                                    >
                                      Open
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {isAdminView ? (
                          <div className="mt-4 border-t border-white/10 pt-4">
                            <Link
                              href="/admin/settings"
                              onClick={() => setIsNotificationsOpen(false)}
                              className="inline-flex items-center rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:border-[rgba(241,166,75,0.48)] hover:bg-[rgba(255,255,255,0.12)] hover:text-[var(--color-accent)]"
                            >
                              Open Settings
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationsOpen(false);
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
                        </div>
                        {authType === "employee" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              setIsChangePasswordOpen(true);
                              setProfilePasswordMessage("");
                            }}
                            className="mt-4 inline-flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:border-[rgba(241,166,75,0.48)] hover:bg-[rgba(255,255,255,0.12)] hover:text-[var(--color-accent)]"
                          >
                            <span>Password Reset</span>
                            <LockIcon className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>

                        <div className="mt-4 grid gap-2">
                          {isAdminView && roleAccess.modules.settings ? (
                            <Link
                              href="/admin/settings"
                              onClick={() => setIsProfileMenuOpen(false)}
                              className="inline-flex items-center justify-between rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-white transition hover:border-[rgba(241,166,75,0.48)] hover:bg-[rgba(255,255,255,0.12)] hover:text-[var(--color-accent)]"
                            >
                              <span>Settings</span>
                              <ChevronDownIcon className="h-4 w-4 -rotate-90" />
                            </Link>
                          ) : null}
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
        {isChangePasswordOpen ? (
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[rgba(7,23,29,0.44)] p-4">
            <div className="w-full max-w-xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-7 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Change Password</p>
                  <h2 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                    Update your employee login password
                  </h2>
                  <p className="muted-copy mt-2 text-sm leading-6">
                    Set a new password for your current employee session.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePasswordOpen(false);
                    setProfilePasswordMessage("");
                    setProfileNewPassword("");
                    setProfileConfirmPassword("");
                  }}
                  className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
                    New Password
                  </span>
                  <input
                    type="password"
                    value={profileNewPassword}
                    onChange={(event) => setProfileNewPassword(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                    placeholder="Enter new password"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
                    Confirm Password
                  </span>
                  <input
                    type="password"
                    value={profileConfirmPassword}
                    onChange={(event) => setProfileConfirmPassword(event.target.value)}
                    className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                    placeholder="Re-enter new password"
                  />
                </label>
              </div>

              {profilePasswordMessage ? (
                <p className="mt-4 text-sm font-medium text-[var(--color-dark)]">
                  {profilePasswordMessage}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleProfilePasswordChange()}
                  disabled={isUpdatingPassword}
                  className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isUpdatingPassword ? "Updating..." : "Save Password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePasswordOpen(false);
                    setProfilePasswordMessage("");
                    setProfileNewPassword("");
                    setProfileConfirmPassword("");
                  }}
                  className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
