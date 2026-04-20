"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClientRecord, EmployeeRecord } from "@/lib/crm";
import type { JobApplication, JobSummary } from "@/lib/jobs";

function formatDate(value?: string) {
  if (!value) {
    return "Not added";
  }

  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function getDateKey(value?: string) {
  return value?.slice(0, 10) || "";
}

function downloadExcelReport(
  filename: string,
  sheetTitle: string,
  headings: string[],
  rows: Array<Array<string | number | undefined | null>>
) {
  const tableHead = headings.map((heading) => `<th>${heading}</th>`).join("");
  const tableRows = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${String(cell ?? "")}</td>`).join("")}</tr>`)
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><h1>${sheetTitle}</h1><table border="1"><thead><tr>${tableHead}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
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

export function AdminOperationsReports({ type }: { type: "aging" | "trends" }) {
  const [token] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("werklyAdminToken") ?? "" : ""
  );
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      fetch("/api/admin/jobs", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/clients", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/applications", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/employees", { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([jobsResponse, clientsResponse, applicationsResponse, employeesResponse]) => {
        const jobsResult = (await jobsResponse.json()) as { jobs?: JobSummary[]; message?: string };
        const clientsResult = (await clientsResponse.json()) as {
          clients?: ClientRecord[];
          message?: string;
        };
        const applicationsResult = (await applicationsResponse.json()) as {
          applications?: JobApplication[];
          message?: string;
        };
        const employeesResult = (await employeesResponse.json()) as {
          employees?: EmployeeRecord[];
          message?: string;
        };

        if (!jobsResponse.ok) {
          throw new Error(jobsResult.message || "Unable to load jobs.");
        }
        if (!clientsResponse.ok) {
          throw new Error(clientsResult.message || "Unable to load clients.");
        }
        if (!applicationsResponse.ok) {
          throw new Error(applicationsResult.message || "Unable to load candidates.");
        }
        if (!employeesResponse.ok) {
          throw new Error(employeesResult.message || "Unable to load employees.");
        }

        setJobs(jobsResult.jobs ?? []);
        setClients(clientsResult.clients ?? []);
        setApplications(applicationsResult.applications ?? []);
        setEmployees(employeesResult.employees ?? []);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load operations reports."
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const today = useMemo(() => new Date(), []);
  const todayKey = today.toISOString().slice(0, 10);

  const agingRows = useMemo(() => {
    const jobRows = jobs
      .filter((job) => job.status === "open")
      .map((job) => {
        const postedAt = new Date(job.postedAt);
        const ageDays = Math.max(0, Math.floor((today.getTime() - postedAt.getTime()) / 86400000));
        return {
          type: "Job",
          name: job.title,
          owner: job.recruiterName || "Unassigned",
          stage: job.status,
          ageDays,
          detail: `${job.applicationsCount} applications`,
        };
      });

    const clientRows = clients.map((client) => {
      const nextFollowUp = getDateKey(client.nextFollowUpDate);
      const lastFollowUp = getDateKey(client.lastFollowUpDate);
      const referenceDate = lastFollowUp || nextFollowUp || client.createdAt?.slice(0, 10);
      const ageDays = referenceDate
        ? Math.max(
            0,
            Math.floor(
              (today.getTime() - new Date(referenceDate).getTime()) / 86400000
            )
          )
        : 0;

      return {
        type: "Client",
        name: client.companyName,
        owner: client.assignedEmployeeName || "Not assigned",
        stage: client.followUpStatus || client.onboardingStatus || "pending",
        ageDays,
        detail: `Next ${formatDate(client.nextFollowUpDate)}`,
      };
    });

    const candidateRows = applications.map((application) => {
      const appliedDate = new Date(application.appliedAt);
      const ageDays = Math.max(0, Math.floor((today.getTime() - appliedDate.getTime()) / 86400000));
      return {
        type: "Candidate",
        name: application.candidateName,
        owner: application.recruiterName || "Unassigned",
        stage: application.stage || "applied",
        ageDays,
        detail: application.jobTitle || "No job linked",
      };
    });

    return [...jobRows, ...clientRows, ...candidateRows].sort((a, b) => b.ageDays - a.ageDays);
  }, [applications, clients, jobs, today]);

  const trendRows = useMemo(() => {
    const monthKeys = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
      return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
    });

    return monthKeys.map((monthKey) => {
      const jobsCount = jobs.filter((job) => job.postedAt?.startsWith(monthKey)).length;
      const candidatesCount = applications.filter((item) => item.appliedAt?.startsWith(monthKey)).length;
      const clientsCount = clients.filter((item) => item.createdAt?.startsWith(monthKey)).length;
      const activeEmployees = employees.filter((item) => item.status === "active").length;

      return {
        monthKey,
        jobsCount,
        candidatesCount,
        clientsCount,
        activeEmployees,
      };
    });
  }, [applications, clients, employees, jobs, today]);

  function exportRows() {
    if (type === "aging") {
      downloadExcelReport(
        "aging-report.xls",
        "Aging Report",
        ["Type", "Name", "Owner", "Current Stage", "Age Days", "Detail"],
        agingRows.map((row) => [row.type, row.name, row.owner, row.stage, row.ageDays, row.detail])
      );
      return;
    }

    downloadExcelReport(
      "trend-report.xls",
      "Trend Report",
      ["Month", "Jobs", "Candidates", "Clients", "Active Employees"],
      trendRows.map((row) => [row.monthKey, row.jobsCount, row.candidatesCount, row.clientsCount, row.activeEmployees])
    );
  }

  const rows = type === "aging" ? agingRows : trendRows;

  return (
    <div className="space-y-6">
      <section className="accent-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">{type === "aging" ? "Aging Report" : "Trend Report"}</p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">
              {type === "aging"
                ? "Track stale clients, open jobs, and candidate stage aging."
                : "Review monthly CRM movement across jobs, clients, candidates, and team size."}
            </h2>
            <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
              {type === "aging"
                ? "Use aging visibility to find mandates, clients, and candidates that need follow-up before they go cold."
                : `Trend visibility is based on the current CRM data captured up to ${todayKey}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={exportRows}
            disabled={rows.length === 0}
            className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export Current View
          </button>
        </div>
      </section>

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {isLoading ? (
        <section className="accent-card p-6">
          <p className="muted-copy text-sm">Loading report...</p>
        </section>
      ) : rows.length === 0 ? (
        <section className="accent-card p-6">
          <p className="font-semibold text-[var(--color-ink)]">No report data is available yet.</p>
          <p className="muted-copy mt-2 text-sm">
            Start posting jobs, onboarding clients, or moving candidates to populate this report.
          </p>
        </section>
      ) : (
        <section className="accent-card overflow-hidden p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse rounded-[1.35rem] bg-white">
              <thead className="sticky top-0 z-10 bg-[rgba(8,96,108,0.05)] text-left">
                <tr>
                  {(type === "aging"
                    ? ["Type", "Name", "Owner", "Current Stage", "Age Days", "Detail"]
                    : ["Month", "Jobs", "Candidates", "Clients", "Active Employees"]
                  ).map((heading) => (
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
                {type === "aging"
                  ? agingRows.map((row, index) => (
                      <tr
                        key={`${row.type}-${row.name}-${index}`}
                        className={
                          index === agingRows.length - 1
                            ? "align-top"
                            : "align-top border-b border-[var(--color-line)]"
                        }
                      >
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{row.type}</td>
                        <td className="px-4 py-4 font-semibold text-[var(--color-ink)]">{row.name}</td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{row.owner}</td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{row.stage}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-[var(--color-accent-strong)]">{row.ageDays}</td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{row.detail}</td>
                      </tr>
                    ))
                  : trendRows.map((row, index) => (
                      <tr
                        key={row.monthKey}
                        className={
                          index === trendRows.length - 1
                            ? "align-top"
                            : "align-top border-b border-[var(--color-line)]"
                        }
                      >
                        <td className="px-4 py-4 font-semibold text-[var(--color-ink)]">{row.monthKey}</td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{row.jobsCount}</td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{row.candidatesCount}</td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{row.clientsCount}</td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{row.activeEmployees}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
