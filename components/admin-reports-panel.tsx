"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClientRecord, EmployeeRecord } from "@/lib/crm";
import type { JobApplication } from "@/lib/jobs";

type ReportState = {
  applications: JobApplication[];
  clients: ClientRecord[];
  employees: EmployeeRecord[];
};

export function AdminReportsPanel() {
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [state, setState] = useState<ReportState>({
    applications: [],
    clients: [],
    employees: [],
  });
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      fetch("/api/admin/applications", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => response.json()),
      fetch("/api/admin/clients", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => response.json()),
      fetch("/api/admin/employees", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => response.json()),
    ])
      .then(([applicationsResult, clientsResult, employeesResult]) => {
        setState({
          applications: applicationsResult.applications ?? [],
          clients: clientsResult.clients ?? [],
          employees: employeesResult.employees ?? [],
        });
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const recruiterReport = useMemo(() => {
    return state.employees
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
  }, [state]);

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
    </div>
  );
}
