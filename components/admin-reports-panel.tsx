"use client";

import { useEffect, useMemo, useState } from "react";
import type { AttendanceSessionRecord } from "@/lib/attendance";
import type { ClientRecord, EmployeeRecord } from "@/lib/crm";
import type { JobApplication, JobApplicationStageHistory } from "@/lib/jobs";

type ReportState = {
  applications: JobApplication[];
  history: JobApplicationStageHistory[];
  clients: ClientRecord[];
  employees: EmployeeRecord[];
  attendance: AttendanceSessionRecord[];
};

export function AdminReportsPanel() {
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
    ])
      .then(
        ([
          applicationsResult,
          historyResult,
          clientsResult,
          employeesResult,
          attendanceResult,
        ]) => {
        setState({
          applications: applicationsResult.applications ?? [],
          history: historyResult.history ?? [],
          clients: clientsResult.clients ?? [],
          employees: employeesResult.employees ?? [],
          attendance: attendanceResult.attendance ?? [],
        });
        }
      )
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

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

      <section className="accent-card p-7">
        <p className="eyebrow">Attendance Log</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
          Track login and logout time for daily attendance.
        </h2>
        <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
          Login and logout entries combine server audit timestamps with laptop local time so you can review attendance alongside recruiter activity.
        </p>

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading attendance log...</p>
        ) : visibleAttendance.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">No attendance records are available yet.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {[
                      "Employee",
                      "Login Time",
                      "Laptop Login",
                      "Logout Time",
                      "Laptop Logout",
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
                  {visibleAttendance.map((session, index) => (
                    <tr
                      key={session.sessionId}
                      className={
                        index === visibleAttendance.length - 1
                          ? "align-top"
                          : "align-top border-b border-[var(--color-line)]"
                      }
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[var(--color-ink)]">
                          {session.userName || session.userIdentifier}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {session.userIdentifier}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {new Date(session.loginAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {session.loginClientTime ? (
                          <>
                            <p>
                              {new Date(session.loginClientTime).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </p>
                            <p className="mt-1 text-xs">
                              {session.loginClientTimezone || "Local timezone not shared"}
                            </p>
                          </>
                        ) : (
                          "Not captured"
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {session.logoutAt
                          ? new Date(session.logoutAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Active session"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {session.logoutClientTime ? (
                          <>
                            <p>
                              {new Date(session.logoutClientTime).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </p>
                            <p className="mt-1 text-xs">
                              {session.logoutClientTimezone || "Local timezone not shared"}
                            </p>
                          </>
                        ) : (
                          "Not captured"
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className="font-semibold text-[var(--color-accent-strong)]">
                          {session.logoutAt ? "Logged out" : "Logged in"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="accent-card p-7">
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

      <section className="accent-card p-7">
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
                        <p className="mt-1">{item.jobCode || "Pending ID"}</p>
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
