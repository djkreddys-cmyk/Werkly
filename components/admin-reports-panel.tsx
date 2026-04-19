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
import { AdminJobIdTrigger } from "@/components/admin-job-id-trigger";

type ReportModule = "overview" | "hr" | "jobs" | "candidates" | "clients";

type ReportState = {
  applications: JobApplication[];
  history: JobApplicationStageHistory[];
  clients: ClientRecord[];
  employees: EmployeeRecord[];
  attendance: AttendanceSessionRecord[];
  activity: ScreenActivityRecord[];
  enquiries: CandidateEnquiry[];
  jobs: JobSummary[];
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
};

type AdminReportsPanelProps = {
  module?: ReportModule;
};

const reportModules: Array<{
  key: Exclude<ReportModule, "overview">;
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
];

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
  return safeStage.charAt(0).toUpperCase() + safeStage.slice(1);
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

export function AdminReportsPanel({ module = "overview" }: AdminReportsPanelProps) {
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
    transferRequests: [],
  });
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

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
            transferRequests: transferRequestsResult.requests ?? [],
          });
        }
      )
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

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

  const attendanceSummary = useMemo(() => {
    const summaries = new Map<string, AttendanceDaySummary>();
    const activitySummaryMap = new Map<
      string,
      { activeSeconds: number; idleSeconds: number; lastSeenAt?: string }
    >();

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
    });

    visibleAttendance.forEach((session) => {
      const reportDate = session.loginAt.slice(0, 10);
      const userKey = session.userId || session.userIdentifier;
      const summaryKey = `${userKey}-${reportDate}`;
      const existing = summaries.get(summaryKey);
      const loginTime = new Date(session.loginAt).getTime();
      const logoutTime = session.logoutAt ? new Date(session.logoutAt).getTime() : null;
      const workedMs = logoutTime && logoutTime >= loginTime ? logoutTime - loginTime : 0;

      if (!existing) {
        summaries.set(summaryKey, {
          key: summaryKey,
          userId: session.userId,
          userIdentifier: session.userIdentifier,
          userName: session.userName || session.userIdentifier,
          reportDate,
          firstLoginAt: session.loginAt,
          lastLogoutAt: session.logoutAt,
          totalWorkedMs: workedMs,
          activeSessionCount: session.logoutAt ? 0 : 1,
          sessions: [session],
          screenActiveSeconds: activitySummaryMap.get(summaryKey)?.activeSeconds ?? 0,
          screenIdleSeconds: activitySummaryMap.get(summaryKey)?.idleSeconds ?? 0,
          lastSeenAt: activitySummaryMap.get(summaryKey)?.lastSeenAt,
        });
        return;
      }

      existing.sessions.push(session);
      existing.totalWorkedMs += workedMs;
      existing.activeSessionCount += session.logoutAt ? 0 : 1;

      if (new Date(session.loginAt).getTime() < new Date(existing.firstLoginAt).getTime()) {
        existing.firstLoginAt = session.loginAt;
      }

      if (
        session.logoutAt &&
        (!existing.lastLogoutAt ||
          new Date(session.logoutAt).getTime() > new Date(existing.lastLogoutAt).getTime())
      ) {
        existing.lastLogoutAt = session.logoutAt;
      }

      existing.screenActiveSeconds = activitySummaryMap.get(summaryKey)?.activeSeconds ?? 0;
      existing.screenIdleSeconds = activitySummaryMap.get(summaryKey)?.idleSeconds ?? 0;
      existing.lastSeenAt = activitySummaryMap.get(summaryKey)?.lastSeenAt;
    });

    return Array.from(summaries.values()).sort((a, b) => {
      const dateSort = new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
      if (dateSort !== 0) {
        return dateSort;
      }

      return a.userName.localeCompare(b.userName);
    });
  }, [visibleActivity, visibleAttendance]);

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
        attendanceSummary: attendanceSummaryForEmployee,
      };
    });
  }, [visibleActivity, visibleAttendance, visibleEmployees]);

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

  const candidateSourceMetrics = useMemo(() => {
    const sourceCounts = new Map<string, number>();

    visibleApplications.forEach((application) => {
      const source = getCandidateSourceLabel(application);
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    });

    return Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [visibleApplications]);

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

  const recentEnquiries = useMemo(
    () =>
      [...state.enquiries]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [state.enquiries]
  );

  const applicationTotals = useMemo(() => {
    const countByStage = (stage: string) =>
      visibleApplications.filter((application) => (application.stage ?? "applied") === stage)
        .length;

    return {
      totalApplications: visibleApplications.length,
      applied: countByStage("applied"),
      shortlisted: countByStage("shortlisted"),
      interview: countByStage("interview"),
      offered: countByStage("offered"),
      joined: countByStage("joined"),
      rejected: countByStage("rejected"),
    };
  }, [visibleApplications]);

  const overviewCards = reportModules.map((item) => (
    <Link
      key={item.key}
      href={item.href}
      className="accent-card group flex h-full flex-col justify-between p-6 transition hover:-translate-y-0.5 hover:border-[rgba(241,166,75,0.26)]"
    >
      <div>
        <p className="eyebrow">{item.eyebrow}</p>
        <h2 className="mt-4 text-2xl font-semibold leading-tight text-[var(--color-ink)]">
          {item.title}
        </h2>
        <p className="muted-copy mt-3 text-base leading-7">{item.description}</p>
      </div>
      <span className="mt-6 inline-flex text-sm font-semibold text-[var(--color-accent-strong)]">
        Open report
      </span>
    </Link>
  ));

  if (module === "overview") {
    return (
      <div className="space-y-6">
        <section className="grid gap-5 lg:grid-cols-2">{overviewCards}</section>
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
    const activeSessions = attendanceSummary.filter((item) => item.activeSessionCount > 0).length;
    const averageScreenTime =
      attendanceSummary.length > 0
        ? Math.round(
            attendanceSummary.reduce((sum, item) => sum + item.screenActiveSeconds, 0) /
              attendanceSummary.length
          ) * 1000
        : 0;

    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Employees" value={visibleEmployees.length} />
          <MetricCard label="Active Employees" value={activeEmployees} />
          <MetricCard label="Inactive Employees" value={inactiveEmployees} />
          <MetricCard
            label="Live Sessions"
            value={activeSessions}
            detail={`${attendanceSummary.length} employee day records`}
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
            value={attendanceSummary.length}
            detail="End-of-day attendance summaries"
          />
          <MetricCard
            label="Today Login Capture"
            value={employeeActivityRows.filter((row) => row.attendanceSummary?.firstLoginAt).length}
          />
          <MetricCard
            label="Last Seen Captured"
            value={employeeActivityRows.filter((row) => row.activitySummary?.lastSeenAt).length}
          />
        </section>

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
          ) : attendanceSummary.length === 0 ? (
            <p className="muted-copy mt-6 text-sm">No attendance records are available yet.</p>
          ) : (
            <ReportTable
              headings={[
                "Employee",
                "Date",
                "First Login",
                "Last Logout",
                "Worked Hours",
                "Screen Time",
                "Idle Time",
                "Last Seen",
                "Status",
              ]}
            >
              {attendanceSummary.map((summary, index) => (
                <tr
                  key={summary.key}
                  className={
                    index === attendanceSummary.length - 1
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
                    {formatDateTime(summary.firstLoginAt)}
                  </td>
                  <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                    {formatDateTime(summary.lastLogoutAt)}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                    {formatDuration(summary.totalWorkedMs)}
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
                      {summary.activeSessionCount > 0 ? "Active session" : "Day closed"}
                    </span>
                  </td>
                </tr>
              ))}
            </ReportTable>
          )}
        </section>

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
          ) : employeeActivityRows.length === 0 ? (
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
              {employeeActivityRows.map((row, index) => (
                <tr
                  key={row.employee.id}
                  className={
                    index === employeeActivityRows.length - 1
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
      </div>
    );
  }

  if (module === "jobs") {
    const openJobs = visibleJobs.filter((job) => job.status === "open").length;
    const draftJobs = visibleJobs.filter((job) => job.status === "draft").length;
    const closedJobs = visibleJobs.filter((job) => job.status === "closed").length;
    const activeRecruiters = new Set(
      jobsReportRows.map((job) => job.recruiterEmail || job.recruiterId).filter(Boolean)
    ).size;

    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Open Jobs" value={openJobs} />
          <MetricCard label="Draft Jobs" value={draftJobs} />
          <MetricCard label="Closed Jobs" value={closedJobs} />
          <MetricCard label="Applications" value={visibleApplications.length} />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active Recruiters" value={activeRecruiters} />
          <MetricCard
            label="Shortlisted"
            value={applicationTotals.shortlisted}
            detail="Candidates moved beyond applied stage"
          />
          <MetricCard label="Interview" value={applicationTotals.interview} />
          <MetricCard label="Joined" value={applicationTotals.joined} />
        </section>

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
          ) : jobsReportRows.length === 0 ? (
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
              {jobsReportRows.map((job, index) => (
                <tr
                  key={job.id}
                  className={
                    index === jobsReportRows.length - 1
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
          ) : visibleHistory.length === 0 ? (
            <p className="muted-copy mt-6 text-sm">No stage updates have been recorded yet.</p>
          ) : (
            <ReportTable
              headings={["Candidate", "Job", "From", "To", "Effective Date", "Remarks", "Changed At"]}
            >
              {visibleHistory.map((item, index) => (
                <tr
                  key={item.id}
                  className={
                    index === visibleHistory.length - 1
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
      </div>
    );
  }

  if (module === "candidates") {
    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Applied" value={applicationTotals.applied} />
          <MetricCard label="Shortlisted" value={applicationTotals.shortlisted} />
          <MetricCard label="Interview" value={applicationTotals.interview} />
          <MetricCard label="Offered" value={applicationTotals.offered} />
          <MetricCard label="Joined" value={applicationTotals.joined} />
          <MetricCard label="Rejected" value={applicationTotals.rejected} />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Applications" value={visibleApplications.length} />
          <MetricCard label="Website Enquiries" value={state.enquiries.length} />
          <MetricCard
            label="Website Apply"
            value={
              visibleApplications.filter(
                (application) => getCandidateSourceLabel(application) === "Website Apply"
              ).length
            }
          />
          <MetricCard
            label="Manual Entries"
            value={
              visibleApplications.filter(
                (application) => getCandidateSourceLabel(application) !== "Website Apply"
              ).length
            }
          />
        </section>

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
          ) : visibleApplications.length === 0 ? (
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
              {[...visibleApplications]
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

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="accent-card p-7">
            <p className="eyebrow">Source Mix</p>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-[var(--color-ink)]">
              Understand where applications are coming from.
            </h2>
            {isLoading ? (
              <p className="muted-copy mt-6 text-sm">Loading source metrics...</p>
            ) : candidateSourceMetrics.length === 0 ? (
              <p className="muted-copy mt-6 text-sm">No source information is available yet.</p>
            ) : (
              <div className="mt-6 space-y-3">
                {candidateSourceMetrics.map((item) => (
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

          <section className="accent-card p-7">
            <p className="eyebrow">General Enquiries</p>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-[var(--color-ink)]">
              Website candidate enquiries without a job application.
            </h2>
            {isLoading ? (
              <p className="muted-copy mt-6 text-sm">Loading candidate enquiries...</p>
            ) : recentEnquiries.length === 0 ? (
              <p className="muted-copy mt-6 text-sm">No website enquiries are available yet.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {recentEnquiries.map((enquiry) => (
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
                      {enquiry.preferredLocation ? ` • ${enquiry.preferredLocation}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    );
  }

  const pendingTransfers = visibleTransferRequests.filter((request) => request.status === "pending").length;
  const approvedTransfers = visibleTransferRequests.filter((request) => request.status === "approved").length;
  const rejectedTransfers = visibleTransferRequests.filter((request) => request.status === "rejected").length;
  const unassignedClients = visibleClients.filter((client) => !client.assignedEmployeeId).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Clients" value={visibleClients.length} />
        <MetricCard
          label="Active Clients"
          value={visibleClients.filter((client) => client.status === "active").length}
        />
        <MetricCard label="Unassigned Clients" value={unassignedClients} />
        <MetricCard
          label="Linked Jobs"
          value={visibleClients.reduce((sum, client) => sum + client.linkedJobsCount, 0)}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Pending Transfers" value={pendingTransfers} />
        <MetricCard label="Approved Transfers" value={approvedTransfers} />
        <MetricCard label="Rejected Transfers" value={rejectedTransfers} />
      </section>

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
        ) : clientReportRows.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">No clients are available yet.</p>
        ) : (
          <ReportTable
            headings={[
              "Client",
              "Owner",
              "Linked Jobs",
              "Applications",
              "Joined",
              "Status",
              "Created At",
            ]}
          >
            {clientReportRows.map((row, index) => (
              <tr
                key={row.client.id}
                className={
                  index === clientReportRows.length - 1
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

      {(authType === "admin" || authRole === "super-admin") && (
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
          ) : visibleTransferRequests.length === 0 ? (
            <p className="muted-copy mt-6 text-sm">No client transfer requests are available yet.</p>
          ) : (
            <ReportTable
              headings={["Client", "Requested By", "Requested To", "Status", "Reason", "Reviewed At"]}
            >
              {visibleTransferRequests.map((request, index) => (
                <tr
                  key={request.id}
                  className={
                    index === visibleTransferRequests.length - 1
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
