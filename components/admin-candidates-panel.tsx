"use client";

import { useEffect, useMemo, useState } from "react";
import {
  updateJobApplicationStage,
  type JobApplication,
  type JobApplicationStage,
} from "@/lib/jobs";

const stageOptions: JobApplicationStage[] = [
  "applied",
  "shortlisted",
  "interview",
  "offered",
  "joined",
  "rejected",
];

function labelizeStage(stage: JobApplicationStage) {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

export function AdminCandidatesPanel() {
  const [token, setToken] = useState("");
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [isUpdatingId, setIsUpdatingId] = useState("");

  useEffect(() => {
    const savedToken = window.localStorage.getItem("werklyAdminToken") ?? "";
    setToken(savedToken);
  }, []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch("/api/admin/applications", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          applications?: JobApplication[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(result.message || "Unable to load candidates.");
        }

        setApplications(result.applications ?? []);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load candidates."
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const filteredApplications = useMemo(() => {
    return applications.filter((application) => {
      const matchesQuery =
        !query ||
        [
          application.candidateName,
          application.candidateEmail,
          application.jobTitle,
          application.jobCode,
          application.clientName,
          application.recruiterName,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(query.trim().toLowerCase())
          );

      const matchesStage =
        stageFilter === "all" || (application.stage ?? "applied") === stageFilter;

      return matchesQuery && matchesStage;
    });
  }, [applications, query, stageFilter]);

  const stageCounts = useMemo(() => {
    return stageOptions.reduce<Record<JobApplicationStage, number>>((acc, stage) => {
      acc[stage] = applications.filter(
        (application) => (application.stage ?? "applied") === stage
      ).length;
      return acc;
    }, {} as Record<JobApplicationStage, number>);
  }, [applications]);

  async function handleStageChange(id: string, stage: JobApplicationStage) {
    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    setIsUpdatingId(id);
    setError("");

    try {
      const updated = await updateJobApplicationStage(id, stage, token);
      setApplications((current) =>
        current.map((application) =>
          application.id === id ? { ...application, stage: updated.stage } : application
        )
      );
    } catch (stageError) {
      setError(
        stageError instanceof Error
          ? stageError.message
          : "Unable to update candidate stage."
      );
    } finally {
      setIsUpdatingId("");
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stageOptions.map((stage) => (
          <article key={stage} className="accent-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
              {labelizeStage(stage)}
            </p>
            <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
              {stageCounts[stage] ?? 0}
            </p>
          </article>
        ))}
      </section>

      <section className="accent-card p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Candidate Workspace</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
              Review applicants across every live mandate.
            </h2>
            <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
              Search candidates, move them between pipeline stages, and keep recruiter ownership visible in one table.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search candidate, job, client, recruiter"
              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
            />
            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value="all">All stages</option>
              {stageOptions.map((stage) => (
                <option key={stage} value={stage}>
                  {labelizeStage(stage)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading candidates...</p>
        ) : filteredApplications.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">No candidates matched the current filters.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {[
                      "Candidate",
                      "Contact",
                      "Job",
                      "Client",
                      "Recruiter",
                      "Stage",
                      "Applied Date",
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
                  {filteredApplications.map((application, index) => (
                    <tr
                      key={application.id}
                      className={
                        index === filteredApplications.length - 1
                          ? "align-top"
                          : "align-top border-b border-[var(--color-line)]"
                      }
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[var(--color-ink)]">
                          {application.candidateName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {application.experience || "Experience not added"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <p>{application.candidateEmail}</p>
                        {application.candidatePhone ? (
                          <p className="mt-1">{application.candidatePhone}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <p className="font-medium text-[var(--color-ink)]">
                          {application.jobTitle || "Untitled job"}
                        </p>
                        <p className="mt-1">
                          {application.jobCode || "Pending ID"}
                          {application.jobLocation ? ` • ${application.jobLocation}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {application.clientName || "Not linked"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <p>{application.recruiterName || "Unassigned"}</p>
                        {application.recruiterEmail ? (
                          <p className="mt-1">{application.recruiterEmail}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <select
                          value={application.stage ?? "applied"}
                          disabled={isUpdatingId === application.id}
                          onChange={(event) =>
                            handleStageChange(
                              application.id,
                              event.target.value as JobApplicationStage
                            )
                          }
                          className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                        >
                          {stageOptions.map((stage) => (
                            <option key={stage} value={stage}>
                              {labelizeStage(stage)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {new Date(application.appliedAt).toLocaleString("en-IN", {
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
