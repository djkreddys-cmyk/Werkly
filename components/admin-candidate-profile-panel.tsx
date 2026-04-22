"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuditLogRecord } from "@/lib/crm";
import type { JobApplication } from "@/lib/jobs";
import { AdminJobIdTrigger } from "@/components/admin-job-id-trigger";

function formatDateTime(value?: string) {
  if (!value) {
    return "Not added";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatLabel(value?: string) {
  if (!value) {
    return "Not added";
  }

  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getResumeUrl(application: JobApplication | null) {
  if (!application?.resumeFileData) {
    return "";
  }

  if (application.resumeFileData.startsWith("data:")) {
    return application.resumeFileData;
  }

  const fileType = application.resumeFileType || "application/octet-stream";
  return `data:${fileType};base64,${application.resumeFileData}`;
}

export function AdminCandidateProfilePanel({ applicationId }: { applicationId: string }) {
  const [token] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("werklyAdminToken") ?? "" : ""
  );
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      fetch("/api/admin/applications", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/admin/audit-logs?entityType=application&entityId=${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([applicationsResponse, logsResponse]) => {
        const applicationsResult = (await applicationsResponse.json()) as {
          applications?: JobApplication[];
          message?: string;
        };
        const logsResult = (await logsResponse.json()) as {
          logs?: AuditLogRecord[];
          message?: string;
        };

        if (!applicationsResponse.ok) {
          throw new Error(applicationsResult.message || "Unable to load candidate details.");
        }
        if (!logsResponse.ok) {
          throw new Error(logsResult.message || "Unable to load candidate timeline.");
        }

        setApplication(
          (applicationsResult.applications ?? []).find((item) => item.id === applicationId) || null
        );
        setLogs(logsResult.logs ?? []);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load candidate profile."
        );
      })
      .finally(() => setIsLoading(false));
  }, [applicationId, token]);

  const metrics = useMemo(
    () => ({
      totalLogs: logs.length,
      transfers: logs.filter((item) => item.actionType.includes("assigned")).length,
      stageUpdates: logs.filter((item) => item.actionType.includes("stage")).length,
    }),
    [logs]
  );
  const resumeUrl = useMemo(() => getResumeUrl(application), [application]);

  if (isLoading) {
    return (
      <section className="accent-card p-6">
        <p className="muted-copy text-sm">Loading candidate profile...</p>
      </section>
    );
  }

  if (error || !application) {
    return (
      <section className="accent-card p-6">
        <p className="text-sm font-medium text-red-700">
          {error || "Candidate profile is not available."}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="accent-card p-6">
        <p className="eyebrow">Candidate 360</p>
        <h2 className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">
          {application.candidateName}
        </h2>
        <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
          Review current pipeline stage, linked job, recruiter ownership, resume visibility, and
          the full CRM movement history for this candidate.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Current Stage", value: formatLabel(application.stage || "applied") },
          { label: "Recruiter", value: application.recruiterName || "Unassigned" },
          { label: "Timeline Items", value: metrics.totalLogs },
          { label: "Transfers", value: metrics.transfers },
        ].map((card) => (
          <article key={card.label} className="accent-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
              {card.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
        <article className="accent-card p-6">
          <p className="eyebrow">Candidate Details</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Job", application.jobTitle || "Not linked"],
              ["Job ID", application.jobCode || "Not added"],
              ["Client", application.clientName || "Not linked"],
              ["Recruiter", application.recruiterName || "Unassigned"],
              ["Email", application.candidateEmail || "Not added"],
              ["Phone", application.candidatePhone || "Not added"],
              ["Experience", application.experience || "Not added"],
              ["Current Company", application.currentCompany || "Not added"],
              ["Current Location", application.currentLocation || "Not added"],
              ["Applied On", formatDateTime(application.appliedAt)],
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

          {application.jobId ? (
            <div className="mt-5 rounded-[1.2rem] border border-[var(--color-line)] bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Linked Job
              </p>
              <p className="mt-3 text-sm font-semibold text-[var(--color-accent-strong)]">
                <AdminJobIdTrigger jobId={application.jobId} jobCode={application.jobCode} />
              </p>
            </div>
          ) : null}
        </article>

        <article className="accent-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Timeline</p>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                Candidate activity trail
              </h3>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {resumeUrl ? (
                <>
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                  >
                    View Resume
                  </a>
                  <a
                    href={resumeUrl}
                    download={application.resumeFileName || `${application.candidateName}-resume`}
                    className="inline-flex items-center rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                  >
                    Download Resume
                  </a>
                </>
              ) : (
                <span className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-muted)]">
                  No resume uploaded
                </span>
              )}
              <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
                {metrics.stageUpdates} stage updates
              </span>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="mt-6 rounded-[1.25rem] border border-[var(--color-line)] bg-white p-5">
              <p className="muted-copy text-sm">No candidate activity is available yet.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {logs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-[1.25rem] border border-[var(--color-line)] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">
                        {formatLabel(log.actionType)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {log.actorName || "Werkly User"}
                        {log.actorRole ? ` - ${formatLabel(log.actorRole)}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-dark)]">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
                    {String(
                      log.metadata?.candidateName ||
                        log.metadata?.assignmentType ||
                        log.afterData?.stage ||
                        "Candidate record updated."
                    )}
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
