"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AttendanceSessionRecord } from "@/lib/attendance";
import type { ScreenActivityRecord } from "@/lib/activity";
import type {
  ClientRecord,
  ClientTransferRequestRecord,
  EmployeeRecord,
} from "@/lib/crm";
import type {
  CandidateEnquiry,
  JobApplication,
  JobApplicationStageHistory,
  JobSummary,
} from "@/lib/jobs";
import type { ShiftAssignmentRecord } from "@/lib/shifts";
import { AdminJobIdTrigger } from "@/components/admin-job-id-trigger";

type ReportModule = "overview" | "hr" | "jobs" | "candidates" | "clients";
type ReportView =
  | "index"
  | "hr-attendance"
  | "hr-activity"
  | "jobs-performance"
  | "jobs-stage-movement"
  | "candidates-pipeline"
  | "candidates-sources"
  | "candidates-enquiries"
  | "clients-coverage"
  | "clients-followups"
  | "clients-transfers";

type ReportState = {
  applications: JobApplication[];
  history: JobApplicationStageHistory[];
  clients: ClientRecord[];
  employees: EmployeeRecord[];
  attendance: AttendanceSessionRecord[];
  activity: ScreenActivityRecord[];
  enquiries: CandidateEnquiry[];
  jobs: JobSummary[];
  shiftAssignments: ShiftAssignmentRecord[];
  transferRequests: ClientTransferRequestRecord[];
};

type AttendanceDaySummary = {
  key: string;
  userId?: string;
  userIdentifier: string;
  userName: string;
  reportDate: string;
  firstLoginAt: string;
  lastLogoutAt?: string;
  totalWorkedMs: number;
  activeSessionCount: number;
  sessions: AttendanceSessionRecord[];
  screenActiveSeconds: number;
  screenIdleSeconds: number;
  lastSeenAt?: string;
  isAutoLoggedOut?: boolean;
  shiftName?: string;
  shiftStartAt?: string;
  shiftEndAt?: string;
  shiftGraceMinutes?: number;
  lateByMs: number;
  earlyLogoutMs: number;
  overtimeMs: number;
  attendancePolicyStatus: string;
};

type AdminReportsPanelProps = {
  module?: ReportModule;
  report?: ReportView;
};

const reportModules: Array<{
  key: Exclude<ReportModule, "overview"> | "aging" | "trends";
  href: string;
  eyebrow: string;
  title: string;
  description: string;
}> = [
  {
    key: "hr",
    href: "/admin/reports/hr",
    eyebrow: "HR Reports",
    title: "Attendance, screen time, and employee visibility.",
    description:
      "Review worked hours, first login, last logout, employee activity, and current team status in one place.",
  },
  {
    key: "jobs",
    href: "/admin/reports/jobs",
    eyebrow: "Jobs Reports",
    title: "Mandate performance and application coverage.",
    description:
      "Track open jobs, application flow, recruiter ownership, and which mandates need more movement.",
  },
  {
    key: "candidates",
    href: "/admin/reports/candidates",
    eyebrow: "Candidates Reports",
    title: "Pipeline health and enquiry conversion.",
    description:
      "Measure candidate stage distribution, sourcing channels, recent applications, and website enquiries separately.",
  },
  {
    key: "clients",
    href: "/admin/reports/clients",
    eyebrow: "Clients Reports",
    title: "Client ownership, jobs, and transfer approvals.",
    description:
      "Track assigned clients, linked mandates, hiring volume, and reassignment requests that need follow-up.",
  },
  {
    key: "aging",
    href: "/admin/reports/aging",
    eyebrow: "Aging Report",
    title: "Stale clients, jobs, and candidates that need action.",
    description:
      "Track work items that are aging without enough movement so teams can focus before the pipeline cools down.",
  },
  {
    key: "trends",
    href: "/admin/reports/trends",
    eyebrow: "Trend Report",
    title: "Monthly jobs, candidates, clients, and team movement.",
    description:
      "Review operational trends on a separate screen instead of mixing monthly movement into module-specific reports.",
  },
];

const moduleReportScreens: Record<
  Exclude<ReportModule, "overview">,
  Array<{
    key: ReportView;
    href: string;
    eyebrow: string;
    title: string;
    description: string;
  }>
> = {
  hr: [
    {
      key: "hr-attendance",
      href: "/admin/reports/hr/attendance",
      eyebrow: "HR Attendance",
      title: "Login, logout, worked hours, and screen time.",
      description:
        "Review first login, last logout, worked hours, screen-active time, idle time, and auto-logout status on a dedicated HR report screen.",
    },
    {
      key: "hr-activity",
      href: "/admin/reports/hr/activity",
      eyebrow: "Employee Activity",
      title: "Current employee visibility and activity capture.",
      description:
        "Track last seen activity, first login, last logout, status, and daily CRM time visibility for each employee separately.",
    },
  ],
  jobs: [
    {
      key: "jobs-performance",
      href: "/admin/reports/jobs/performance",
      eyebrow: "Job Performance",
      title: "Mandate coverage, ownership, and application movement.",
      description:
        "See each open, draft, and closed mandate with client, recruiter, applications, and latest candidate activity in one report.",
    },
    {
      key: "jobs-stage-movement",
      href: "/admin/reports/jobs/stage-movement",
      eyebrow: "Stage Movement",
      title: "Audit every stage change with remarks and dates.",
      description:
        "Review shortlist, interview, offer, joined, and rejection updates on a separate stage movement report screen.",
    },
  ],
  candidates: [
    {
      key: "candidates-pipeline",
      href: "/admin/reports/candidates/pipeline",
      eyebrow: "Candidate Pipeline",
      title: "Current stage, source, and recruiter ownership.",
      description:
        "Track applicants by source and current stage with filters and export on a focused candidate pipeline screen.",
    },
    {
      key: "candidates-sources",
      href: "/admin/reports/candidates/sources",
      eyebrow: "Source Mix",
      title: "Compare sourcing channels separately.",
      description:
        "Review source-wise candidate volume so the team can understand where quality applications are coming from.",
    },
    {
      key: "candidates-enquiries",
      href: "/admin/reports/candidates/enquiries",
      eyebrow: "Candidate Enquiries",
      title: "Website enquiries without a direct job application.",
      description:
        "Keep general candidate enquiries on their own screen instead of mixing them with job applicant pipeline data.",
    },
  ],
  clients: [
    {
      key: "clients-coverage",
      href: "/admin/reports/clients/coverage",
      eyebrow: "Client Coverage",
      title: "Ownership, linked jobs, and hiring volume.",
      description:
        "Review onboarded clients, ownership, linked mandates, applications, joined count, and status on a dedicated report page.",
    },
    {
      key: "clients-followups",
      href: "/admin/reports/clients/followups",
      eyebrow: "Client Follow-Ups",
      title: "Onboarding and relationship follow-up tracking.",
      description:
        "Filter client onboarding follow-ups by employee, client, related job, and date range on a separate follow-up report screen.",
    },
    {
      key: "clients-transfers",
      href: "/admin/reports/clients/transfers",
      eyebrow: "Client Transfers",
      title: "Ownership transfer approvals and movement audit.",
      description:
        "Review pending, approved, and rejected client transfer requests on their own report screen for admin control.",
    },
  ],
};

const AUTO_LOGOUT_THRESHOLD_MS = 10 * 60 * 1000;

function formatDateTime(value?: string) {
  if (!value) {
    return "Not captured";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDate(value?: string) {
  if (!value) {
    return "Not added";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    dateStyle: "medium",
  });
}

function formatDuration(totalMs: number) {
  const safeMs = Math.max(totalMs, 0);
  const totalMinutes = Math.floor(safeMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function getDayEndMs(dateKey: string) {
  return new Date(`${dateKey}T23:59:59.999`).getTime();
}

function getShiftBoundaryMs(reportDate: string, timeValue?: string) {
  if (!timeValue) {
    return null;
  }

  const normalizedTimeValue = /^\d{2}:\d{2}$/.test(timeValue)
    ? `${timeValue}:00`
    : timeValue;
  const boundaryMs = new Date(`${reportDate}T${normalizedTimeValue}`).getTime();
  return Number.isNaN(boundaryMs) ? null : boundaryMs;
}

function getShiftRange(
  assignment: ShiftAssignmentRecord | undefined,
  reportDate: string
) {
  if (!assignment?.shiftStartTime || !assignment.shiftEndTime) {
    return null;
  }

  const shiftStartMs = getShiftBoundaryMs(reportDate, assignment.shiftStartTime);
  const rawShiftEndMs = getShiftBoundaryMs(reportDate, assignment.shiftEndTime);

  if (!shiftStartMs || !rawShiftEndMs) {
    return null;
  }

  let shiftEndMs = rawShiftEndMs;
  if (shiftEndMs <= shiftStartMs) {
    shiftEndMs += 24 * 60 * 60 * 1000;
  }

  const shiftGraceMs = shiftStartMs + assignment.graceMinutes * 60 * 1000;

  return {
    shiftStartMs,
    shiftEndMs,
    shiftGraceMs,
  };
}

function formatShiftSlot(startAt?: string, endAt?: string) {
  if (!startAt || !endAt) {
    return "Not assigned";
  }

  return `${new Date(startAt).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} - ${new Date(endAt).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;
}

function getAttendancePolicyLabel(summary: AttendanceDaySummary) {
  if (!summary.shiftName) {
    return "No shift assigned";
  }

  if (!summary.firstLoginAt) {
    return "No attendance";
  }

  const flags: string[] = [];

  if (summary.totalWorkedMs < 4 * 60 * 60 * 1000) {
    flags.push("Short attendance");
  }
  if (summary.lateByMs > 0) {
    flags.push("Late");
  }
  if (summary.earlyLogoutMs > 0) {
    flags.push("Early logout");
  }
  if (summary.overtimeMs > 0) {
    flags.push("Overtime");
  }
  if (summary.activeSessionCount > 0) {
    flags.push("Open session");
  }

  return flags.length > 0 ? flags.join(", ") : "On time";
}

function getAttendancePolicyMetrics(summary: AttendanceDaySummary) {
  const shiftStartMs = summary.shiftStartAt ? new Date(summary.shiftStartAt).getTime() : null;
  const shiftEndMs = summary.shiftEndAt ? new Date(summary.shiftEndAt).getTime() : null;
  const firstLoginMs = summary.firstLoginAt ? new Date(summary.firstLoginAt).getTime() : null;
  const lastLogoutMs = summary.lastLogoutAt ? new Date(summary.lastLogoutAt).getTime() : null;

  if (
    !shiftStartMs ||
    Number.isNaN(shiftStartMs) ||
    !shiftEndMs ||
    Number.isNaN(shiftEndMs)
  ) {
    return {
      lateByMs: 0,
      earlyLogoutMs: 0,
      overtimeMs: 0,
      attendancePolicyStatus: getAttendancePolicyLabel({
        ...summary,
        lateByMs: 0,
        earlyLogoutMs: 0,
        overtimeMs: 0,
      }),
    };
  }

  const shiftGraceMs = shiftStartMs + (summary.shiftGraceMinutes ?? 0) * 60 * 1000;

  const lateByMs =
    firstLoginMs && !Number.isNaN(firstLoginMs) && firstLoginMs > shiftGraceMs
      ? firstLoginMs - shiftGraceMs
      : 0;
  const earlyLogoutMs =
    lastLogoutMs && !Number.isNaN(lastLogoutMs) && lastLogoutMs < shiftEndMs
      ? shiftEndMs - lastLogoutMs
      : 0;
  const overtimeMs =
    lastLogoutMs && !Number.isNaN(lastLogoutMs) && lastLogoutMs > shiftEndMs
      ? lastLogoutMs - shiftEndMs
      : 0;

  return {
    lateByMs,
    earlyLogoutMs,
    overtimeMs,
    attendancePolicyStatus: getAttendancePolicyLabel({
      ...summary,
      lateByMs,
      earlyLogoutMs,
      overtimeMs,
    }),
  };
}

function getCandidateSourceLabel(application: JobApplication) {
  const source = application.sourceType || application.entryType || "manual";

  return source
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStageLabel(stage?: string) {
  const safeStage = stage || "applied";
  return safeStage
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getFollowUpStatusLabel(status?: string) {
  const safeStatus = status || "pending";

  return safeStatus
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getJobFilterLabel(job: JobSummary) {
  const code = job.jobCode || "Pending ID";
  return `${code} - ${job.title}`;
}

function getDateKey(value?: string) {
  return value?.slice(0, 10) || "";
}

function isWithinDateRange(value: string | undefined, startDate: string, endDate: string) {
  if (!value) {
    return false;
  }

  const dateKey = value.slice(0, 10);
  if (startDate && dateKey < startDate) {
    return false;
  }
  if (endDate && dateKey > endDate) {
    return false;
  }

  return true;
}

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

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <article className="accent-card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">{value}</p>
      {detail ? <p className="muted-copy mt-2 text-sm">{detail}</p> : null}
    </article>
  );
}

function ReportLinkCard({
  href,
  eyebrow,
  title,
  description,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="accent-card group flex h-full flex-col justify-between p-6 transition hover:-translate-y-0.5 hover:border-[rgba(241,166,75,0.26)]"
    >
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-4 text-2xl font-semibold leading-tight text-[var(--color-ink)]">
          {title}
        </h2>
        <p className="muted-copy mt-3 text-base leading-7">{description}</p>
      </div>
      <span className="mt-6 inline-flex text-sm font-semibold text-[var(--color-accent-strong)]">
        Open report
      </span>
    </Link>
  );
}

function ReportTable({
  headings,
  children,
}: {
  headings: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-[rgba(8,96,108,0.05)] text-left">
              {headings.map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function ReportFilterBar({
  startDate,
  endDate,
  exactDate,
  onStartDateChange,
  onEndDateChange,
  onExactDateChange,
  recruiterOptions,
  selectedRecruiter,
  onRecruiterChange,
  recruiterLabel,
  clientOptions,
  selectedClient,
  onClientChange,
  jobOptions,
  selectedJob,
  onJobChange,
  stageOptions,
  selectedStage,
  onStageChange,
  sourceOptions,
  selectedSource,
  onSourceChange,
  onExport,
  exportLabel,
  onSaveView,
  saveFeedback,
}: {
  startDate: string;
  endDate: string;
  exactDate?: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onExactDateChange?: (value: string) => void;
  recruiterOptions?: string[];
  selectedRecruiter?: string;
  onRecruiterChange?: (value: string) => void;
  recruiterLabel?: string;
  clientOptions?: string[];
  selectedClient?: string;
  onClientChange?: (value: string) => void;
  jobOptions?: string[];
  selectedJob?: string;
  onJobChange?: (value: string) => void;
  stageOptions?: string[];
  selectedStage?: string;
  onStageChange?: (value: string) => void;
  sourceOptions?: string[];
  selectedSource?: string;
  onSourceChange?: (value: string) => void;
  onExport: () => void;
  exportLabel: string;
  onSaveView?: () => void;
  saveFeedback?: string;
}) {
  return (
    <section className="accent-card p-5">
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(6,minmax(0,1fr))_auto_auto] xl:items-end">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Start Date
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              End Date
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => onEndDateChange(event.target.value)}
              className="w-full rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
            />
          </label>

          {onExactDateChange ? (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Day Filter
              </span>
              <input
                type="date"
                value={exactDate ?? ""}
                onChange={(event) => onExactDateChange(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>
          ) : null}

          {recruiterOptions && onRecruiterChange ? (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                {recruiterLabel || "Recruiter"}
              </span>
              <select
                value={selectedRecruiter ?? ""}
                onChange={(event) => onRecruiterChange(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              >
                <option value="">All Recruiters</option>
                {recruiterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {clientOptions && onClientChange ? (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Client
              </span>
              <select
                value={selectedClient ?? ""}
                onChange={(event) => onClientChange(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              >
                <option value="">All Clients</option>
                {clientOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {jobOptions && onJobChange ? (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Job
              </span>
              <select
                value={selectedJob ?? ""}
                onChange={(event) => onJobChange(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              >
                <option value="">All Jobs</option>
                {jobOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {sourceOptions && onSourceChange ? (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Source
              </span>
              <select
                value={selectedSource ?? ""}
                onChange={(event) => onSourceChange(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              >
                <option value="">All Sources</option>
                {sourceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {stageOptions && onStageChange ? (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Current Stage
              </span>
              <select
                value={selectedStage ?? ""}
                onChange={(event) => onStageChange(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              >
                <option value="">All Stages</option>
                {stageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {onSaveView ? (
            <button
              type="button"
              onClick={onSaveView}
              className="h-[50px] inline-flex items-center justify-center rounded-xl border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--color-dark)] transition hover:border-[var(--color-dark)] hover:bg-[rgba(8,96,108,0.06)]"
            >
              Save Current View
            </button>
          ) : null}
          <button
            type="button"
            onClick={onExport}
            className="h-[50px] inline-flex items-center justify-center rounded-xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(8,96,108,0.92)]"
          >
            {exportLabel}
          </button>
        </div>
        {saveFeedback ? (
          <p className="text-sm font-medium text-[var(--color-dark)]">{saveFeedback}</p>
        ) : null}
      </div>
    </section>
  );
}

export function AdminReportsPanel({
  module = "overview",
  report = "index",
}: AdminReportsPanelProps) {
  const [reportGeneratedAt] = useState(() => Date.now());
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
  const [authRole] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthRole") ?? "super-admin"
      : "super-admin"
  );
  const [state, setState] = useState<ReportState>({
    applications: [],
    history: [],
    clients: [],
    employees: [],
    attendance: [],
    activity: [],
    enquiries: [],
    jobs: [],
    shiftAssignments: [],
    transferRequests: [],
  });
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exactDate, setExactDate] = useState("");
  const [selectedRecruiter, setSelectedRecruiter] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [viewMessage, setViewMessage] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadJson = async (path: string) => {
      const response = await fetch(path, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load report data.");
      }

      return result;
    };

    Promise.all([
      loadJson("/api/admin/applications"),
      loadJson("/api/admin/applications/history"),
      loadJson("/api/admin/clients"),
      loadJson("/api/admin/employees"),
      loadJson("/api/admin/attendance"),
      loadJson("/api/admin/activity"),
      loadJson("/api/admin/candidate-enquiries"),
      loadJson("/api/admin/jobs"),
      loadJson("/api/admin/shifts/assignments"),
      loadJson("/api/admin/client-transfer-requests"),
    ])
      .then(
        ([
          applicationsResult,
          historyResult,
          clientsResult,
          employeesResult,
          attendanceResult,
          activityResult,
          enquiriesResult,
          jobsResult,
          shiftAssignmentsResult,
          transferRequestsResult,
        ]) => {
          setState({
            applications: applicationsResult.applications ?? [],
            history: historyResult.history ?? [],
            clients: clientsResult.clients ?? [],
            employees: employeesResult.employees ?? [],
            attendance: attendanceResult.attendance ?? [],
            activity: activityResult.activity ?? [],
            enquiries: enquiriesResult.enquiries ?? [],
            jobs: jobsResult.jobs ?? [],
            shiftAssignments: shiftAssignmentsResult.assignments ?? [],
            transferRequests: transferRequestsResult.requests ?? [],
          });
        }
      )
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const saveCurrentReportView = async () => {
    if (!token || report === "index") {
      return;
    }

    setViewMessage("");

    try {
      const response = await fetch("/api/admin/saved-views", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          moduleKey: module,
          viewKey: report,
          viewName: `${String(module).toUpperCase()} ${String(report).replaceAll("-", " ")}`,
          ownerType: authType === "admin" ? "admin" : "employee",
          roleKey: authRole,
          isShared: authType === "admin",
          filters: {
            authType,
            authRole,
            authEmail,
            authEmployeeCode,
            startDate,
            endDate,
            exactDate,
            selectedRecruiter,
            selectedClient,
            selectedJob,
            selectedSource,
            selectedStage,
          },
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to save this report view.");
      }

      setViewMessage("Current report filters saved.");
      window.setTimeout(() => setViewMessage(""), 3000);
    } catch (saveError) {
      setViewMessage(
        saveError instanceof Error ? saveError.message : "Unable to save this report view."
      );
    }
  };

  const isEmployeeSession = authType === "employee" || Boolean(authEmployeeCode);
  const currentEmployeeId = state.employees.find(
    (employee) => employee.employeeCode === authEmployeeCode || employee.email === authEmail
  )?.id;

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

  const visibleAttendance = useMemo(() => {
    if (!isEmployeeSession) {
      return state.attendance;
    }

    return state.attendance.filter(
      (session) =>
        session.userIdentifier === authEmployeeCode ||
        session.userIdentifier === authEmail ||
        session.userId === currentEmployeeId
    );
  }, [authEmail, authEmployeeCode, currentEmployeeId, isEmployeeSession, state.attendance]);

  const visibleActivity = useMemo(() => {
    if (!isEmployeeSession) {
      return state.activity;
    }

    return state.activity.filter(
      (entry) =>
        entry.userIdentifier === authEmployeeCode ||
        entry.userIdentifier === authEmail ||
        entry.userId === currentEmployeeId
    );
  }, [authEmail, authEmployeeCode, currentEmployeeId, isEmployeeSession, state.activity]);

  const visibleClients = useMemo(() => {
    if (!isEmployeeSession) {
      return state.clients;
    }

    return state.clients.filter(
      (client) =>
        client.assignedEmployeeId === currentEmployeeId ||
        client.followUpEmployeeId === currentEmployeeId
    );
  }, [currentEmployeeId, isEmployeeSession, state.clients]);

  const visibleJobs = useMemo(() => {
    if (!isEmployeeSession) {
      return state.jobs;
    }

    return state.jobs.filter(
      (job) =>
        job.recruiterId === currentEmployeeId ||
        job.recruiterEmail === authEmail ||
        job.clientFollowUpEmployeeId === currentEmployeeId
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

  const visibleHistory = useMemo(() => {
    if (!isEmployeeSession) {
      return state.history;
    }

    const visibleJobIds = new Set(visibleJobs.map((job) => job.id));

    return state.history.filter(
      (item) => item.recruiterEmail === authEmail || (item.jobId ? visibleJobIds.has(item.jobId) : false)
    );
  }, [authEmail, isEmployeeSession, state.history, visibleJobs]);

  const visibleTransferRequests = useMemo(() => {
    if (!isEmployeeSession) {
      return state.transferRequests;
    }

    return state.transferRequests.filter(
      (request) =>
        request.requestedByEmployeeId === currentEmployeeId ||
        request.requestedToEmployeeId === currentEmployeeId
    );
  }, [currentEmployeeId, isEmployeeSession, state.transferRequests]);

  const recruiterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          visibleEmployees
            .map((employee) => employee.fullName)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
        )
      ),
    [visibleEmployees]
  );

  const clientOptions = useMemo(
    () =>
      Array.from(
        new Set(
          visibleClients
            .map((client) => client.companyName)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b))
        )
      ),
    [visibleClients]
  );

  const jobOptions = useMemo(
    () =>
      Array.from(
        new Set(
          visibleJobs
            .filter((job) => job.title)
            .map((job) => getJobFilterLabel(job))
            .sort((a, b) => a.localeCompare(b))
        )
      ),
    [visibleJobs]
  );

  const attendanceSummary = useMemo(() => {
    const summaries = new Map<string, AttendanceDaySummary>();
    const activitySummaryMap = new Map<
      string,
      { activeSeconds: number; idleSeconds: number; lastSeenAt?: string }
    >();
    const sessionActivityMap = new Map<
      string,
      { activeSeconds: number; idleSeconds: number; lastSeenAt?: string }
    >();

    const findShiftAssignment = (
      userId: string | undefined,
      userIdentifier: string,
      reportDate: string
    ) => {
      return state.shiftAssignments
        .filter((assignment) => {
          const sameEmployee =
            assignment.employeeId === userId ||
            assignment.employeeCode === userIdentifier ||
            assignment.employeeEmail === userIdentifier;
          if (!sameEmployee) {
            return false;
          }

          const startDate = assignment.effectiveFromDate?.slice(0, 10);
          const endDate = assignment.effectiveToDate?.slice(0, 10);
          if (!startDate) {
            return false;
          }

          return startDate <= reportDate && (!endDate || endDate >= reportDate);
        })
        .sort(
          (first, second) =>
            new Date(second.effectiveFromDate).getTime() -
            new Date(first.effectiveFromDate).getTime()
        )[0];
    };

    visibleActivity.forEach((entry) => {
      const reportDate = entry.lastSeenAt.slice(0, 10);
      const userKey = entry.userId || entry.userIdentifier;
      const summaryKey = `${userKey}-${reportDate}`;
      const existing = activitySummaryMap.get(summaryKey) ?? {
        activeSeconds: 0,
        idleSeconds: 0,
      };

      existing.activeSeconds += entry.activeSeconds;
      existing.idleSeconds += entry.idleSeconds;
      if (
        !existing.lastSeenAt ||
        new Date(entry.lastSeenAt).getTime() > new Date(existing.lastSeenAt).getTime()
      ) {
        existing.lastSeenAt = entry.lastSeenAt;
      }

      activitySummaryMap.set(summaryKey, existing);

      const sessionKey = `${entry.sessionId}-${reportDate}`;
      const existingSession = sessionActivityMap.get(sessionKey) ?? {
        activeSeconds: 0,
        idleSeconds: 0,
      };
      existingSession.activeSeconds += entry.activeSeconds;
      existingSession.idleSeconds += entry.idleSeconds;
      if (
        !existingSession.lastSeenAt ||
        new Date(entry.lastSeenAt).getTime() > new Date(existingSession.lastSeenAt).getTime()
      ) {
        existingSession.lastSeenAt = entry.lastSeenAt;
      }
      sessionActivityMap.set(sessionKey, existingSession);
    });

    visibleAttendance.forEach((session) => {
      const reportDate = session.loginAt.slice(0, 10);
      const userKey = session.userId || session.userIdentifier;
      const summaryKey = `${userKey}-${reportDate}`;
      const existing = summaries.get(summaryKey);
      const loginTime = new Date(session.loginAt).getTime();
      const sessionActivity = sessionActivityMap.get(`${session.sessionId}-${reportDate}`);
      const dayEndMs = getDayEndMs(reportDate);
      const lastSeenMs = sessionActivity?.lastSeenAt
        ? new Date(sessionActivity.lastSeenAt).getTime()
        : null;
      const shiftAssignment = findShiftAssignment(
        session.userId,
        session.userIdentifier,
        reportDate
      );
      const shiftRange = getShiftRange(shiftAssignment, reportDate);

      let effectiveLogoutMs = session.logoutAt ? new Date(session.logoutAt).getTime() : null;
      let sessionAutoLoggedOut = false;

      if (lastSeenMs && !Number.isNaN(lastSeenMs)) {
        const inactivityLogoutMs = lastSeenMs + AUTO_LOGOUT_THRESHOLD_MS;

        if (!effectiveLogoutMs) {
          if (reportGeneratedAt - lastSeenMs >= AUTO_LOGOUT_THRESHOLD_MS) {
            effectiveLogoutMs = inactivityLogoutMs;
            sessionAutoLoggedOut = true;
          }
        } else if (inactivityLogoutMs < effectiveLogoutMs) {
          effectiveLogoutMs = inactivityLogoutMs;
          sessionAutoLoggedOut = true;
        }
      }

      if (effectiveLogoutMs) {
        effectiveLogoutMs = Math.min(effectiveLogoutMs, dayEndMs);
      }

      const workedMs =
        effectiveLogoutMs && effectiveLogoutMs >= loginTime ? effectiveLogoutMs - loginTime : 0;
      const effectiveLogoutAt = effectiveLogoutMs
        ? new Date(effectiveLogoutMs).toISOString()
        : undefined;
      const inferredIdleSeconds =
        sessionAutoLoggedOut && lastSeenMs && effectiveLogoutMs
          ? Math.max(0, Math.floor((effectiveLogoutMs - lastSeenMs) / 1000))
          : 0;

      if (!existing) {
        summaries.set(summaryKey, {
          key: summaryKey,
          userId: session.userId,
          userIdentifier: session.userIdentifier,
          userName: session.userName || session.userIdentifier,
          reportDate,
          firstLoginAt: session.loginAt,
          lastLogoutAt: effectiveLogoutAt,
          totalWorkedMs: workedMs,
          activeSessionCount: effectiveLogoutAt ? 0 : 1,
          sessions: [session],
          screenActiveSeconds: activitySummaryMap.get(summaryKey)?.activeSeconds ?? 0,
          screenIdleSeconds: Math.max(
            activitySummaryMap.get(summaryKey)?.idleSeconds ?? 0,
            inferredIdleSeconds
          ),
          lastSeenAt: activitySummaryMap.get(summaryKey)?.lastSeenAt,
          isAutoLoggedOut: sessionAutoLoggedOut,
          shiftName: shiftAssignment?.shiftName,
          shiftStartAt: shiftRange ? new Date(shiftRange.shiftStartMs).toISOString() : undefined,
          shiftEndAt: shiftRange ? new Date(shiftRange.shiftEndMs).toISOString() : undefined,
          shiftGraceMinutes: shiftAssignment?.graceMinutes ?? 0,
          lateByMs:
            shiftRange && loginTime > shiftRange.shiftGraceMs
              ? loginTime - shiftRange.shiftGraceMs
              : 0,
          earlyLogoutMs:
            shiftRange && effectiveLogoutMs && effectiveLogoutMs < shiftRange.shiftEndMs
              ? shiftRange.shiftEndMs - effectiveLogoutMs
              : 0,
          overtimeMs:
            shiftRange && effectiveLogoutMs && effectiveLogoutMs > shiftRange.shiftEndMs
              ? effectiveLogoutMs - shiftRange.shiftEndMs
              : 0,
          attendancePolicyStatus: shiftAssignment?.shiftName ? "On time" : "No shift assigned",
        });
        return;
      }

      existing.sessions.push(session);
      existing.totalWorkedMs += workedMs;
      existing.activeSessionCount += effectiveLogoutAt ? 0 : 1;

      if (new Date(session.loginAt).getTime() < new Date(existing.firstLoginAt).getTime()) {
        existing.firstLoginAt = session.loginAt;
      }

      if (
        effectiveLogoutAt &&
        (!existing.lastLogoutAt ||
          new Date(effectiveLogoutAt).getTime() > new Date(existing.lastLogoutAt).getTime())
      ) {
        existing.lastLogoutAt = effectiveLogoutAt;
      }

      existing.screenActiveSeconds = activitySummaryMap.get(summaryKey)?.activeSeconds ?? 0;
      existing.screenIdleSeconds = Math.max(
        activitySummaryMap.get(summaryKey)?.idleSeconds ?? 0,
        inferredIdleSeconds
      );
      existing.lastSeenAt = activitySummaryMap.get(summaryKey)?.lastSeenAt;
      existing.isAutoLoggedOut = existing.isAutoLoggedOut || sessionAutoLoggedOut;
      if (!existing.shiftName && shiftAssignment?.shiftName) {
        existing.shiftName = shiftAssignment.shiftName;
      }
      if (!existing.shiftStartAt && shiftRange) {
        existing.shiftStartAt = new Date(shiftRange.shiftStartMs).toISOString();
      }
      if (!existing.shiftEndAt && shiftRange) {
        existing.shiftEndAt = new Date(shiftRange.shiftEndMs).toISOString();
      }
      if ((existing.shiftGraceMinutes ?? 0) <= 0 && shiftAssignment) {
        existing.shiftGraceMinutes = shiftAssignment.graceMinutes ?? 0;
      }
      existing.lateByMs = Math.max(
        existing.lateByMs,
        shiftRange && loginTime > shiftRange.shiftGraceMs
          ? loginTime - shiftRange.shiftGraceMs
          : 0
      );
      existing.earlyLogoutMs = Math.max(
        existing.earlyLogoutMs,
        shiftRange && effectiveLogoutMs && effectiveLogoutMs < shiftRange.shiftEndMs
          ? shiftRange.shiftEndMs - effectiveLogoutMs
          : 0
      );
      existing.overtimeMs +=
        shiftRange && effectiveLogoutMs && effectiveLogoutMs > shiftRange.shiftEndMs
          ? effectiveLogoutMs - shiftRange.shiftEndMs
          : 0;
      existing.attendancePolicyStatus = existing.shiftName ? "On time" : "No shift assigned";
    });

    return Array.from(summaries.values())
      .map((summary) => {
        let effectiveLastLogoutAt = summary.lastLogoutAt;
        let effectiveIdleSeconds = summary.screenIdleSeconds;
        let isAutoLoggedOut = Boolean(summary.isAutoLoggedOut);

        if (!effectiveLastLogoutAt && summary.lastSeenAt) {
          const lastSeenMs = new Date(summary.lastSeenAt).getTime();
          if (reportGeneratedAt - lastSeenMs >= AUTO_LOGOUT_THRESHOLD_MS) {
            const fallbackLogoutMs = Math.min(
              lastSeenMs + AUTO_LOGOUT_THRESHOLD_MS,
              getDayEndMs(summary.reportDate)
            );
            effectiveLastLogoutAt = new Date(fallbackLogoutMs).toISOString();
            effectiveIdleSeconds = Math.max(
              effectiveIdleSeconds,
              Math.max(0, Math.floor((fallbackLogoutMs - lastSeenMs) / 1000))
            );
            isAutoLoggedOut = true;
          }
        }

        const finalSummary = {
          ...summary,
          lastLogoutAt: effectiveLastLogoutAt,
          screenIdleSeconds: effectiveIdleSeconds,
          activeSessionCount: effectiveLastLogoutAt ? 0 : summary.activeSessionCount,
          isAutoLoggedOut,
        };
        const policyMetrics = getAttendancePolicyMetrics(finalSummary);

        return {
          ...finalSummary,
          ...policyMetrics,
        };
      })
      .sort((a, b) => {
        const dateSort = new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
        if (dateSort !== 0) {
          return dateSort;
        }

        return a.userName.localeCompare(b.userName);
      });
  }, [reportGeneratedAt, state.shiftAssignments, visibleActivity, visibleAttendance]);

  const employeeActivityRows = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const attendanceByEmployee = new Map<
      string,
      { firstLoginAt?: string; lastLogoutAt?: string; activeSessions: number }
    >();
    const activityByEmployee = new Map<
      string,
      { activeSeconds: number; idleSeconds: number; lastSeenAt?: string }
    >();

    visibleAttendance
      .filter((session) => session.loginAt.slice(0, 10) === todayKey)
      .forEach((session) => {
        const key = session.userId || session.userIdentifier;
        const existing = attendanceByEmployee.get(key) ?? { activeSessions: 0 };

        if (
          !existing.firstLoginAt ||
          new Date(session.loginAt).getTime() < new Date(existing.firstLoginAt).getTime()
        ) {
          existing.firstLoginAt = session.loginAt;
        }

        if (
          session.logoutAt &&
          (!existing.lastLogoutAt ||
            new Date(session.logoutAt).getTime() > new Date(existing.lastLogoutAt).getTime())
        ) {
          existing.lastLogoutAt = session.logoutAt;
        }

        existing.activeSessions += session.logoutAt ? 0 : 1;
        attendanceByEmployee.set(key, existing);
      });

    visibleActivity
      .filter((entry) => entry.lastSeenAt.slice(0, 10) === todayKey)
      .forEach((entry) => {
        const key = entry.userId || entry.userIdentifier;
        const existing = activityByEmployee.get(key) ?? {
          activeSeconds: 0,
          idleSeconds: 0,
        };

        existing.activeSeconds += entry.activeSeconds;
        existing.idleSeconds += entry.idleSeconds;

        if (
          !existing.lastSeenAt ||
          new Date(entry.lastSeenAt).getTime() > new Date(existing.lastSeenAt).getTime()
        ) {
          existing.lastSeenAt = entry.lastSeenAt;
        }

        activityByEmployee.set(key, existing);
      });

    return visibleEmployees.map((employee) => {
      const activitySummary =
        activityByEmployee.get(employee.id) ??
        activityByEmployee.get(employee.employeeCode || "") ??
        activityByEmployee.get(employee.email);
      const attendanceSummaryForEmployee =
        attendanceByEmployee.get(employee.id) ??
        attendanceByEmployee.get(employee.employeeCode || "") ??
        attendanceByEmployee.get(employee.email);

      return {
        employee,
        activitySummary,
        attendanceSummary:
          attendanceSummaryForEmployee &&
          !attendanceSummaryForEmployee.lastLogoutAt &&
          activitySummary?.lastSeenAt &&
          reportGeneratedAt - new Date(activitySummary.lastSeenAt).getTime() >= AUTO_LOGOUT_THRESHOLD_MS
            ? {
                ...attendanceSummaryForEmployee,
                lastLogoutAt: new Date(
                  new Date(activitySummary.lastSeenAt).getTime() + AUTO_LOGOUT_THRESHOLD_MS
                ).toISOString(),
                activeSessions: 0,
              }
            : attendanceSummaryForEmployee,
      };
    });
  }, [reportGeneratedAt, visibleActivity, visibleAttendance, visibleEmployees]);

  const jobsReportRows = useMemo(() => {
    const applicationCounts = new Map<string, number>();
    const latestAppliedAt = new Map<string, string>();

    visibleApplications.forEach((application) => {
      applicationCounts.set(application.jobId, (applicationCounts.get(application.jobId) ?? 0) + 1);
      const currentLatest = latestAppliedAt.get(application.jobId);
      if (
        !currentLatest ||
        new Date(application.appliedAt).getTime() > new Date(currentLatest).getTime()
      ) {
        latestAppliedAt.set(application.jobId, application.appliedAt);
      }
    });

    return visibleJobs
      .map((job) => ({
        ...job,
        applicationCount: applicationCounts.get(job.id) ?? job.applicationsCount ?? 0,
        latestAppliedAt: latestAppliedAt.get(job.id),
      }))
      .sort((a, b) => b.applicationCount - a.applicationCount);
  }, [visibleApplications, visibleJobs]);

  const clientReportRows = useMemo(() => {
    return visibleClients
      .map((client) => {
        const applicationsForClient = visibleApplications.filter(
          (application) => application.clientName === client.companyName
        );

        return {
          client,
          applicationsCount: applicationsForClient.length,
          joinedCount: applicationsForClient.filter(
            (application) => (application.stage ?? "applied") === "joined"
          ).length,
        };
      })
      .sort((a, b) => b.client.linkedJobsCount - a.client.linkedJobsCount);
  }, [visibleApplications, visibleClients]);

  const followUpReportRows = useMemo(() => {
    return visibleClients
      .map((client) => {
        const linkedJobs = visibleJobs.filter(
          (job) =>
            job.clientId === client.id ||
            (job.clientName || "").trim().toLowerCase() ===
              client.companyName.trim().toLowerCase()
        );

        const linkedJobLabels =
          linkedJobs.length > 0
            ? linkedJobs.map((job) => getJobFilterLabel(job))
            : client.linkedJobs.map((job) => `${job.jobCode || "Pending ID"} - ${job.title}`);

        const applicationsForClient = visibleApplications.filter(
          (application) => application.clientName === client.companyName
        );

        return {
          client,
          linkedJobs,
          linkedJobLabels,
          recruiterName: client.assignedEmployeeName || "Not assigned",
          applicationsCount: applicationsForClient.length,
          joinedCount: applicationsForClient.filter(
            (application) => (application.stage ?? "applied") === "joined"
          ).length,
        };
      })
      .filter(
        (row) =>
          row.client.followUpStatus ||
          row.client.nextFollowUpDate ||
          row.client.lastFollowUpDate ||
          row.client.followUpNotes
      )
      .sort((a, b) => {
        const aDate = getDateKey(a.client.nextFollowUpDate || a.client.lastFollowUpDate);
        const bDate = getDateKey(b.client.nextFollowUpDate || b.client.lastFollowUpDate);
        return bDate.localeCompare(aDate);
      });
  }, [visibleApplications, visibleClients, visibleJobs]);

  const filteredAttendanceSummary = useMemo(
    () =>
      attendanceSummary.filter(
        (summary) =>
          (!selectedRecruiter || summary.userName === selectedRecruiter) &&
          (!exactDate || getDateKey(summary.reportDate) === exactDate) &&
          isWithinDateRange(summary.reportDate, startDate, endDate)
      ),
    [attendanceSummary, endDate, exactDate, selectedRecruiter, startDate]
  );

  const filteredEmployeeActivityRows = useMemo(
    () =>
      employeeActivityRows.filter(
        (row) =>
          (!selectedRecruiter || row.employee.fullName === selectedRecruiter) &&
          (!startDate ||
            isWithinDateRange(
              row.activitySummary?.lastSeenAt || row.attendanceSummary?.firstLoginAt,
              startDate,
              endDate
            ))
      ),
    [employeeActivityRows, endDate, selectedRecruiter, startDate]
  );

  const filteredJobsReportRows = useMemo(
    () =>
      jobsReportRows.filter(
        (job) =>
          (!selectedRecruiter || job.recruiterName === selectedRecruiter) &&
          (!selectedClient || job.clientName === selectedClient) &&
          isWithinDateRange(job.postedAt, startDate, endDate)
      ),
    [endDate, jobsReportRows, selectedClient, selectedRecruiter, startDate]
  );

  const filteredHistory = useMemo(
    () =>
      visibleHistory.filter(
        (item) =>
          (!selectedRecruiter || item.recruiterName === selectedRecruiter) &&
          (!selectedClient || item.clientName === selectedClient) &&
          isWithinDateRange(item.stageDate || item.changedAt, startDate, endDate)
      ),
    [endDate, selectedClient, selectedRecruiter, startDate, visibleHistory]
  );

  const filteredApplications = useMemo(
    () =>
      visibleApplications.filter(
        (application) =>
          (!selectedRecruiter || application.recruiterName === selectedRecruiter) &&
          (!selectedClient || application.clientName === selectedClient) &&
          (!selectedSource || getCandidateSourceLabel(application) === selectedSource) &&
          (!selectedStage || getStageLabel(application.stage) === selectedStage) &&
          isWithinDateRange(application.appliedAt, startDate, endDate)
      ),
    [
      endDate,
      selectedClient,
      selectedRecruiter,
      selectedSource,
      selectedStage,
      startDate,
      visibleApplications,
    ]
  );

  const candidateSourceOptions = useMemo(
    () =>
      Array.from(
        new Set(visibleApplications.map((application) => getCandidateSourceLabel(application)))
      ).sort((a, b) => a.localeCompare(b)),
    [visibleApplications]
  );

  const candidateStageOptions = useMemo(
    () =>
      Array.from(
        new Set(
          visibleApplications.map((application) => getStageLabel(application.stage))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [visibleApplications]
  );

  const filteredSourceMetrics = useMemo(() => {
    const sourceCounts = new Map<string, number>();

    filteredApplications.forEach((application) => {
      const source = getCandidateSourceLabel(application);
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    });

    return Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredApplications]);

  const filteredRecentEnquiries = useMemo(
    () =>
      [...state.enquiries]
        .filter((enquiry) => isWithinDateRange(enquiry.createdAt, startDate, endDate))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [endDate, startDate, state.enquiries]
  );

  const filteredClientReportRows = useMemo(
    () =>
      clientReportRows.filter(
        (row) =>
          (!selectedRecruiter || row.client.assignedEmployeeName === selectedRecruiter) &&
          (!selectedClient || row.client.companyName === selectedClient) &&
          isWithinDateRange(row.client.createdAt, startDate, endDate)
      ),
    [clientReportRows, endDate, selectedClient, selectedRecruiter, startDate]
  );

  const filteredFollowUpReportRows = useMemo(
    () =>
      followUpReportRows.filter((row) => {
        const followUpDate =
          row.client.nextFollowUpDate || row.client.lastFollowUpDate || row.client.createdAt;

        return (
          (!selectedRecruiter || row.client.assignedEmployeeName === selectedRecruiter) &&
          (!selectedClient || row.client.companyName === selectedClient) &&
          (!selectedJob || row.linkedJobLabels.includes(selectedJob)) &&
          isWithinDateRange(followUpDate, startDate, endDate)
        );
      }),
    [
      endDate,
      followUpReportRows,
      selectedClient,
      selectedJob,
      selectedRecruiter,
      startDate,
    ]
  );

  const filteredTransferRequests = useMemo(
    () =>
      visibleTransferRequests.filter(
        (request) =>
          (!selectedRecruiter ||
            request.requestedByEmployeeName === selectedRecruiter ||
            request.requestedToEmployeeName === selectedRecruiter) &&
          (!selectedClient || request.clientName === selectedClient) &&
          isWithinDateRange(request.reviewedAt || request.createdAt, startDate, endDate)
      ),
    [endDate, selectedClient, selectedRecruiter, startDate, visibleTransferRequests]
  );

  const filteredApplicationTotals = useMemo(() => {
    const countByStage = (stage: string) =>
      filteredApplications.filter((application) => (application.stage ?? "applied") === stage)
        .length;

    return {
      totalApplications: filteredApplications.length,
      applied: countByStage("applied"),
      shortlisted: countByStage("shortlisted"),
      interview: countByStage("interview"),
      offered: countByStage("offered"),
      joined: countByStage("joined"),
      screenRejection: countByStage("screen-rejection"),
      rejected: countByStage("rejected"),
    };
  }, [filteredApplications]);

  const overviewCards = reportModules.map((item) => (
    <ReportLinkCard
      key={item.key}
      href={item.href}
      eyebrow={item.eyebrow}
      title={item.title}
      description={item.description}
    />
  ));

  if (module === "overview") {
    return (
      <div className="space-y-6">
        <section className="grid gap-5 lg:grid-cols-2">{overviewCards}</section>
      </div>
    );
  }

  if (report === "index") {
    return (
      <div className="space-y-6">
        <section className="grid gap-5 xl:grid-cols-2">
          {moduleReportScreens[module].map((item) => (
            <ReportLinkCard
              key={item.key}
              href={item.href}
              eyebrow={item.eyebrow}
              title={item.title}
              description={item.description}
            />
          ))}
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <section className="accent-card p-7">
        <p className="text-sm font-medium text-red-700">{error}</p>
      </section>
    );
  }

  if (module === "hr") {
    const activeEmployees = visibleEmployees.filter((employee) => employee.status === "active").length;
    const inactiveEmployees = visibleEmployees.filter((employee) => employee.status === "inactive").length;
    const activeSessions = filteredAttendanceSummary.filter((item) => item.activeSessionCount > 0).length;
    const averageScreenTime =
      filteredAttendanceSummary.length > 0
        ? Math.round(
            filteredAttendanceSummary.reduce((sum, item) => sum + item.screenActiveSeconds, 0) /
              filteredAttendanceSummary.length
          ) * 1000
        : 0;

    return (
      <div className="space-y-6">
        <ReportFilterBar
          startDate={startDate}
          endDate={endDate}
          exactDate={exactDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onExactDateChange={setExactDate}
          recruiterOptions={recruiterOptions}
          selectedRecruiter={selectedRecruiter}
          onRecruiterChange={setSelectedRecruiter}
          recruiterLabel="Employee"
          onExport={() =>
            downloadExcelReport(
              "hr-report.xls",
              "HR Attendance Report",
              [
                "Employee",
                "Date",
                "Shift",
                "Shift Timing",
                "First Login",
                "Last Logout",
                "Worked Hours",
                "Late By",
                "Early Logout",
                "Overtime",
                "Policy Status",
                "Screen Time",
                "Idle Time",
                "Last Seen",
                "Status",
              ],
              filteredAttendanceSummary.map((summary) => [
                summary.userName,
                formatDate(summary.reportDate),
                summary.shiftName || "Not assigned",
                formatShiftSlot(summary.shiftStartAt, summary.shiftEndAt),
                formatDateTime(summary.firstLoginAt),
                formatDateTime(summary.lastLogoutAt),
                formatDuration(summary.totalWorkedMs),
                formatDuration(summary.lateByMs),
                formatDuration(summary.earlyLogoutMs),
                formatDuration(summary.overtimeMs),
                summary.attendancePolicyStatus,
                formatDuration(summary.screenActiveSeconds * 1000),
                formatDuration(summary.screenIdleSeconds * 1000),
                formatDateTime(summary.lastSeenAt),
                summary.activeSessionCount > 0 ? "Active session" : "Day closed",
              ])
            )
          }
          exportLabel="Download HR Report"
          onSaveView={saveCurrentReportView}
          saveFeedback={viewMessage}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Employees" value={visibleEmployees.length} />
          <MetricCard label="Active Employees" value={activeEmployees} />
          <MetricCard label="Inactive Employees" value={inactiveEmployees} />
          <MetricCard
            label="Live Sessions"
            value={activeSessions}
            detail={`${filteredAttendanceSummary.length} employee day records`}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Average Screen Time"
            value={formatDuration(averageScreenTime)}
            detail="Average CRM active time per employee day"
          />
          <MetricCard
            label="Attendance Records"
            value={filteredAttendanceSummary.length}
            detail="End-of-day attendance summaries"
          />
          <MetricCard
            label="Today Login Capture"
            value={filteredEmployeeActivityRows.filter((row) => row.attendanceSummary?.firstLoginAt).length}
          />
          <MetricCard
            label="Last Seen Captured"
            value={filteredEmployeeActivityRows.filter((row) => row.activitySummary?.lastSeenAt).length}
          />
        </section>

        {report === "hr-attendance" && (
          <section className="accent-card p-7">
            <p className="eyebrow">Attendance Report</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
              Track login, logout, screen time, and worked hours.
            </h2>
            <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
              This HR report shows first login, last logout, worked hours, screen time,
              idle time, and latest CRM activity for each employee by date.
            </p>

            {isLoading ? (
              <p className="muted-copy mt-6 text-sm">Loading attendance report...</p>
            ) : filteredAttendanceSummary.length === 0 ? (
              <p className="muted-copy mt-6 text-sm">No attendance records are available yet.</p>
            ) : (
              <ReportTable
                headings={[
                  "Employee",
                  "Date",
                  "Shift",
                  "Shift Timing",
                  "First Login",
                  "Last Logout",
                  "Worked Hours",
                  "Late By",
                  "Early Logout",
                  "Overtime",
                  "Policy Status",
                  "Screen Time",
                  "Idle Time",
                  "Last Seen",
                  "Status",
                ]}
              >
                {filteredAttendanceSummary.map((summary, index) => (
                  <tr
                    key={summary.key}
                    className={
                      index === filteredAttendanceSummary.length - 1
                        ? "align-top"
                        : "align-top border-b border-[var(--color-line)]"
                    }
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[var(--color-ink)]">{summary.userName}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {summary.userIdentifier}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {formatDate(summary.reportDate)}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {summary.shiftName || "Not assigned"}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {formatShiftSlot(summary.shiftStartAt, summary.shiftEndAt)}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {formatDateTime(summary.firstLoginAt)}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {formatDateTime(summary.lastLogoutAt)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                      {formatDuration(summary.totalWorkedMs)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                      {formatDuration(summary.lateByMs)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                      {formatDuration(summary.earlyLogoutMs)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                      {formatDuration(summary.overtimeMs)}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span className="font-semibold text-[var(--color-ink)]">
                        {summary.attendancePolicyStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                      {formatDuration(summary.screenActiveSeconds * 1000)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                      {formatDuration(summary.screenIdleSeconds * 1000)}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {formatDateTime(summary.lastSeenAt)}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span className="font-semibold text-[var(--color-accent-strong)]">
                        {summary.isAutoLoggedOut
                          ? "Auto logged out"
                          : summary.activeSessionCount > 0
                            ? "Active session"
                            : "Day closed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </ReportTable>
            )}
          </section>
        )}

        {report === "hr-activity" && (
          <section className="accent-card p-7">
            <p className="eyebrow">Employee Activity</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
              Review current employee visibility.
            </h2>
            <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
              This snapshot shows today&apos;s login capture, last seen activity, screen time,
              and current employee status for internal follow-up.
            </p>

            {isLoading ? (
              <p className="muted-copy mt-6 text-sm">Loading employee activity...</p>
            ) : filteredEmployeeActivityRows.length === 0 ? (
              <p className="muted-copy mt-6 text-sm">No employee activity is available yet.</p>
            ) : (
              <ReportTable
                headings={[
                  "Employee",
                  "Role",
                  "Date Of Joining",
                  "Today Screen Time",
                  "Idle Time",
                  "Last Seen",
                  "First Login",
                  "Last Logout",
                  "Status",
                ]}
              >
                {filteredEmployeeActivityRows.map((row, index) => (
                  <tr
                    key={row.employee.id}
                    className={
                      index === filteredEmployeeActivityRows.length - 1
                        ? "align-top"
                        : "align-top border-b border-[var(--color-line)]"
                    }
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[var(--color-ink)]">{row.employee.fullName}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{row.employee.email}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{row.employee.role}</td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {formatDate(row.employee.dateOfJoining)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                      {formatDuration((row.activitySummary?.activeSeconds ?? 0) * 1000)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                      {formatDuration((row.activitySummary?.idleSeconds ?? 0) * 1000)}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {formatDateTime(row.activitySummary?.lastSeenAt)}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {formatDateTime(row.attendanceSummary?.firstLoginAt)}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {formatDateTime(row.attendanceSummary?.lastLogoutAt)}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span className="font-semibold text-[var(--color-accent-strong)]">
                        {row.employee.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </ReportTable>
            )}
          </section>
        )}
      </div>
    );
  }

  if (module === "jobs") {
    const openJobs = filteredJobsReportRows.filter((job) => job.status === "open").length;
    const draftJobs = filteredJobsReportRows.filter((job) => job.status === "draft").length;
    const closedJobs = filteredJobsReportRows.filter((job) => job.status === "closed").length;
    const activeRecruiters = new Set(
      filteredJobsReportRows.map((job) => job.recruiterEmail || job.recruiterId).filter(Boolean)
    ).size;

    return (
      <div className="space-y-6">
        <ReportFilterBar
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          recruiterOptions={recruiterOptions}
          selectedRecruiter={selectedRecruiter}
          onRecruiterChange={setSelectedRecruiter}
          clientOptions={clientOptions}
          selectedClient={selectedClient}
          onClientChange={setSelectedClient}
          onExport={() =>
            downloadExcelReport(
              "jobs-report.xls",
              "Jobs Report",
              [
                "Job",
                "Job ID",
                "Client",
                "Recruiter",
                "Location",
                "Status",
                "Applications",
                "Latest Application",
                "Posted Date",
              ],
              filteredJobsReportRows.map((job) => [
                job.title,
                job.jobCode || "",
                job.clientName || "Not assigned",
                job.recruiterName || "Unassigned",
                job.location,
                job.status,
                job.applicationCount,
                formatDateTime(job.latestAppliedAt),
                formatDate(job.postedAt),
              ])
            )
          }
          exportLabel="Download Jobs Report"
          onSaveView={saveCurrentReportView}
          saveFeedback={viewMessage}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Open Jobs" value={openJobs} />
          <MetricCard label="Draft Jobs" value={draftJobs} />
          <MetricCard label="Closed Jobs" value={closedJobs} />
          <MetricCard label="Applications" value={filteredApplications.length} />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active Recruiters" value={activeRecruiters} />
          <MetricCard
            label="Shortlisted"
            value={filteredApplicationTotals.shortlisted}
            detail="Candidates moved beyond applied stage"
          />
          <MetricCard label="Interview" value={filteredApplicationTotals.interview} />
          <MetricCard label="Joined" value={filteredApplicationTotals.joined} />
        </section>

        {report === "jobs-performance" && (
        <section className="accent-card p-7">
          <p className="eyebrow">Job Performance</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
            Review job-wise application movement.
          </h2>
          <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
            This report shows which mandates are open, who owns them, how many
            applications they have, and the latest movement on each job.
          </p>

          {isLoading ? (
            <p className="muted-copy mt-6 text-sm">Loading jobs report...</p>
          ) : filteredJobsReportRows.length === 0 ? (
            <p className="muted-copy mt-6 text-sm">No jobs are available yet.</p>
          ) : (
            <ReportTable
              headings={[
                "Job",
                "Client",
                "Recruiter",
                "Location",
                "Status",
                "Applications",
                "Latest Application",
                "Posted Date",
              ]}
            >
              {filteredJobsReportRows.map((job, index) => (
                <tr
                  key={job.id}
                  className={
                    index === filteredJobsReportRows.length - 1
                      ? "align-top"
                      : "align-top border-b border-[var(--color-line)]"
                  }
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[var(--color-ink)]">{job.title}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      <AdminJobIdTrigger jobId={job.id} jobCode={job.jobCode} />
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {job.clientName || "Not assigned"}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    <p>{job.recruiterName || "Unassigned"}</p>
                    {job.recruiterEmail ? <p className="mt-1">{job.recruiterEmail}</p> : null}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{job.location}</td>
                  <td className="px-4 py-4 text-sm">
                    <span className="font-semibold text-[var(--color-accent-strong)]">
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                    {job.applicationCount}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {formatDateTime(job.latestAppliedAt)}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {formatDate(job.postedAt)}
                  </td>
                </tr>
              ))}
            </ReportTable>
          )}
        </section>
        )}

        {report === "jobs-stage-movement" && (
        <section className="accent-card p-7">
          <p className="eyebrow">Stage Movement</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
            Review remarks behind every pipeline change.
          </h2>
          <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
            Use this report to audit shortlist, interview, offer, joined, and rejected
            stage changes for active mandates.
          </p>

          {isLoading ? (
            <p className="muted-copy mt-6 text-sm">Loading stage movement report...</p>
          ) : filteredHistory.length === 0 ? (
            <p className="muted-copy mt-6 text-sm">No stage updates have been recorded yet.</p>
          ) : (
            <ReportTable
              headings={["Candidate", "Job", "From", "To", "Effective Date", "Remarks", "Changed At"]}
            >
              {filteredHistory.map((item, index) => (
                <tr
                  key={item.id}
                  className={
                    index === filteredHistory.length - 1
                      ? "align-top"
                      : "align-top border-b border-[var(--color-line)]"
                  }
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[var(--color-ink)]">{item.candidateName}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{item.candidateEmail}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    <p className="font-medium text-[var(--color-ink)]">{item.jobTitle || "Untitled job"}</p>
                    <p className="mt-1">
                      <AdminJobIdTrigger jobId={item.jobId || ""} jobCode={item.jobCode} />
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {item.fromStage ? getStageLabel(item.fromStage) : "Initial"}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-[var(--color-accent-strong)]">
                    {getStageLabel(item.toStage)}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {formatDate(item.stageDate)}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {item.stageNote || "No remarks added"}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {formatDateTime(item.changedAt)}
                  </td>
                </tr>
              ))}
            </ReportTable>
          )}
        </section>
        )}
      </div>
    );
  }

  if (module === "candidates") {
    return (
      <div className="space-y-6">
        <ReportFilterBar
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          recruiterOptions={recruiterOptions}
          selectedRecruiter={selectedRecruiter}
          onRecruiterChange={setSelectedRecruiter}
          clientOptions={clientOptions}
          selectedClient={selectedClient}
          onClientChange={setSelectedClient}
          sourceOptions={candidateSourceOptions}
          selectedSource={selectedSource}
          onSourceChange={setSelectedSource}
          stageOptions={candidateStageOptions}
          selectedStage={selectedStage}
          onStageChange={setSelectedStage}
          onExport={() =>
            downloadExcelReport(
              "candidates-report.xls",
              "Candidates Report",
              [
                "Candidate",
                "Email",
                "Job",
                "Job ID",
                "Client",
                "Recruiter",
                "Source",
                "Current Stage",
                "Applied Date",
              ],
              filteredApplications.map((application) => [
                application.candidateName,
                application.candidateEmail,
                application.jobTitle || "Untitled job",
                application.jobCode || "",
                application.clientName || "Not assigned",
                application.recruiterName || "Unassigned",
                getCandidateSourceLabel(application),
                getStageLabel(application.stage),
                formatDateTime(application.appliedAt),
              ])
            )
          }
          exportLabel="Download Candidates Report"
          onSaveView={saveCurrentReportView}
          saveFeedback={viewMessage}
        />

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
          <MetricCard label="Applied" value={filteredApplicationTotals.applied} />
          <MetricCard label="Shortlisted" value={filteredApplicationTotals.shortlisted} />
          <MetricCard label="Interview" value={filteredApplicationTotals.interview} />
          <MetricCard label="Offered" value={filteredApplicationTotals.offered} />
          <MetricCard label="Joined" value={filteredApplicationTotals.joined} />
          <MetricCard label="Screen Rejection" value={filteredApplicationTotals.screenRejection} />
          <MetricCard label="Rejected" value={filteredApplicationTotals.rejected} />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Applications" value={filteredApplications.length} />
          <MetricCard label="Website Enquiries" value={filteredRecentEnquiries.length} />
          <MetricCard
            label="Website Apply"
            value={
              filteredApplications.filter(
                (application) => getCandidateSourceLabel(application) === "Website Apply"
              ).length
            }
          />
          <MetricCard
            label="Manual Entries"
            value={
              filteredApplications.filter(
                (application) => getCandidateSourceLabel(application) !== "Website Apply"
              ).length
            }
          />
        </section>

        {report === "candidates-pipeline" && (
        <section className="accent-card p-7">
          <p className="eyebrow">Candidate Pipeline</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
            Review current stage, source, and recruiter ownership.
          </h2>
          <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
            This report keeps job applicants separate from general enquiries and shows the
            current candidate stage with source and application date.
          </p>

          {isLoading ? (
            <p className="muted-copy mt-6 text-sm">Loading candidate pipeline...</p>
          ) : filteredApplications.length === 0 ? (
            <p className="muted-copy mt-6 text-sm">No job applicants are available yet.</p>
          ) : (
            <ReportTable
              headings={[
                "Candidate",
                "Job",
                "Client",
                "Recruiter",
                "Source",
                "Current Stage",
                "Applied Date",
              ]}
            >
              {[...filteredApplications]
                .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
                .map((application, index, rows) => (
                  <tr
                    key={application.id}
                    className={
                      index === rows.length - 1
                        ? "align-top"
                        : "align-top border-b border-[var(--color-line)]"
                    }
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[var(--color-ink)]">
                        {application.candidateName}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {application.candidateEmail}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      <p className="font-medium text-[var(--color-ink)]">
                        {application.jobTitle || "Untitled job"}
                      </p>
                      <p className="mt-1">
                        <AdminJobIdTrigger jobId={application.jobId} jobCode={application.jobCode} />
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {application.clientName || "Not assigned"}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {application.recruiterName || "Unassigned"}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {getCandidateSourceLabel(application)}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span className="font-semibold text-[var(--color-accent-strong)]">
                        {getStageLabel(application.stage)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {formatDateTime(application.appliedAt)}
                    </td>
                  </tr>
                ))}
            </ReportTable>
          )}
        </section>
        )}

        {(report === "candidates-sources" || report === "candidates-enquiries") && (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          {report === "candidates-sources" && (
          <section className="accent-card p-7">
            <p className="eyebrow">Source Mix</p>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-[var(--color-ink)]">
              Understand where applications are coming from.
            </h2>
            {isLoading ? (
              <p className="muted-copy mt-6 text-sm">Loading source metrics...</p>
            ) : filteredSourceMetrics.length === 0 ? (
              <p className="muted-copy mt-6 text-sm">No source information is available yet.</p>
            ) : (
              <div className="mt-6 space-y-3">
                {filteredSourceMetrics.map((item) => (
                  <div
                    key={item.source}
                    className="flex items-center justify-between rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{item.source}</p>
                    <p className="text-sm text-[var(--color-muted)]">{item.count}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
          )}

          {report === "candidates-enquiries" && (
          <section className="accent-card p-7">
            <p className="eyebrow">General Enquiries</p>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-[var(--color-ink)]">
              Website candidate enquiries without a job application.
            </h2>
            {isLoading ? (
              <p className="muted-copy mt-6 text-sm">Loading candidate enquiries...</p>
            ) : filteredRecentEnquiries.length === 0 ? (
              <p className="muted-copy mt-6 text-sm">No website enquiries are available yet.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {filteredRecentEnquiries.map((enquiry) => (
                  <div
                    key={enquiry.id}
                    className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-[var(--color-ink)]">
                          {enquiry.candidateName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {enquiry.candidateEmail}
                        </p>
                      </div>
                      <p className="text-sm text-[var(--color-muted)]">
                        {formatDateTime(enquiry.createdAt)}
                      </p>
                    </div>
                    <p className="mt-3 text-sm text-[var(--color-muted)]">
                      {enquiry.preferredRole || "Preferred role not added"}
                      {enquiry.preferredLocation ? ` | ${enquiry.preferredLocation}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
          )}
        </section>
        )}
      </div>
    );
  }

  const approvedTransfers = filteredTransferRequests.filter((request) => request.status === "approved").length;
  const rejectedTransfers = filteredTransferRequests.filter((request) => request.status === "rejected").length;
  const unassignedClients = filteredClientReportRows.filter((row) => !row.client.assignedEmployeeId).length;

  return (
    <div className="space-y-6">
      <ReportFilterBar
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        recruiterOptions={recruiterOptions}
        selectedRecruiter={selectedRecruiter}
        onRecruiterChange={setSelectedRecruiter}
        clientOptions={clientOptions}
        selectedClient={selectedClient}
        onClientChange={setSelectedClient}
        onExport={() =>
          downloadExcelReport(
            "clients-report.xls",
            "Clients Report",
            [
              "Client",
              "Owner",
              "Linked Jobs",
              "Applications",
              "Joined",
              "Status",
              "Created At",
            ],
            filteredClientReportRows.map((row) => [
              row.client.companyName,
              row.client.assignedEmployeeName || "Not assigned",
              row.client.linkedJobsCount,
              row.applicationsCount,
              row.joinedCount,
              row.client.status,
              formatDate(row.client.createdAt),
            ])
          )
        }
        exportLabel="Download Clients Report"
        onSaveView={saveCurrentReportView}
        saveFeedback={viewMessage}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Clients" value={filteredClientReportRows.length} />
        <MetricCard
          label="Active Clients"
          value={filteredClientReportRows.filter((row) => row.client.status === "active").length}
        />
        <MetricCard label="Unassigned Clients" value={unassignedClients} />
        <MetricCard
          label="Linked Jobs"
          value={filteredClientReportRows.reduce((sum, row) => sum + row.client.linkedJobsCount, 0)}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          label="Pending Transfers"
          value={filteredTransferRequests.filter((request) => request.status === "pending").length}
        />
        <MetricCard label="Approved Transfers" value={approvedTransfers} />
        <MetricCard label="Rejected Transfers" value={rejectedTransfers} />
        <MetricCard
          label="Follow-Up Due"
          value={
            filteredClientReportRows.filter(
              (row) => row.client.followUpStatus === "follow-up-due"
            ).length
          }
        />
        <MetricCard
          label="Awaiting Client"
          value={
            filteredClientReportRows.filter(
              (row) => row.client.followUpStatus === "awaiting-client"
            ).length
          }
        />
      </section>

      {report === "clients-coverage" && (
      <section className="accent-card p-7">
        <p className="eyebrow">Client Coverage</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
          Review client ownership, linked mandates, and hiring volume.
        </h2>
        <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
          This report helps you understand which clients are assigned, how many jobs
          are linked, and how much candidate activity each client currently has.
        </p>

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading client report...</p>
        ) : filteredClientReportRows.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">No clients are available yet.</p>
        ) : (
          <ReportTable
            headings={[
              "Client",
              "Owner",
              "Onboarding",
              "Follow-Up",
              "Linked Jobs",
              "Applications",
              "Joined",
              "Status",
              "Created At",
            ]}
          >
            {filteredClientReportRows.map((row, index) => (
              <tr
                key={row.client.id}
                className={
                  index === filteredClientReportRows.length - 1
                    ? "align-top"
                    : "align-top border-b border-[var(--color-line)]"
                }
              >
                <td className="px-4 py-4">
                  <p className="font-semibold text-[var(--color-ink)]">{row.client.companyName}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {row.client.contactPerson}
                  </p>
                </td>
                <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                  {row.client.assignedEmployeeName || "Not assigned"}
                </td>
                <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                  <p className="font-semibold text-[var(--color-ink)]">
                    {row.client.onboardingStatus || "new-lead"}
                  </p>
                  <p className="mt-1 text-xs">
                    {row.client.onboardingSource || "Source not added"}
                  </p>
                </td>
                <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                  <p className="font-semibold text-[var(--color-ink)]">
                    {row.client.followUpStatus || "pending"}
                  </p>
                  <p className="mt-1 text-xs">
                    Next: {formatDate(row.client.nextFollowUpDate)}
                  </p>
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                  {row.client.linkedJobsCount}
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                  {row.applicationsCount}
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                  {row.joinedCount}
                </td>
                <td className="px-4 py-4 text-sm">
                  <span className="font-semibold text-[var(--color-accent-strong)]">
                    {row.client.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                  {formatDate(row.client.createdAt)}
                </td>
              </tr>
            ))}
          </ReportTable>
        )}
      </section>
      )}

      {report === "clients-followups" && (
      <section className="space-y-4">
        <ReportFilterBar
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          recruiterOptions={recruiterOptions}
          selectedRecruiter={selectedRecruiter}
          onRecruiterChange={setSelectedRecruiter}
          clientOptions={clientOptions}
          selectedClient={selectedClient}
          onClientChange={setSelectedClient}
          jobOptions={jobOptions}
          selectedJob={selectedJob}
          onJobChange={setSelectedJob}
          onExport={() =>
            downloadExcelReport(
              "followup-report.xls",
              "Follow-Up Report",
              [
                "Client",
                "Recruiter",
                "Onboarding Status",
                "Onboarding Source",
                "Related Jobs",
                "Follow-Up Status",
                "Next Follow-Up Date",
                "Last Follow-Up Date",
                "Applications",
                "Joined",
                "Notes",
              ],
              filteredFollowUpReportRows.map((row) => [
                row.client.companyName,
                row.recruiterName,
                getFollowUpStatusLabel(row.client.onboardingStatus || "new-lead"),
                row.client.onboardingSource || "Source not added",
                row.linkedJobLabels.join(", ") || "No linked jobs",
                getFollowUpStatusLabel(row.client.followUpStatus),
                formatDate(row.client.nextFollowUpDate),
                formatDate(row.client.lastFollowUpDate),
                row.applicationsCount,
                row.joinedCount,
                row.client.followUpNotes || "No notes added",
              ])
            )
          }
          exportLabel="Download Follow-Up Report"
          onSaveView={saveCurrentReportView}
          saveFeedback={viewMessage}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Follow-Up Rows" value={filteredFollowUpReportRows.length} />
          <MetricCard
            label="Onboarding Follow-Ups"
            value={
              filteredFollowUpReportRows.filter(
                (row) => row.client.onboardingStatus && row.client.onboardingStatus !== "onboarded"
              ).length
            }
          />
          <MetricCard
            label="Follow-Up Due"
            value={
              filteredFollowUpReportRows.filter(
                (row) => row.client.followUpStatus === "follow-up-due"
              ).length
            }
          />
          <MetricCard
            label="In Discussion"
            value={
              filteredFollowUpReportRows.filter(
                (row) => row.client.followUpStatus === "in-progress"
              ).length
            }
          />
          <MetricCard
            label="Awaiting Response"
            value={
              filteredFollowUpReportRows.filter(
                (row) => row.client.followUpStatus === "awaiting-client"
              ).length
            }
          />
        </section>

        <section className="accent-card p-7">
          <p className="eyebrow">Follow-Up Report</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
            Review client onboarding and follow-up status by employee, client, and date.
          </h2>
          <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
            This report is built for onboarding and client relationship follow-ups first.
            Admin users can filter by employee, client, optional related job, and date
            range. Employee logins will only see their own follow-up report rows here.
          </p>

          {isLoading ? (
            <p className="muted-copy mt-6 text-sm">Loading follow-up report...</p>
          ) : filteredFollowUpReportRows.length === 0 ? (
            <p className="muted-copy mt-6 text-sm">No follow-up report rows are available yet.</p>
          ) : (
            <ReportTable
              headings={[
                "Client",
                "Recruiter",
                "Onboarding",
                "Related Job",
                "Follow-Up Status",
                "Next Follow-Up",
                "Last Follow-Up",
                "Notes",
              ]}
            >
              {filteredFollowUpReportRows.map((row, index) => (
                <tr
                  key={row.client.id}
                  className={
                    index === filteredFollowUpReportRows.length - 1
                      ? "align-top"
                      : "align-top border-b border-[var(--color-line)]"
                  }
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[var(--color-ink)]">{row.client.companyName}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {row.client.contactPerson}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {row.recruiterName}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    <p className="font-semibold text-[var(--color-ink)]">
                      {getFollowUpStatusLabel(row.client.onboardingStatus || "new-lead")}
                    </p>
                    <p className="mt-1 text-xs">
                      {row.client.onboardingSource || "Source not added"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {row.linkedJobLabels.length > 0 ? (
                      row.linkedJobLabels.map((label) => (
                        <p key={`${row.client.id}-${label}`}>{label}</p>
                      ))
                    ) : (
                      <p>No related jobs yet</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    <p className="font-semibold text-[var(--color-ink)]">
                      {getFollowUpStatusLabel(row.client.followUpStatus)}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {formatDate(row.client.nextFollowUpDate)}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {formatDate(row.client.lastFollowUpDate)}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {row.client.followUpNotes || "No notes added"}
                  </td>
                </tr>
              ))}
            </ReportTable>
          )}
        </section>
      </section>
      )}

      {report === "clients-transfers" &&
        (authType === "admin" || authRole === "super-admin") && (
        <section className="accent-card p-7">
          <p className="eyebrow">Transfer Requests</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
            Review client reassignment approvals.
          </h2>
          <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
            This report tracks pending, approved, and rejected client transfer requests
            so super admins can monitor ownership movement.
          </p>

          {isLoading ? (
            <p className="muted-copy mt-6 text-sm">Loading transfer requests...</p>
          ) : filteredTransferRequests.length === 0 ? (
            <p className="muted-copy mt-6 text-sm">No client transfer requests are available yet.</p>
          ) : (
            <ReportTable
              headings={["Client", "Requested By", "Requested To", "Status", "Reason", "Reviewed At"]}
            >
              {filteredTransferRequests.map((request, index) => (
                <tr
                  key={request.id}
                  className={
                    index === filteredTransferRequests.length - 1
                      ? "align-top"
                      : "align-top border-b border-[var(--color-line)]"
                  }
                >
                  <td className="px-4 py-4 font-semibold text-[var(--color-ink)]">
                    {request.clientName}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {request.requestedByEmployeeName}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {request.requestedToEmployeeName}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <span className="font-semibold text-[var(--color-accent-strong)]">
                      {request.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {request.reason || request.adminNote || "No remarks added"}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {formatDateTime(request.reviewedAt || request.createdAt)}
                  </td>
                </tr>
              ))}
            </ReportTable>
          )}
        </section>
      )}
    </div>
  );
}
