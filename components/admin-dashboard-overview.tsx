"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

function formatDateLabel(value?: string) {
  if (!value) {
    return "No deadline";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
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

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
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
    const dateKey = normalizeDateKey(current.toISOString());

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
      return "In Progress";
    case "awaiting-client":
      return "Awaiting Client";
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
  const [authName] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthName") ?? "Werkly User"
      : "Werkly User"
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
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateKey(todayKey));
  const isAdminView = authType === "admin" || authRole === "super-admin";

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

  const followUpItems = useMemo<FollowUpItem[]>(() => {
    return state.clients
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
  }, [state.clients]);

  const employeeOptions = useMemo(
    () =>
      state.employees
        .filter((employee) => employee.status === "active")
        .map((employee) => ({
          id: employee.id,
          label: `${employee.fullName}${employee.employeeCode ? ` - ${employee.employeeCode}` : ""}`,
        })),
    [state.employees]
  );

  const filteredFollowUps = useMemo(() => {
    return followUpItems.filter((item) => {
      if (selectedEmployeeId !== "all" && item.ownerId !== selectedEmployeeId) {
        return false;
      }
      return true;
    });
  }, [followUpItems, selectedEmployeeId]);

  const selectedDateFollowUps = useMemo(
    () => filteredFollowUps.filter((item) => item.nextFollowUpDate === selectedDateKey),
    [filteredFollowUps, selectedDateKey]
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
    setSelectedDateKey(dateKey);
    const count = followUpCountsByDate[dateKey] ?? 0;
    if (count > 0) {
      setIsDateModalOpen(true);
    } else {
      setIsDateModalOpen(false);
    }
  }

  const metrics = useMemo(() => {
    const liveJobs = state.jobs.filter((job) => {
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
      totalApplications: state.applications.length,
      activeClients: state.clients.filter((client) => client.status === "active").length,
      activeEmployees: state.employees.filter((employee) => employee.status === "active").length,
      dueTodayFollowUps,
      overdueFollowUps,
      upcomingSevenDays,
      recruiterSummary: state.employees
        .filter((employee) => employee.status === "active")
        .map((employee) => {
          const assignedClients = state.clients.filter(
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
  }, [filteredFollowUps, followUpItems, state, todayKey]);

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

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
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: isAdminView ? "Live Jobs" : "My Live Jobs",
            value: metrics.liveJobs,
          },
          {
            label: isAdminView ? "Active Clients" : "My Clients",
            value: metrics.activeClients,
          },
          {
            label: "Due Today",
            value: metrics.dueTodayFollowUps,
          },
          {
            label: "Overdue",
            value: metrics.overdueFollowUps,
          },
          {
            label: "Next 7 Days",
            value: metrics.upcomingSevenDays,
          },
        ].map((card) => (
          <article key={card.label} className="accent-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
              {card.label}
            </p>
            <p className="mt-2 text-[1.7rem] font-semibold text-[var(--color-ink)]">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
        <article className="accent-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{isAdminView ? "Follow-Up Calendar" : "Follow-Up Calendar"}</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
                {isAdminView
                  ? "Track client follow-ups by employee and date."
                  : `${authName}, here is your follow-up dashboard.`}
              </h2>
              <p className="muted-copy mt-2 text-sm leading-5">
                {isAdminView
                  ? "Filter by recruiter and date to see client follow-up commitments that need action."
                  : "Click any date in the calendar to open that day's follow-up details."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isAdminView ? (
                <select
                  value={selectedEmployeeId}
                  onChange={(event) => setSelectedEmployeeId(event.target.value)}
                  className="rounded-2xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                >
                  <option value="all">All Employees</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.label}
                    </option>
                  ))}
                </select>
              ) : authEmployeeCode ? (
                <div className="rounded-2xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--color-ink)]">
                  {authEmployeeCode}
                </div>
              ) : null}
              <input
                type="date"
                value={selectedDateKey}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSelectedDateKey(nextValue);
                  if (nextValue) {
                    setVisibleMonth(parseDateKey(nextValue));
                  }
                }}
                className="rounded-2xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              />
            </div>
          </div>

          {isLoading ? (
            <p className="muted-copy mt-6 text-sm">Loading dashboard data...</p>
          ) : error ? (
            <p className="mt-6 text-sm font-medium text-red-700">{error}</p>
          ) : (
            <div className="mt-6">
              <div className="rounded-[1.45rem] border border-[var(--color-line)] bg-white p-3.5">
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

                <div className="mt-3 grid grid-cols-7 gap-1">
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
                    const isSelected = day.dateKey === selectedDateKey;
                    const isToday = day.dateKey === todayKey;

                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => openDateDetails(day.dateKey)}
                        className={`min-h-[50px] rounded-[0.9rem] border p-1.5 text-left transition ${
                          isSelected
                            ? "border-[var(--color-dark)] bg-[rgba(8,96,108,0.09)]"
                            : "border-[var(--color-line)] bg-white hover:border-[var(--color-dark)]"
                        } ${day.inMonth ? "text-[var(--color-ink)]" : "text-[var(--color-muted)]"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-semibold">{day.label}</span>
                          {isToday ? (
                            <span className="rounded-full bg-[var(--color-accent)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink)]">
                              Today
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1.5">
                          {count > 0 ? (
                            <span className="inline-flex rounded-full bg-[rgba(190,72,26,0.12)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--color-accent-strong)]">
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

        {isAdminView ? (
          <article className="accent-card p-5">
            <p className="eyebrow">Upcoming Follow-Ups</p>
            <h2 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
              Prioritized follow-up queue
            </h2>

            {isLoading ? (
              <p className="muted-copy mt-6 text-sm">Loading follow-up queue...</p>
            ) : upcomingFollowUps.length === 0 ? (
              <p className="muted-copy mt-6 text-sm">No scheduled follow-ups are available yet.</p>
            ) : (
              <div className="mt-6 space-y-4">
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
        ) : null}
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
          ) : state.jobs.length === 0 ? (
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
                  {[...state.jobs]
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

      {isDateModalOpen ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-3xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Selected Date</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {formatDateLabel(selectedDateKey)}
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
