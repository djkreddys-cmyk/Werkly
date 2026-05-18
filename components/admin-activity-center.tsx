"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  AuditLogRecord,
  ClientTransferRequestRecord,
  EmployeeRecord,
  NotificationLogRecord,
} from "@/lib/crm";
import type { JobApplicationStageHistory } from "@/lib/jobs";
import { formatPersonName } from "@/lib/format";

type ActivityCenterState = {
  auditLogs: AuditLogRecord[];
  notifications: NotificationLogRecord[];
  history: JobApplicationStageHistory[];
  transfers: ClientTransferRequestRecord[];
};

function formatDateTime(value?: string) {
  if (!value) {
    return "Not added";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatActionLabel(value: string) {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDateKey(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AdminActivityCenter() {
  const [token] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("werklyAdminToken") ?? "" : ""
  );
  const [state, setState] = useState<ActivityCenterState>({
    auditLogs: [],
    notifications: [],
    history: [],
    transfers: [],
  });
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      fetch("/api/admin/audit-logs?limit=80", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/applications/history", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/client-transfer-requests", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/employees", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(
        async ([
          auditResponse,
          notificationsResponse,
          historyResponse,
          transfersResponse,
          employeesResponse,
        ]) => {
        const auditResult = (await auditResponse.json()) as {
          logs?: AuditLogRecord[];
          message?: string;
        };
        const notificationsResult = (await notificationsResponse.json()) as {
          notifications?: NotificationLogRecord[];
          message?: string;
        };
        const historyResult = (await historyResponse.json()) as {
          history?: JobApplicationStageHistory[];
          message?: string;
        };
        const transfersResult = (await transfersResponse.json()) as {
          requests?: ClientTransferRequestRecord[];
          message?: string;
        };
        const employeesResult = (await employeesResponse.json()) as {
          employees?: EmployeeRecord[];
          message?: string;
        };

        if (!auditResponse.ok) {
          throw new Error(auditResult.message || "Unable to load audit logs.");
        }
        if (!notificationsResponse.ok) {
          throw new Error(notificationsResult.message || "Unable to load notifications.");
        }
        if (!historyResponse.ok) {
          throw new Error(historyResult.message || "Unable to load candidate history.");
        }
        if (!transfersResponse.ok) {
          throw new Error(transfersResult.message || "Unable to load client transfer requests.");
        }
        if (!employeesResponse.ok) {
          throw new Error(employeesResult.message || "Unable to load employees.");
        }

        setState({
          auditLogs: auditResult.logs ?? [],
          notifications: notificationsResult.notifications ?? [],
          history: historyResult.history ?? [],
          transfers: transfersResult.requests ?? [],
        });
        setEmployees(employeesResult.employees ?? []);
      }
      )
      .catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load activity center."
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const employeeLookup = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  );

  const feedItems = useMemo(() => {
    const auditItems = state.auditLogs.map((log) => ({
      id: `audit-${log.id}`,
      category: "audit",
      title: formatActionLabel(log.actionType),
      summary:
        (log.metadata?.candidateName as string | undefined) ||
        (log.metadata?.jobCode as string | undefined) ||
        (log.afterData?.companyName as string | undefined) ||
        "CRM change captured in audit trail.",
      actorName: log.actorName,
      actorRole: log.actorRole,
      createdAt: log.createdAt,
      employeeIds: log.actorId ? [log.actorId] : [],
    }));

    const notificationItems = state.notifications.map((item) => ({
      id: `notification-${item.id}`,
      category: "notification",
      title: item.title,
      summary: item.message,
      actorName:
        item.targetEmployeeId && employeeLookup.get(item.targetEmployeeId)
          ? employeeLookup.get(item.targetEmployeeId)?.fullName
          : "Notification Center",
      actorRole: item.category,
      createdAt: item.createdAt,
      employeeIds: item.targetEmployeeId ? [item.targetEmployeeId] : [],
    }));

    const historyItems = state.history.map((item) => ({
      id: `history-${item.id}`,
      category: "candidate-history",
      title: `${formatPersonName(item.candidateName)} moved to ${formatActionLabel(item.toStage)}`,
      summary: item.stageNote || item.jobTitle || "Candidate stage updated.",
      actorName: item.recruiterName,
      actorRole: "Recruiter",
      createdAt: item.changedAt,
      employeeIds: [],
    }));

    const transferItems = state.transfers.map((item) => ({
      id: `transfer-${item.id}`,
      category: "transfer",
      title: `${item.clientName} transfer ${formatActionLabel(item.status)}`,
      summary: item.reason || "Client transfer request updated.",
      actorName: item.reviewedByEmployeeName || item.requestedByEmployeeName,
      actorRole: item.status,
      createdAt: item.reviewedAt || item.createdAt,
      employeeIds: [
        item.requestedByEmployeeId,
        item.requestedToEmployeeId,
        item.reviewedByEmployeeId,
      ].filter(Boolean),
    }));

    return [...auditItems, ...notificationItems, ...historyItems, ...transferItems]
      .filter((item) => category === "all" || item.category === category)
      .filter(
        (item) =>
          employeeFilter === "all" ||
          item.employeeIds.includes(employeeFilter) ||
          item.actorName === employeeLookup.get(employeeFilter)?.fullName
      )
      .filter((item) => !dateFilter || getDateKey(item.createdAt) === dateFilter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [
    category,
    dateFilter,
    employeeFilter,
    employeeLookup,
    state.auditLogs,
    state.history,
    state.notifications,
    state.transfers,
  ]);

  return (
    <div className="space-y-6">
      <section className="accent-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Activity Center</p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">
              Review CRM operations, alerts, and movement in one place.
            </h2>
            <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
              Track admin actions, candidate movement, transfer reviews, and saved reminders from a
              dedicated operational feed.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[540px]">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value="all">All activity</option>
              <option value="audit">Audit logs</option>
              <option value="notification">Notifications</option>
              <option value="candidate-history">Candidate history</option>
              <option value="transfer">Transfers</option>
            </select>
            <select
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value="all">All employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} - {employee.employeeCode || employee.role}
                </option>
              ))}
            </select>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Activity Date
              </span>
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
                className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>
            <Link
              href="/admin/settings"
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-center text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
            >
              Open Settings
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Audit Events", value: state.auditLogs.length },
          { label: "Notifications", value: state.notifications.length },
          { label: "Candidate Updates", value: state.history.length },
          { label: "Transfer Events", value: state.transfers.length },
        ].map((card) => (
          <article key={card.label} className="accent-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="accent-card p-6">
        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        {isLoading ? (
          <p className="muted-copy text-sm">Loading activity center...</p>
        ) : feedItems.length === 0 ? (
          <div className="rounded-[1.35rem] border border-[var(--color-line)] bg-white p-6">
            <p className="font-semibold text-[var(--color-ink)]">No activity matched this view.</p>
            <p className="muted-copy mt-2 text-sm">
              Try another filter or keep working inside jobs, clients, and candidates to build the
              operational trail.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedItems.map((item) => (
              <article
                key={item.id}
                className="rounded-[1.25rem] border border-[var(--color-line)] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">{item.title}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {item.actorName || "Werkly User"}
                      {item.actorRole ? ` - ${formatActionLabel(item.actorRole)}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-dark)]">
                    {formatActionLabel(item.category)}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">{item.summary}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-accent-strong)]">
                  {formatDateTime(item.createdAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
