"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ClientRecord, EmployeeRecord } from "@/lib/crm";
import { getAdminApplications, type JobApplication, type JobSummary } from "@/lib/jobs";

type DashboardState = {
  jobs: JobSummary[];
  clients: ClientRecord[];
  employees: EmployeeRecord[];
  applications: JobApplication[];
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

export function AdminDashboardOverview() {
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
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
      getAdminApplications(token),
    ])
      .then(async ([jobsResponse, clientsResponse, employeesResponse, applications]) => {
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

        if (!jobsResponse.ok) {
          throw new Error(jobsResult.message || "Unable to load jobs.");
        }
        if (!clientsResponse.ok) {
          throw new Error(clientsResult.message || "Unable to load clients.");
        }
        if (!employeesResponse.ok) {
          throw new Error(employeesResult.message || "Unable to load employees.");
        }

        setState({
          jobs: jobsResult.jobs ?? [],
          clients: clientsResult.clients ?? [],
          employees: employeesResult.employees ?? [],
          applications,
        });
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

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

    return {
      liveJobs: liveJobs.length,
      draftJobs: state.jobs.filter((job) => job.status === "draft").length,
      totalApplications: state.applications.length,
      activeClients: state.clients.filter((client) => client.status === "active").length,
      activeEmployees: state.employees.filter((employee) => employee.status === "active")
        .length,
      shortlisted: state.applications.filter(
        (application) => (application.stage ?? "applied") === "shortlisted"
      ).length,
      interview: state.applications.filter(
        (application) => (application.stage ?? "applied") === "interview"
      ).length,
      offered: state.applications.filter(
        (application) => (application.stage ?? "applied") === "offered"
      ).length,
      joined: state.applications.filter(
        (application) => (application.stage ?? "applied") === "joined"
      ).length,
      latestJobs: [...state.jobs]
        .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
        .slice(0, 5),
      recruiterSummary: state.employees
        .filter((employee) => employee.status === "active")
        .map((employee) => {
          const assignedClients = state.clients.filter(
            (client) => client.assignedEmployeeId === employee.id
          ).length;
          const applications = state.applications.filter(
            (application) => application.recruiterEmail === employee.email
          );

          return {
            id: employee.id,
            fullName: employee.fullName,
            assignedClients,
            applications: applications.length,
            interviews: applications.filter(
              (application) => (application.stage ?? "applied") === "interview"
            ).length,
            joined: applications.filter(
              (application) => (application.stage ?? "applied") === "joined"
            ).length,
          };
        })
        .sort((a, b) => b.applications - a.applications)
        .slice(0, 5),
    };
  }, [state]);

  if (!token) {
    return (
      <section className="accent-card p-8">
        <p className="eyebrow">Session Required</p>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
          Sign in to open the CRM dashboard.
        </h2>
        <p className="muted-copy mt-3 text-base leading-7">
          Your admin session is missing on this browser. Open the login screen and sign in again.
        </p>
        <Link
          href="/admin/login"
          className="mt-6 inline-flex rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
        >
          Go to Admin Login
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Live Jobs", value: metrics.liveJobs },
          { label: "Draft Jobs", value: metrics.draftJobs },
          { label: "Applications", value: metrics.totalApplications },
          { label: "Active Clients", value: metrics.activeClients },
          { label: "Active Employees", value: metrics.activeEmployees },
        ].map((card) => (
          <article key={card.label} className="accent-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
              {card.label}
            </p>
            <p className="mt-4 text-4xl font-semibold text-[var(--color-ink)]">
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Shortlisted", value: metrics.shortlisted },
          { label: "Interview", value: metrics.interview },
          { label: "Offered", value: metrics.offered },
          { label: "Joined", value: metrics.joined },
        ].map((card) => (
          <article key={card.label} className="accent-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
              {card.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="accent-card p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Recent Jobs</p>
              <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
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
            <p className="muted-copy mt-6 text-sm">Loading dashboard data...</p>
          ) : error ? (
            <p className="mt-6 text-sm font-medium text-red-700">{error}</p>
          ) : metrics.latestJobs.length === 0 ? (
            <p className="muted-copy mt-6 text-sm">No jobs have been posted yet.</p>
          ) : (
            <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[var(--color-line)]">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Job
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Client
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Deadline
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Applied
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.latestJobs.map((job, index) => (
                    <tr
                      key={job.id}
                      className={
                        index === metrics.latestJobs.length - 1
                          ? "align-top"
                          : "align-top border-b border-[var(--color-line)]"
                      }
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-[var(--color-ink)]">{job.title}</p>
                          <p className="mt-1 text-sm text-[var(--color-muted)]">
                            {job.jobCode || "Pending ID"} • {job.location}
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

        <article className="accent-card p-7">
          <p className="eyebrow">Quick Actions</p>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
            Move faster inside the CRM
          </h2>
          <div className="mt-6 grid gap-4">
            {[
              {
                href: "/admin/jobs",
                title: "Post a job",
                body: "Create a new opening, assign it to a client, and publish it to the public jobs page.",
              },
              {
                href: "/admin/clients",
                title: "Onboard a client",
                body: "Capture company contacts, upload the signed agreement PDF, and assign account ownership.",
              },
              {
                href: "/admin/employees",
                title: "Create employee access",
                body: "Set up team logins so recruiters can manage clients, jobs, and follow-ups.",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-5 transition hover:border-[var(--color-dark)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
              >
                <p className="text-lg font-semibold text-[var(--color-ink)]">{item.title}</p>
                <p className="muted-copy mt-2 text-sm leading-6">{item.body}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="accent-card p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Recruiter Snapshot</p>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
              Follow-up ownership across active employees
            </h2>
          </div>
          <Link
            href="/admin/reports"
            className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
          >
            Open Reports
          </Link>
        </div>

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading recruiter summary...</p>
        ) : metrics.recruiterSummary.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">No recruiter summary is available yet.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[var(--color-line)]">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                  {["Recruiter", "Clients", "Applications", "Interviews", "Joined"].map(
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
                      {row.applications}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {row.interviews}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {row.joined}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
