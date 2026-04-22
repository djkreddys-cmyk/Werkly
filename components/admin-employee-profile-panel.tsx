"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { EmployeeRecord } from "@/lib/crm";
import type { TimelineEventRecord } from "@/lib/workflow";

function formatDateLabel(value?: string) {
  if (!value) {
    return "Not added";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeLabel(value?: string) {
  if (!value) {
    return "Not added";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatLabel(value?: string) {
  return String(value || "not-added")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminEmployeeProfilePanel({ employeeId }: { employeeId: string }) {
  const [token] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("werklyAdminToken") ?? "" : ""
  );
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null);
  const [timeline, setTimeline] = useState<TimelineEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      fetch(`/api/admin/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/admin/timeline?entityType=employee&entityId=${employeeId}&limit=40`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([employeeResponse, timelineResponse]) => {
        const employeeResult = (await employeeResponse.json()) as EmployeeRecord & {
          message?: string;
        };
        const timelineResult = (await timelineResponse.json()) as {
          timeline?: TimelineEventRecord[];
          message?: string;
        };

        if (!employeeResponse.ok) {
          throw new Error(employeeResult.message || "Unable to load employee.");
        }
        if (!timelineResponse.ok) {
          throw new Error(timelineResult.message || "Unable to load employee timeline.");
        }

        setEmployee(employeeResult);
        setTimeline(timelineResult.timeline ?? []);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load employee details."
        );
      })
      .finally(() => setIsLoading(false));
  }, [employeeId, token]);

  if (!token) {
    return (
      <section className="accent-card p-8">
        <p className="eyebrow">Session Required</p>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
          Sign in to view the employee profile.
        </h2>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="accent-card p-8">
        <p className="muted-copy text-sm">Loading employee profile...</p>
      </section>
    );
  }

  if (error && !employee) {
    return (
      <section className="accent-card p-8">
        <p className="text-sm font-medium text-red-700">{error}</p>
      </section>
    );
  }

  if (!employee) {
    return (
      <section className="accent-card p-8">
        <p className="muted-copy text-sm">Employee not found.</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="accent-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Employee Profile</p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">
              {employee.fullName}
            </h2>
            <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
              Review role details, education, experience, status changes, and the shared employee
              timeline from one dedicated CRM detail page.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/employees/existing"
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
            >
              Back to Employees
            </Link>
            <Link
              href="/admin/reports/hr/activity"
              className="rounded-2xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
            >
              Open HR Reports
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Employee Code", employee.employeeCode || "Not added"],
          ["Role", employee.role],
          ["Status", formatLabel(employee.status)],
          ["Created On", formatDateLabel(employee.createdAt)],
        ].map(([label, value]) => (
          <article key={label} className="accent-card p-5">
            <p className="eyebrow">{label}</p>
            <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.98fr_1.02fr]">
        <article className="accent-card p-6">
          <p className="eyebrow">Employee Snapshot</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Email", employee.email],
              ["Phone", employee.phone || "Not added"],
              ["DOB", formatDateLabel(employee.dateOfBirth)],
              ["DOJ", formatDateLabel(employee.dateOfJoining)],
              ["Qualification", employee.educationQualification || "Not added"],
              ["Previous Experience", employee.previousExperience || "Not added"],
              ["Inactive Date", formatDateLabel(employee.inactiveDate)],
              ["Inactivation Remarks", employee.inactiveRemarks || "Not added"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.2rem] border border-[var(--color-line)] bg-white p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  {label}
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.2rem] border border-[var(--color-line)] bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Education Details
              </p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--color-muted)]">
                {(employee.educationDetails ?? []).length ? (
                  employee.educationDetails?.map((entry, index) => (
                    <div key={`${entry.qualification}-${index}`} className="rounded-xl bg-[rgba(8,96,108,0.03)] px-3 py-2">
                      <p className="font-semibold text-[var(--color-ink)]">{entry.qualification}</p>
                      <p>{[entry.specialization, entry.institution, entry.yearOfPassing].filter(Boolean).join(" · ") || "Not added"}</p>
                    </div>
                  ))
                ) : (
                  <p>Not added</p>
                )}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-[var(--color-line)] bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Experience Details
              </p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--color-muted)]">
                {(employee.experienceDetails ?? []).length ? (
                  employee.experienceDetails?.map((entry, index) => (
                    <div key={`${entry.companyName}-${index}`} className="rounded-xl bg-[rgba(8,96,108,0.03)] px-3 py-2">
                      <p className="font-semibold text-[var(--color-ink)]">{entry.companyName}</p>
                      <p>{[entry.designation, entry.totalDuration, entry.industry].filter(Boolean).join(" · ") || "Not added"}</p>
                    </div>
                  ))
                ) : (
                  <p>Not added</p>
                )}
              </div>
            </div>
          </div>
        </article>

        <article className="accent-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Timeline</p>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                Shared workflow activity
              </h3>
            </div>
            <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
              {timeline.length} events
            </span>
          </div>

          {timeline.length === 0 ? (
            <div className="mt-6 rounded-[1.25rem] border border-[var(--color-line)] bg-white p-5">
              <p className="muted-copy text-sm">No workflow events are recorded for this employee yet.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {timeline.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-[1.25rem] border border-[var(--color-line)] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">{entry.title}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {entry.actorName || "Werkly User"}
                        {entry.actorRole ? ` - ${formatLabel(entry.actorRole)}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-dark)]">
                      {formatLabel(entry.eventType)}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
                    {entry.summary || "No summary added for this event."}
                  </p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-accent-strong)]">
                    {formatDateTimeLabel(entry.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
