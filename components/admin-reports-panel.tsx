"use client";

import { useEffect, useMemo, useState } from "react";
import type { AttendanceSessionRecord } from "@/lib/attendance";
import type { ScreenActivityRecord } from "@/lib/activity";
import type { ClientRecord, EmployeeRecord } from "@/lib/crm";
import type { JobApplication, JobApplicationStageHistory } from "@/lib/jobs";
import { AdminJobIdTrigger } from "@/components/admin-job-id-trigger";

type ReportState = {
  applications: JobApplication[];
  history: JobApplicationStageHistory[];
  clients: ClientRecord[];
  employees: EmployeeRecord[];
  attendance: AttendanceSessionRecord[];
  activity: ScreenActivityRecord[];
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

function formatDateTime(value?: string) {
  if (!value) {
    return "Not captured";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDuration(totalMs: number) {
  const safeMs = Math.max(totalMs, 0);
  const totalMinutes = Math.floor(safeMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

const reportSectionConfig = {
  attendance: {
    id: "attendance-report",
    label: "HR Report",
    title: "Attendance and screen-time report",
  },
  recruiters: {
    id: "recruiter-report",
    label: "Client Report",
    title: "Recruiter and client allocation report",
  },
  stages: {
    id: "stage-report",
    label: "Jobs and candidates report",
    title: "Stage movement and pipeline report",
  },
} as const;

type AdminReportsPanelProps = {
  reportView?: string;
};

export function AdminReportsPanel({ reportView }: AdminReportsPanelProps) {
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
  const [state, setState] = useState<ReportState>({
    applications: [],
    history: [],
    clients: [],
    employees: [],
    attendance: [],
    activity: [],
  });
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const focusedReport =
    reportView && reportView in reportSectionConfig
      ? reportSectionConfig[reportView as keyof typeof reportSectionConfig]
      : null;

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
    ])
      .then(
        ([
          applicationsResult,
          historyResult,
          clientsResult,
          employeesResult,
          attendanceResult,
          activityResult,
        ]) => {
        setState({
          applications: applicationsResult.applications ?? [],
          history: historyResult.history ?? [],
          clients: clientsResult.clients ?? [],
          employees: employeesResult.employees ?? [],
          attendance: attendanceResult.attendance ?? [],
          activity: activityResult.activity ?? [],
        });
        }
      )
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    if (!focusedReport) {
      return;
    }

    const section = document.getElementById(focusedReport.id);
    if (!section) {
      return;
    }

    requestAnimationFrame(() => {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [focusedReport]);

  const recruiterReport = useMemo(() => {
    const isEmployeeSession = authType === "employee" || Boolean(authEmployeeCode);

    const visibleEmployees =
      isEmployeeSession
        ? state.employees.filter(
            (employee) =>
              employee.employeeCode === authEmployeeCode ||
              employee.email === authEmail ||
              employee.employeeCode === authEmail
          )
        : state.employees;

    return visibleEmployees
      .filter((employee) => employee.status === "active")
      .map((employee) => {
        const assignedClients = state.clients.filter(
          (client) => client.assignedEmployeeId === employee.id
        );
        const clientNames = new Set(assignedClients.map((client) => client.companyName));
        const recruiterApplications = state.applications.filter(
          (application) => application.recruiterEmail === employee.email
        );

        const countByStage = (stage: string) =>
          recruiterApplications.filter(
            (application) => (application.stage ?? "applied") === stage
          ).length;

        return {
          employee,
          assignedClients: assignedClients.length,
          totalApplications: recruiterApplications.length,
          applied: countByStage("applied"),
          shortlisted: countByStage("shortlisted"),
          interview: countByStage("interview"),
          offered: countByStage("offered"),
          joined: countByStage("joined"),
          rejected: countByStage("rejected"),
          clientNames: Array.from(clientNames),
        };
      })
      .sort((a, b) => b.totalApplications - a.totalApplications);
  }, [authEmployeeCode, authEmail, authType, state]);

  const visibleAttendance = useMemo(() => {
    if (authType !== "employee" && !authEmployeeCode) {
      return state.attendance;
    }

    return state.attendance.filter(
      (session) =>
        session.userIdentifier === authEmployeeCode ||
        session.userIdentifier === authEmail ||
        session.userId ===
          state.employees.find(
            (employee) =>
              employee.employeeCode === authEmployeeCode || employee.email === authEmail
          )?.id
    );
  }, [authEmail, authEmployeeCode, authType, state.attendance, state.employees]);

  const attendanceSummary = useMemo(() => {
    const summaries = new Map<string, AttendanceDaySummary>();
    const activitySummaryMap = new Map<
      string,
      { activeSeconds: number; idleSeconds: number; lastSeenAt?: string }
    >();

    const visibleActivity =
      authType !== "employee" && !authEmployeeCode
        ? state.activity
        : state.activity.filter(
            (entry) =>
              entry.userIdentifier === authEmployeeCode ||
              entry.userIdentifier === authEmail ||
              entry.userId ===
                state.employees.find(
                  (employee) =>
                    employee.employeeCode === authEmployeeCode || employee.email === authEmail
                )?.id
          );

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
      const workedMs =
        logoutTime && logoutTime >= loginTime ? logoutTime - loginTime : 0;

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

    return Array.from(summaries.values())
      .map((summary) => ({
        ...summary,
        sessions: [...summary.sessions].sort(
          (a, b) => new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime()
        ),
      }))
      .sort((a, b) => {
        const dateSort = new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
        if (dateSort !== 0) {
          return dateSort;
        }

        return a.userName.localeCompare(b.userName);
      });
  }, [authEmail, authEmployeeCode, authType, state.activity, state.employees, visibleAttendance]);

  const totals = useMemo(() => {
    const countByStage = (stage: string) =>
      state.applications.filter((application) => (application.stage ?? "applied") === stage)
        .length;

    return {
      totalApplications: state.applications.length,
      applied: countByStage("applied"),
      shortlisted: countByStage("shortlisted"),
      interview: countByStage("interview"),
      offered: countByStage("offered"),
      joined: countByStage("joined"),
      rejected: countByStage("rejected"),
    };
  }, [state.applications]);

  return (
    <div className="space-y-6">
      {focusedReport ? (
        <section className="accent-card flex flex-col gap-3 border border-[rgba(241,166,75,0.28)] bg-[linear-gradient(135deg,rgba(241,166,75,0.16),rgba(255,255,255,0.96))] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">{focusedReport.label}</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
              {focusedReport.title}
            </h2>
          </div>
          <a
            href={`#${focusedReport.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-[rgba(8,96,108,0.16)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[rgba(241,166,75,0.36)] hover:bg-[rgba(241,166,75,0.08)]"
          >
            Open Report Section
          </a>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Applied", value: totals.applied },
          { label: "Shortlisted", value: totals.shortlisted },
          { label: "Interview", value: totals.interview },
          { label: "Offered", value: totals.offered },
          { label: "Joined", value: totals.joined },
          { label: "Rejected", value: totals.rejected },
        ].map((metric) => (
          <article key={metric.label} className="accent-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
              {metric.label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
              {metric.value}
            </p>
          </article>
        ))}
      </section>

      <section
        id={reportSectionConfig.attendance.id}
        className={`accent-card p-7 ${
          focusedReport?.id === reportSectionConfig.attendance.id
            ? "ring-2 ring-[rgba(241,166,75,0.32)]"
            : ""
        }`}
      >
        <p className="eyebrow">Attendance Log</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
          Track login, logout, screen time, and end-of-day worked hours.
        </h2>
        <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
          This end-of-day report shows first login, last logout, worked hours, screen time, idle time, and last activity for each employee.
        </p>

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading attendance log...</p>
        ) : attendanceSummary.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">No attendance records are available yet.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {[
                      "Employee",
                      "Date",
                      "First Login",
                      "Last Logout",
                      "Worked Hours",
                      "Screen Time",
                      "Idle Time",
                      "Last Seen",
                      "Status",
                    ].map((heading) => (
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
                        <p className="font-semibold text-[var(--color-ink)]">
                          {summary.userName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {summary.userIdentifier}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {new Date(summary.reportDate).toLocaleDateString("en-IN", {
                          dateStyle: "medium",
                        })}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <p>{formatDateTime(summary.firstLoginAt)}</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          Session start of the day
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <p>{formatDateTime(summary.lastLogoutAt)}</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          {summary.lastLogoutAt ? "Last captured logout" : "Still logged in"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <p className="font-semibold text-[var(--color-ink)]">
                          {formatDuration(summary.totalWorkedMs)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          Based on completed login/logout pairs
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <p className="font-semibold text-[var(--color-ink)]">
                          {formatDuration(summary.screenActiveSeconds * 1000)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          Active CRM screen usage
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <p className="font-semibold text-[var(--color-ink)]">
                          {formatDuration(summary.screenIdleSeconds * 1000)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          Idle CRM time
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <p>{formatDateTime(summary.lastSeenAt)}</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          Last tracked CRM activity
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className="font-semibold text-[var(--color-accent-strong)]">
                          {summary.activeSessionCount > 0 ? "Active session" : "Day closed"}
                        </span>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          {summary.sessions.length} session{summary.sessions.length === 1 ? "" : "s"}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section
        id={reportSectionConfig.recruiters.id}
        className={`accent-card p-7 ${
          focusedReport?.id === reportSectionConfig.recruiters.id
            ? "ring-2 ring-[rgba(241,166,75,0.32)]"
            : ""
        }`}
      >
        <p className="eyebrow">Recruiter Follow-Up Report</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
          Track recruiter workload and candidate movement.
        </h2>
        <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
          This report maps active employees against assigned clients and candidate stage movement so you can review follow-up ownership at the end of the day.
        </p>

        {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading recruiter report...</p>
        ) : recruiterReport.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">No recruiter data is available yet.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {[
                      "Recruiter",
                      "Assigned Clients",
                      "Applications",
                      "Applied",
                      "Shortlisted",
                      "Interview",
                      "Offered",
                      "Joined",
                      "Rejected",
                    ].map((heading) => (
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
                  {recruiterReport.map((item, index) => (
                    <tr
                      key={item.employee.id}
                      className={
                        index === recruiterReport.length - 1
                          ? "align-top"
                          : "align-top border-b border-[var(--color-line)]"
                      }
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[var(--color-ink)]">
                          {item.employee.fullName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {item.employee.email}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <p>{item.assignedClients}</p>
                        {item.clientNames.length ? (
                          <p className="mt-1 max-w-[220px] text-xs leading-5">
                            {item.clientNames.join(", ")}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                        {item.totalApplications}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{item.applied}</td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{item.shortlisted}</td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{item.interview}</td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{item.offered}</td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{item.joined}</td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">{item.rejected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section
        id={reportSectionConfig.stages.id}
        className={`accent-card p-7 ${
          focusedReport?.id === reportSectionConfig.stages.id
            ? "ring-2 ring-[rgba(241,166,75,0.32)]"
            : ""
        }`}
      >
        <p className="eyebrow">Stage Movement Log</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
          Review remarks and dates behind every pipeline move.
        </h2>
        <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
          Shortlist notes, interview remarks, offer updates, and joining confirmations will appear here for end-of-day reporting.
        </p>

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading stage movement log...</p>
        ) : state.history.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">No stage updates have been recorded yet.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {["Candidate", "Job", "Stage", "Stage Date", "Remarks", "Changed At"].map(
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
                  {state.history.map((item, index) => (
                    <tr
                      key={item.id}
                      className={
                        index === state.history.length - 1
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
                          <AdminJobIdTrigger jobId={item.jobId} jobCode={item.jobCode} />
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <span className="font-semibold text-[var(--color-accent-strong)]">
                          {(item.toStage || "applied").charAt(0).toUpperCase() +
                            (item.toStage || "applied").slice(1)}
                        </span>
                        {item.fromStage ? (
                          <p className="mt-1 text-xs">From {item.fromStage}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {item.stageDate
                          ? new Date(item.stageDate).toLocaleDateString("en-IN")
                          : "Not added"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {item.stageNote || "No remarks added"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {new Date(item.changedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
