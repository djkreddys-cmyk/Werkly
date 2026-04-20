"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientFollowUpStatus, ClientRecord, EmployeeRecord } from "@/lib/crm";
import type { JobApplication, JobSummary } from "@/lib/jobs";

type DashboardState = {
  jobs: JobSummary[];
  clients: ClientRecord[];
  employees: EmployeeRecord[];
  applications: JobApplication[];
};

type FollowUpItem = {
  id: string;
  clientName: string;
  contactPerson: string;
  contactEmail?: string;
  contactPhone?: string;
  ownerId?: string;
  ownerName: string;
  followUpStatus: ClientFollowUpStatus;
  nextFollowUpDate: string;
  lastFollowUpDate?: string;
  notes?: string;
  sector?: string;
};

function escapeExcelCell(value: string | number | undefined | null) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadExcelReport(
  filename: string,
  sheetTitle: string,
  headings: string[],
  rows: Array<Array<string | number | undefined | null>>
) {
  const tableHead = headings.map((heading) => `<th>${escapeExcelCell(heading)}</th>`).join("");
  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeExcelCell(cell)}</td>`).join("")}</tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
      th { background: #eaf2f4; font-weight: 700; }
      h1 { font-family: Arial, sans-serif; }
    </style>
  </head>
  <body>
    <h1>${escapeExcelCell(sheetTitle)}</h1>
    <table>
      <thead><tr>${tableHead}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </body>
</html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function formatDateLabel(value?: string) {
  if (!value) {
    return "No deadline";
  }

  const parsed = parseFlexibleDate(value);
  if (!parsed) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTodayKey() {
  const now = new Date();
  return formatLocalDateKey(now);
}

function formatLocalDateKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(value?: string) {
  if (!value) {
    return "";
  }

  const directMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (directMatch) {
    return directMatch[0];
  }

  const parsed = parseFlexibleDate(value);
  if (!parsed) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function parseFlexibleDate(value: string) {
  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const dmyMatch = normalized.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMonthLabel(value: Date) {
  return value.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function buildCalendarDays(monthDate: Date) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(calendarStart);
    current.setDate(calendarStart.getDate() + index);
    const dateKey = formatLocalDateKey(current);

    return {
      key: dateKey,
      label: current.getDate(),
      dateKey,
      inMonth: current.getMonth() === monthDate.getMonth(),
    };
  });
}

function formatFollowUpStage(stage?: ClientFollowUpStatus) {
  switch (stage) {
    case "follow-up-due":
      return "Follow-Up Due";
    case "in-progress":
      return "In Discussion";
    case "awaiting-client":
      return "Awaiting Response";
    case "closed":
      return "Closed";
    case "pending":
    default:
      return "Pending";
  }
}

function FollowUpStatusPill({ status }: { status: ClientFollowUpStatus }) {
  const className =
    status === "closed"
      ? "bg-[rgba(8,96,108,0.1)] text-[var(--color-dark)]"
      : status === "follow-up-due"
        ? "bg-[rgba(190,72,26,0.12)] text-[var(--color-accent-strong)]"
        : status === "awaiting-client"
          ? "bg-[rgba(241,166,75,0.14)] text-[var(--color-accent-strong)]"
          : "bg-[rgba(8,96,108,0.08)] text-[var(--color-dark)]";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${className}`}
    >
      {formatFollowUpStage(status)}
    </span>
  );
}

export function AdminDashboardOverview() {
  const router = useRouter();
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [authType] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthType") ?? "admin"
      : "admin"
  );
  const [authRole] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthRole") ?? "super-admin"
      : "super-admin"
  );
  const [authEmail] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminEmail") ?? ""
      : ""
  );
  const [authEmployeeCode] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyEmployeeCode") ?? ""
      : ""
  );
  const [state, setState] = useState<DashboardState>({
    jobs: [],
    clients: [],
    employees: [],
    applications: [],
  });
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const todayKey = getTodayKey();
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("all");
  const [selectedFollowUpStatus, setSelectedFollowUpStatus] = useState<
    "all" | ClientFollowUpStatus
  >("all");
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateKey(todayKey));
  const [editingFollowUpId, setEditingFollowUpId] = useState("");
  const [quickFollowUpStatus, setQuickFollowUpStatus] =
    useState<ClientFollowUpStatus>("pending");
  const [quickLastFollowUpDate, setQuickLastFollowUpDate] = useState("");
  const [quickNextFollowUpDate, setQuickNextFollowUpDate] = useState("");
  const [quickFollowUpNotes, setQuickFollowUpNotes] = useState("");
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const isAdminView = authType === "admin" || authRole === "super-admin";
  const isEmployeeSession = authType === "employee" || Boolean(authEmployeeCode);
  const activeDateKey = normalizeDateKey(selectedDateKey) || todayKey;
  const currentEmployeeId = state.employees.find(
    (employee) => employee.employeeCode === authEmployeeCode || employee.email === authEmail
  )?.id;
  const activeEmployeeFilter = isEmployeeSession ? currentEmployeeId || "" : selectedEmployeeId;
  const queueSectionRef = useRef<HTMLElement | null>(null);
  const calendarSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      fetch("/api/admin/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/clients", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/employees", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/applications", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([jobsResponse, clientsResponse, employeesResponse, applicationsResponse]) => {
        const jobsResult = (await jobsResponse.json()) as {
          jobs?: JobSummary[];
          message?: string;
        };
        const clientsResult = (await clientsResponse.json()) as {
          clients?: ClientRecord[];
          message?: string;
        };
        const employeesResult = (await employeesResponse.json()) as {
          employees?: EmployeeRecord[];
          message?: string;
        };
        const applicationsResult = (await applicationsResponse.json()) as {
          applications?: JobApplication[];
          message?: string;
        };

        if (!jobsResponse.ok) {
          throw new Error(jobsResult.message || "Unable to load jobs.");
        }
        if (!clientsResponse.ok) {
          throw new Error(clientsResult.message || "Unable to load clients.");
        }
        if (!employeesResponse.ok) {
          throw new Error(employeesResult.message || "Unable to load employees.");
        }
        if (!applicationsResponse.ok) {
          throw new Error(applicationsResult.message || "Unable to load applications.");
        }

        setState({
          jobs: jobsResult.jobs ?? [],
          clients: clientsResult.clients ?? [],
          employees: employeesResult.employees ?? [],
          applications: applicationsResult.applications ?? [],
        });
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const visibleEmployees = useMemo(() => {
    if (!isEmployeeSession) {
      return state.employees;
    }

    return state.employees.filter(
      (employee) =>
        employee.employeeCode === authEmployeeCode ||
        employee.email === authEmail ||
        employee.id === currentEmployeeId
    );
  }, [authEmail, authEmployeeCode, currentEmployeeId, isEmployeeSession, state.employees]);

  const visibleClients = useMemo(() => {
    if (!isEmployeeSession) {
      return state.clients;
    }

    return state.clients.filter((client) => client.assignedEmployeeId === currentEmployeeId);
  }, [currentEmployeeId, isEmployeeSession, state.clients]);

  const visibleJobs = useMemo(() => {
    if (!isEmployeeSession) {
      return state.jobs;
    }

    return state.jobs.filter(
      (job) => job.recruiterId === currentEmployeeId || job.recruiterEmail === authEmail
    );
  }, [authEmail, currentEmployeeId, isEmployeeSession, state.jobs]);

  const visibleApplications = useMemo(() => {
    if (!isEmployeeSession) {
      return state.applications;
    }

    const visibleJobIds = new Set(visibleJobs.map((job) => job.id));

    return state.applications.filter(
      (application) =>
        application.recruiterEmail === authEmail || visibleJobIds.has(application.jobId)
    );
  }, [authEmail, isEmployeeSession, state.applications, visibleJobs]);

  const followUpItems = useMemo<FollowUpItem[]>(() => {
    return visibleClients
      .filter((client) => normalizeDateKey(client.nextFollowUpDate))
      .map((client) => ({
        id: client.id,
        clientName: client.companyName,
        contactPerson: client.contactPerson,
        contactEmail: client.contactEmail,
        contactPhone: client.contactPhone,
        ownerId: client.assignedEmployeeId,
        ownerName: client.assignedEmployeeName || "Unassigned",
        followUpStatus: client.followUpStatus || "pending",
        nextFollowUpDate: normalizeDateKey(client.nextFollowUpDate),
        lastFollowUpDate: normalizeDateKey(client.lastFollowUpDate),
        notes: client.followUpNotes,
        sector: client.sector,
      }))
      .sort((a, b) => a.nextFollowUpDate.localeCompare(b.nextFollowUpDate));
  }, [visibleClients]);

  const employeeOptions = useMemo(
    () =>
      visibleEmployees
        .filter((employee) => employee.status === "active")
        .map((employee) => ({
          id: employee.id,
          label: `${employee.fullName}${employee.employeeCode ? ` - ${employee.employeeCode}` : ""}`,
        })),
    [visibleEmployees]
  );

  const filteredFollowUps = useMemo(() => {
    return followUpItems.filter((item) => {
      if (activeEmployeeFilter && activeEmployeeFilter !== "all" && item.ownerId !== activeEmployeeFilter) {
        return false;
      }
      if (selectedFollowUpStatus !== "all" && item.followUpStatus !== selectedFollowUpStatus) {
        return false;
      }
      return true;
    });
  }, [activeEmployeeFilter, followUpItems, selectedFollowUpStatus]);

  const selectedDateFollowUps = useMemo(
    () => filteredFollowUps.filter((item) => item.nextFollowUpDate === activeDateKey),
    [activeDateKey, filteredFollowUps]
  );

  const upcomingFollowUps = useMemo(
    () => filteredFollowUps.filter((item) => item.nextFollowUpDate >= todayKey).slice(0, 8),
    [filteredFollowUps, todayKey]
  );

  const followUpCountsByDate = useMemo(() => {
    return filteredFollowUps.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.nextFollowUpDate] = (accumulator[item.nextFollowUpDate] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [filteredFollowUps]);

  function openDateDetails(dateKey: string) {
    const normalizedDateKey = normalizeDateKey(dateKey);
    if (!normalizedDateKey) {
      setIsDateModalOpen(false);
      return;
    }

    setSelectedDateKey(normalizedDateKey);
    setVisibleMonth(parseDateKey(normalizedDateKey));
    setIsDateModalOpen(true);
  }

  function scrollToSection(ref: { current: HTMLElement | null }) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function applyClientUpdate(updatedClient: ClientRecord) {
    setState((current) => ({
      ...current,
      clients: current.clients.map((client) =>
        client.id === updatedClient.id ? updatedClient : client
      ),
    }));
  }

  function openQuickEdit(item: FollowUpItem) {
    setEditingFollowUpId(item.id);
    setQuickFollowUpStatus(item.followUpStatus);
    setQuickLastFollowUpDate(item.lastFollowUpDate || activeDateKey);
    setQuickNextFollowUpDate(item.nextFollowUpDate || "");
    setQuickFollowUpNotes(item.notes || "");
  }

  async function handleQuickFollowUpSave(
    clientId: string,
    override?: {
      status?: ClientFollowUpStatus;
      lastFollowUpDate?: string;
      nextFollowUpDate?: string;
      notes?: string;
    }
  ) {
    if (!token) {
      return;
    }

    setIsQuickSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/clients/${clientId}/follow-up`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          followUpStatus: override?.status || quickFollowUpStatus,
          lastFollowUpDate: override?.lastFollowUpDate || quickLastFollowUpDate || activeDateKey,
          nextFollowUpDate: override?.nextFollowUpDate ?? quickNextFollowUpDate,
          followUpNotes: override?.notes ?? quickFollowUpNotes,
        }),
      });

      const result = (await response.json()) as ClientRecord & { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to update follow-up.");
      }

      applyClientUpdate(result);
      setEditingFollowUpId("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update follow-up.");
    } finally {
      setIsQuickSaving(false);
    }
  }

  const metrics = useMemo(() => {
    const liveJobs = visibleJobs.filter((job) => {
      if (job.isHidden || job.status !== "open") {
        return false;
      }
      if (!job.lastDateToApply) {
        return true;
      }
      return new Date(job.lastDateToApply) >= new Date();
    });

    const overdueFollowUps = filteredFollowUps.filter(
      (item) => item.nextFollowUpDate < todayKey && item.followUpStatus !== "closed"
    ).length;
    const dueTodayFollowUps = filteredFollowUps.filter(
      (item) => item.nextFollowUpDate === todayKey && item.followUpStatus !== "closed"
    ).length;
    const upcomingSevenDays = filteredFollowUps.filter((item) => {
      const diff =
        (parseDateKey(item.nextFollowUpDate).getTime() - parseDateKey(todayKey).getTime()) /
        (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length;

    return {
      liveJobs: liveJobs.length,
      totalApplications: visibleApplications.length,
      activeClients: visibleClients.filter((client) => client.status === "active").length,
      activeEmployees: visibleEmployees.filter((employee) => employee.status === "active").length,
      dueTodayFollowUps,
      overdueFollowUps,
      upcomingSevenDays,
      recruiterSummary: visibleEmployees
        .filter((employee) => employee.status === "active")
        .map((employee) => {
          const assignedClients = visibleClients.filter(
            (client) => client.assignedEmployeeId === employee.id
          ).length;
          const followUps = followUpItems.filter((item) => item.ownerId === employee.id);

          return {
            id: employee.id,
            fullName: employee.fullName,
            assignedClients,
            followUps: followUps.length,
            today: followUps.filter((item) => item.nextFollowUpDate === todayKey).length,
            overdue: followUps.filter(
              (item) => item.nextFollowUpDate < todayKey && item.followUpStatus !== "closed"
            ).length,
          };
        })
        .sort((a, b) => b.followUps - a.followUps)
        .slice(0, 6),
    };
  }, [
    filteredFollowUps,
    followUpItems,
    todayKey,
    visibleApplications,
    visibleClients,
    visibleEmployees,
    visibleJobs,
  ]);

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const reminderItems = useMemo(
    () => [
      {
        label: "Overdue Follow-Ups",
        value: metrics.overdueFollowUps,
        detail:
          metrics.overdueFollowUps > 0
            ? "These client commitments need immediate action."
            : "No overdue client follow-ups right now.",
      },
      {
        label: "Due Today",
        value: metrics.dueTodayFollowUps,
        detail:
          metrics.dueTodayFollowUps > 0
            ? "Follow-ups scheduled for today are ready for review."
            : "No client follow-ups are due today.",
      },
      {
        label: "Closed This View",
        value: filteredFollowUps.filter((item) => item.followUpStatus === "closed").length,
        detail: "Completed follow-ups in the current dashboard view.",
      },
    ],
    [filteredFollowUps, metrics.dueTodayFollowUps, metrics.overdueFollowUps]
  );
  const employeeProductivity = useMemo(
    () =>
      visibleEmployees
        .filter((employee) => employee.status === "active")
        .map((employee) => {
          const employeeClients = visibleClients.filter(
            (client) => client.assignedEmployeeId === employee.id
          );
          const employeeJobs = visibleJobs.filter((job) => job.recruiterId === employee.id);
          const employeeApplications = visibleApplications.filter((application) =>
            employee.email
              ? application.recruiterEmail === employee.email ||
                employeeJobs.some((job) => job.id === application.jobId)
              : employeeJobs.some((job) => job.id === application.jobId)
          );
          const employeeFollowUps = followUpItems.filter((item) => item.ownerId === employee.id);

          return {
            id: employee.id,
            fullName: employee.fullName,
            clients: employeeClients.length,
            jobs: employeeJobs.length,
            applications: employeeApplications.length,
            followUps: employeeFollowUps.length,
          };
        })
        .sort((a, b) => b.followUps - a.followUps)
        .slice(0, isAdminView ? 6 : 1),
    [followUpItems, isAdminView, visibleApplications, visibleClients, visibleEmployees, visibleJobs]
  );

  if (!token) {
    return (
      <section className="accent-card p-8">
        <p className="eyebrow">Session Required</p>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
          Sign in to open the CRM dashboard.
        </h2>
        <p className="muted-copy mt-3 text-base leading-7">
          Your session is missing on this browser. Open the login screen and sign in again.
        </p>
        <Link
          href="/admin/login"
          className="mt-6 inline-flex rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
        >
          Go to Login
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {reminderItems.map((item) => (
          <article key={item.label} className="accent-card p-5">
            <p className="eyebrow">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">{item.value}</p>
            <p className="muted-copy mt-3 text-sm leading-6">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: isAdminView ? "Live Jobs" : "My Live Jobs",
            value: metrics.liveJobs,
            onClick: () => router.push("/admin/jobs/existing"),
          },
          {
            label: isAdminView ? "Active Clients" : "My Clients",
            value: metrics.activeClients,
            onClick: () => router.push("/admin/clients/existing"),
          },
          {
            label: "Due Today",
            value: metrics.dueTodayFollowUps,
            onClick: () => {
              setSelectedFollowUpStatus("all");
              openDateDetails(todayKey);
              scrollToSection(calendarSectionRef);
            },
          },
          {
            label: "Overdue",
            value: metrics.overdueFollowUps,
            onClick: () => {
              setSelectedFollowUpStatus("follow-up-due");
              setIsDateModalOpen(false);
              scrollToSection(queueSectionRef);
            },
          },
          {
            label: "Next 7 Days",
            value: metrics.upcomingSevenDays,
            onClick: () => {
              setSelectedFollowUpStatus("all");
              setIsDateModalOpen(false);
              scrollToSection(queueSectionRef);
            },
          },
        ].map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={card.onClick}
            className="accent-card p-4 text-left transition hover:-translate-y-0.5 hover:border-[rgba(241,166,75,0.3)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
              {card.label}
            </p>
            <p className="mt-2 text-[1.7rem] font-semibold text-[var(--color-ink)]">{card.value}</p>
          </button>
        ))}
      </section>

      <section className="grid items-stretch gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <article ref={queueSectionRef} className="accent-card flex h-full flex-col p-5">
          <div className="flex min-h-[112px] items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Upcoming Follow-Ups</p>
              <h2 className="mt-1.5 text-base font-semibold text-[var(--color-ink)]">
                Prioritized follow-up queue
              </h2>
              <p className="muted-copy mt-1.5 text-sm leading-5">
                Review the next scheduled client follow-ups and open the selected date directly from
                the queue.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadExcelReport(
                  "dashboard-followups.xls",
                  "Dashboard Follow-Up Queue",
                  ["Client", "Owner", "Status", "Next Follow-Up", "Contact", "Notes"],
                  upcomingFollowUps.map((item) => [
                    item.clientName,
                    item.ownerName,
                    formatFollowUpStage(item.followUpStatus),
                    formatDateLabel(item.nextFollowUpDate),
                    item.contactPhone || item.contactEmail || item.contactPerson,
                    item.notes || "No notes added",
                  ])
                )
              }
              className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
            >
              Export Queue
            </button>
          </div>

          {isLoading ? (
            <div className="mt-5 rounded-[1.45rem] border border-[var(--color-line)] bg-white p-5">
              <p className="muted-copy text-sm">Loading follow-up queue...</p>
            </div>
          ) : upcomingFollowUps.length === 0 ? (
            <div className="mt-5 flex min-h-[272px] items-start rounded-[1.45rem] border border-[var(--color-line)] bg-white p-5">
              <p className="muted-copy text-sm">No scheduled follow-ups are available yet.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {upcomingFollowUps.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setVisibleMonth(parseDateKey(item.nextFollowUpDate));
                    if (item.ownerId) {
                      setSelectedEmployeeId(item.ownerId);
                    }
                    openDateDetails(item.nextFollowUpDate);
                  }}
                  className="w-full rounded-[1.1rem] border border-[var(--color-line)] bg-white p-3.5 text-left transition hover:border-[var(--color-dark)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">{item.clientName}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{item.ownerName}</p>
                    </div>
                    <FollowUpStatusPill status={item.followUpStatus} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--color-muted)]">
                    <span>{formatDateLabel(item.nextFollowUpDate)}</span>
                    <span>{item.contactPerson}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </article>

        <article ref={calendarSectionRef} className="accent-card flex h-full flex-col p-5">
          <div className="flex flex-col gap-4">
            <div className="min-h-[112px] max-w-[430px]">
              <p className="eyebrow">Follow-Up Calendar</p>
              <h2 className="mt-1.5 text-base font-semibold leading-6 text-[var(--color-ink)]">
                {isAdminView
                  ? "Track client follow-ups by employee and date."
                  : "Track your scheduled client follow-ups by date."}
              </h2>
              <p className="muted-copy mt-1.5 text-sm leading-5">
                {isAdminView
                  ? "Filter by employee and date to review client onboarding and follow-up commitments."
                  : "Select any date in the calendar to open your scheduled follow-up details."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {isAdminView ? (
                <select
                  value={selectedEmployeeId}
                  onChange={(event) => setSelectedEmployeeId(event.target.value)}
                  className="min-w-[220px] rounded-2xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                >
                  <option value="all">All Employees</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.label}
                    </option>
                  ))}
                </select>
              ) : authEmployeeCode ? (
                <div className="min-w-[92px] rounded-2xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--color-ink)]">
                  {authEmployeeCode}
                </div>
              ) : null}
              <input
                type="date"
                value={activeDateKey}
                onChange={(event) => openDateDetails(event.target.value)}
                className="min-w-[146px] rounded-2xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              />
              <select
                value={selectedFollowUpStatus}
                onChange={(event) =>
                  setSelectedFollowUpStatus(
                    event.target.value as "all" | ClientFollowUpStatus
                  )
                }
                className="min-w-[170px] rounded-2xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="follow-up-due">Follow-Up Due</option>
                <option value="in-progress">In Discussion</option>
                <option value="awaiting-client">Awaiting Response</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <p className="muted-copy mt-6 text-sm">Loading dashboard data...</p>
          ) : error ? (
            <p className="mt-6 text-sm font-medium text-red-700">{error}</p>
          ) : (
            <div className="mt-5 flex flex-1 items-start justify-center">
              <div className="w-full max-w-[500px] rounded-[1.45rem] border border-[var(--color-line)] bg-white p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                      )
                    }
                    className="rounded-xl border border-[var(--color-line)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                  >
                    Prev
                  </button>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    {formatMonthLabel(visibleMonth)}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                      )
                    }
                    className="rounded-xl border border-[var(--color-line)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                  >
                    Next
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-7 gap-[3px]">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div
                      key={day}
                      className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]"
                    >
                      {day}
                    </div>
                  ))}

                  {calendarDays.map((day) => {
                    const count = followUpCountsByDate[day.dateKey] ?? 0;
                    const isSelected = day.dateKey === activeDateKey;
                    const isToday = day.dateKey === todayKey;

                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => openDateDetails(day.dateKey)}
                        className={`min-h-[40px] rounded-[0.7rem] border px-0.5 py-1 text-left transition ${
                          isSelected
                            ? "border-[var(--color-dark)] bg-[rgba(8,96,108,0.09)]"
                            : isToday
                              ? "border-[var(--color-accent)] bg-[rgba(241,166,75,0.12)] hover:border-[var(--color-dark)]"
                              : "border-[var(--color-line)] bg-white hover:border-[var(--color-dark)]"
                        } ${day.inMonth ? "text-[var(--color-ink)]" : "text-[var(--color-muted)]"}`}
                      >
                        <div className="flex items-start justify-between gap-0.5">
                          <span
                            className={`text-[10px] font-semibold ${
                              isToday ? "text-[var(--color-accent-strong)]" : ""
                            }`}
                          >
                            {day.label}
                          </span>
                        </div>
                        <div className="mt-0.5">
                          {count > 0 ? (
                            <span className="inline-flex rounded-full bg-[rgba(190,72,26,0.12)] px-1 py-0.5 text-[8px] font-semibold text-[var(--color-accent-strong)]">
                              {count}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="accent-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Recent Jobs</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                Latest mandates in the system
              </h2>
            </div>
            <Link
              href="/admin/jobs"
              className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
            >
              Open Jobs
            </Link>
          </div>

          {isLoading ? (
            <p className="muted-copy mt-6 text-sm">Loading jobs...</p>
          ) : error ? (
            <p className="mt-6 text-sm font-medium text-red-700">{error}</p>
          ) : visibleJobs.length === 0 ? (
            <p className="muted-copy mt-6 text-sm">No jobs have been posted yet.</p>
          ) : (
            <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[var(--color-line)]">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {["Job", "Client", "Status", "Deadline", "Applied"].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...visibleJobs]
                    .sort(
                      (a, b) =>
                        new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
                    )
                    .slice(0, 5)
                    .map((job, index, array) => (
                      <tr
                        key={job.id}
                        className={
                          index === array.length - 1
                            ? "align-top"
                            : "align-top border-b border-[var(--color-line)]"
                        }
                      >
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-[var(--color-ink)]">{job.title}</p>
                            <p className="mt-1 text-sm text-[var(--color-muted)]">
                              {job.jobCode || "Pending ID"} - {job.location}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {job.clientName || "Not assigned"}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-[var(--color-accent-strong)]">
                          {job.isHidden ? "Hidden" : job.status}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {formatDateLabel(job.lastDateToApply)}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                          {job.applicationsCount}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="accent-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">{isAdminView ? "Team Snapshot" : "My Snapshot"}</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                {isAdminView ? "Follow-up ownership across the team" : "Your daily CRM activity"}
              </h2>
            </div>
            {isAdminView ? (
              <Link
                href="/admin/reports/clients"
                className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
              >
                Open Reports
              </Link>
            ) : null}
          </div>

          {isLoading ? (
            <p className="muted-copy mt-6 text-sm">Loading snapshot...</p>
          ) : isAdminView ? (
            metrics.recruiterSummary.length === 0 ? (
              <p className="muted-copy mt-6 text-sm">No employee summary is available yet.</p>
            ) : (
              <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[var(--color-line)]">
                <table className="w-full border-collapse bg-white">
                  <thead>
                    <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                      {["Recruiter", "Clients", "Follow-Ups", "Today", "Overdue"].map(
                        (heading) => (
                          <th
                            key={heading}
                            className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]"
                          >
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recruiterSummary.map((row, index) => (
                      <tr
                        key={row.id}
                        className={
                          index === metrics.recruiterSummary.length - 1
                            ? "align-top"
                            : "align-top border-b border-[var(--color-line)]"
                        }
                      >
                        <td className="px-4 py-4 font-semibold text-[var(--color-ink)]">
                          {row.fullName}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {row.assignedClients}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {row.followUps}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {row.today}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-[var(--color-accent-strong)]">
                          {row.overdue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[ 
                { label: "My Follow-Ups", value: filteredFollowUps.length },
                { label: "Applications", value: metrics.totalApplications },
                { label: "Due Today", value: metrics.dueTodayFollowUps },
                { label: "Upcoming", value: metrics.upcomingSevenDays },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-[1.35rem] border border-[var(--color-line)] bg-white p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-strong)]">
                    {card.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <article className="accent-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">
                {isAdminView ? "Recruiter Productivity" : "My Productivity"}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                {isAdminView
                  ? "Client ownership, jobs, and applications by recruiter"
                  : "Your current workload inside the CRM"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadExcelReport(
                  "recruiter-productivity.xls",
                  "Recruiter Productivity",
                  ["Employee", "Clients", "Jobs", "Applications", "Follow-Ups"],
                  employeeProductivity.map((row) => [
                    row.fullName,
                    row.clients,
                    row.jobs,
                    row.applications,
                    row.followUps,
                  ])
                )
              }
              className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
            >
              Export Productivity
            </button>
          </div>

          {employeeProductivity.length === 0 ? (
            <p className="muted-copy mt-6 text-sm">No productivity data is available yet.</p>
          ) : (
            <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[var(--color-line)]">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {["Employee", "Clients", "Jobs", "Applications", "Follow-Ups"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {employeeProductivity.map((row, index) => (
                    <tr
                      key={row.id}
                      className={
                        index === employeeProductivity.length - 1
                          ? "align-top"
                          : "align-top border-b border-[var(--color-line)]"
                      }
                    >
                      <td className="px-4 py-4 font-semibold text-[var(--color-ink)]">
                        {row.fullName}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{row.clients}</td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{row.jobs}</td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {row.applications}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                        {row.followUps}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      {isDateModalOpen ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-3xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Selected Date</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {formatDateLabel(activeDateKey)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDateModalOpen(false)}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-strong)]">
                Follow-Up Details
              </p>
              <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
                {selectedDateFollowUps.length} items
              </span>
            </div>

            {selectedDateFollowUps.length === 0 ? (
              <p className="muted-copy mt-6 text-sm">No follow-ups are scheduled for this date.</p>
            ) : (
              <div className="mt-6 max-h-[65vh] space-y-4 overflow-y-auto pr-1">
                {selectedDateFollowUps.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[1.35rem] border border-[var(--color-line)] bg-[rgba(8,96,108,0.03)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[var(--color-ink)]">
                          {item.clientName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {item.contactPerson}
                          {item.sector ? ` - ${item.sector}` : ""}
                        </p>
                      </div>
                      <FollowUpStatusPill status={item.followUpStatus} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          Owner
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-ink)]">{item.ownerName}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          Last Follow-Up
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-ink)]">
                          {formatDateLabel(item.lastFollowUpDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          Contact
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-ink)]">
                          {item.contactPhone || item.contactEmail || "Not added"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          Next Follow-Up
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-ink)]">
                          {formatDateLabel(item.nextFollowUpDate)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-[var(--color-muted)]">
                      {item.notes || "No follow-up remarks added yet."}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/clients/${item.id}`)}
                        className="rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                      >
                        Open Client
                      </button>
                      <button
                        type="button"
                        onClick={() => openQuickEdit(item)}
                        className="rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                      >
                        Update Follow-Up
                      </button>
                      <button
                          type="button"
                          onClick={() => {
                          void handleQuickFollowUpSave(item.id, {
                            status: "closed",
                            lastFollowUpDate: activeDateKey,
                            nextFollowUpDate: "",
                            notes: item.notes || "",
                          });
                        }}
                        className="rounded-2xl bg-[var(--color-dark)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
                      >
                        Mark Closed
                      </button>
                    </div>

                    {editingFollowUpId === item.id ? (
                      <div className="mt-4 grid gap-4 rounded-[1.25rem] border border-[var(--color-line)] bg-white p-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            Status
                          </span>
                          <select
                            value={quickFollowUpStatus}
                            onChange={(event) =>
                              setQuickFollowUpStatus(
                                event.target.value as ClientFollowUpStatus
                              )
                            }
                            className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                          >
                            <option value="pending">Pending</option>
                            <option value="follow-up-due">Follow-Up Due</option>
                            <option value="in-progress">In Discussion</option>
                            <option value="awaiting-client">Awaiting Response</option>
                            <option value="closed">Closed</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            Last Follow-Up
                          </span>
                          <input
                            type="date"
                            value={quickLastFollowUpDate}
                            onChange={(event) => setQuickLastFollowUpDate(event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            Next Follow-Up
                          </span>
                          <input
                            type="date"
                            value={quickNextFollowUpDate}
                            onChange={(event) => setQuickNextFollowUpDate(event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            Notes
                          </span>
                          <textarea
                            value={quickFollowUpNotes}
                            onChange={(event) => setQuickFollowUpNotes(event.target.value)}
                            className="mt-2 min-h-[120px] w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                          />
                        </label>
                        <div className="sm:col-span-2 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void handleQuickFollowUpSave(item.id)}
                            disabled={isQuickSaving}
                            className="rounded-2xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isQuickSaving ? "Saving..." : "Save Update"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFollowUpId("")}
                            className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
