"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
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

function formatDateOnly(value: string) {
  return new Date(value).toLocaleDateString("en-GB");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeCell(value?: string) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : "-";
}

function MoreVerticalIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="10" cy="4.5" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="10" cy="15.5" r="1.5" />
    </svg>
  );
}

export function AdminCandidatesPanel() {
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [isUpdatingId, setIsUpdatingId] = useState("");
  const [actionMenuApplicationId, setActionMenuApplicationId] = useState("");
  const [stageDraft, setStageDraft] = useState<{
    application: JobApplication;
    stage: JobApplicationStage;
    note: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(event.target as Node)
      ) {
        setActionMenuApplicationId("");
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

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

  async function handleStageChange(
    id: string,
    stage: JobApplicationStage,
    stageNote: string,
    stageDate: string
  ) {
    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    setIsUpdatingId(id);
    setError("");

    try {
      const response = await fetch(`/api/admin/jobs/applications/${id}/stage`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stage, stageNote, stageDate }),
      });

      const updated = (await response.json()) as JobApplication & { message?: string };
      if (!response.ok) {
        throw new Error(updated.message || "Unable to update candidate stage.");
      }

      setApplications((current) =>
        current.map((application) =>
          application.id === id
            ? {
                ...application,
                stage: updated.stage,
                stageNote: updated.stageNote,
                stageDate: updated.stageDate,
                stageUpdatedAt: updated.stageUpdatedAt,
              }
            : application
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

  function openStageEditor(
    application: JobApplication,
    nextStage: JobApplicationStage = (application.stage ?? "applied") as JobApplicationStage
  ) {
    setActionMenuApplicationId("");
    setStageDraft({
      application,
      stage: nextStage,
      note: application.stageNote ?? "",
      date: application.stageDate ?? new Date().toISOString().slice(0, 10),
    });
    setError("");
  }

  function handleApplicantDownload() {
    const downloadedDate = formatDateOnly(new Date().toISOString());
    const rows = filteredApplications.map((application, index) => ({
      serialNo: String(index + 1),
      downloadedDate,
      positionName: safeCell(application.jobTitle),
      candidateName: safeCell(application.candidateName),
      mobileNo: safeCell(application.candidatePhone),
      emailId: safeCell(application.candidateEmail),
      currentCompany: safeCell(application.currentCompany),
      totalExp: safeCell(application.experience),
      currentCtc: safeCell(application.currentCtc),
      expectedCtc: safeCell(application.expectedCtc),
      noticePeriod: "-",
      currentLocation: safeCell(application.currentLocation || application.preferredLocation),
    }));

    const tableRows = rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.serialNo)}</td>
            <td>${escapeHtml(row.downloadedDate)}</td>
            <td>${escapeHtml(row.positionName)}</td>
            <td>${escapeHtml(row.candidateName)}</td>
            <td>${escapeHtml(row.mobileNo)}</td>
            <td>${escapeHtml(row.emailId)}</td>
            <td>${escapeHtml(row.currentCompany)}</td>
            <td>${escapeHtml(row.totalExp)}</td>
            <td>${escapeHtml(row.currentCtc)}</td>
            <td>${escapeHtml(row.expectedCtc)}</td>
            <td>${escapeHtml(row.noticePeriod)}</td>
            <td>${escapeHtml(row.currentLocation)}</td>
          </tr>
        `
      )
      .join("");

    const workbookMarkup = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
            th, td { border: 1px solid #111827; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #b9e6f2; font-weight: 700; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>S No</th>
                <th>Date</th>
                <th>Position Name</th>
                <th>Candidate Name</th>
                <th>Mobile No.</th>
                <th>Email ID</th>
                <th>Current Company</th>
                <th>Total Exp</th>
                <th>Current CTC</th>
                <th>Expected CTC</th>
                <th>Notice Period</th>
                <th>Current Location</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([workbookMarkup], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `job-applicants-${downloadedDate.replaceAll("/", "-")}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

      <section id="job-applicants" className="accent-card scroll-mt-28 p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Job Applicants</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
              Review candidates who applied for active jobs.
            </h2>
            <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
              Search job applicants, move them between pipeline stages, and keep recruiter ownership visible in one table.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[520px]">
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
            <button
              type="button"
              onClick={handleApplicantDownload}
              disabled={filteredApplications.length === 0}
              className="rounded-2xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
            >
              Download Applicant Details
            </button>
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
                      "Resume",
                      "Stage",
                      "Applied Date",
                      "Actions",
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
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {application.resumeFileData && application.resumeFileName ? (
                          <div className="flex flex-col gap-2">
                            <a
                              href={application.resumeFileData}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-[var(--color-accent-strong)] transition hover:text-[var(--color-dark)]"
                            >
                              View Resume
                            </a>
                            <a
                              href={application.resumeFileData}
                              download={application.resumeFileName}
                              className="text-xs font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
                            >
                              Download
                            </a>
                          </div>
                        ) : (
                          "No resume"
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <select
                          value={application.stage ?? "applied"}
                          disabled={isUpdatingId === application.id}
                          onChange={(event) =>
                            openStageEditor(
                              application,
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
                        {application.stageNote ? (
                          <p className="mt-2 max-w-[220px] text-xs leading-5 text-[var(--color-muted)]">
                            {application.stageNote}
                          </p>
                        ) : null}
                        {application.stageDate ? (
                          <p className="mt-1 text-xs font-medium text-[var(--color-accent-strong)]">
                            {new Date(application.stageDate).toLocaleDateString("en-IN")}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {new Date(application.appliedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div
                          className="relative inline-flex"
                          ref={
                            actionMenuApplicationId === application.id ? actionsMenuRef : null
                          }
                        >
                          <button
                            type="button"
                            aria-label={`Open actions for ${application.candidateName}`}
                            aria-expanded={actionMenuApplicationId === application.id}
                            onClick={() =>
                              setActionMenuApplicationId((current) =>
                                current === application.id ? "" : application.id
                              )
                            }
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-line)] bg-white text-[var(--color-dark)] transition hover:border-[var(--color-dark)] hover:bg-[rgba(8,96,108,0.06)]"
                          >
                            <MoreVerticalIcon />
                          </button>

                          {actionMenuApplicationId === application.id ? (
                            <div className="absolute right-0 top-12 z-20 min-w-[210px] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                              <button
                                type="button"
                                onClick={() => openStageEditor(application)}
                                className="flex w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[rgba(8,96,108,0.06)]"
                              >
                                Edit Stage
                              </button>
                              {application.resumeFileData && application.resumeFileName ? (
                                <a
                                  href={application.resumeFileData}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex rounded-xl px-4 py-3 text-sm font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
                                >
                                  View Resume
                                </a>
                              ) : null}
                              {application.resumeFileData && application.resumeFileName ? (
                                <a
                                  href={application.resumeFileData}
                                  download={application.resumeFileName}
                                  className="flex rounded-xl px-4 py-3 text-sm font-semibold text-[var(--color-accent-strong)] transition hover:bg-[rgba(190,72,26,0.06)]"
                                >
                                  Download Resume
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {stageDraft ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Stage Update</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {stageDraft.application.candidateName}
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  Update the candidate stage, remarks, and effective date whenever the pipeline status changes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStageDraft(null)}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <input
                value={labelizeStage(stageDraft.stage)}
                readOnly
                className="w-full rounded-2xl border border-[var(--color-line)] bg-[rgba(8,96,108,0.04)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)]"
              />
              <input
                type="date"
                value={stageDraft.date}
                onChange={(event) =>
                  setStageDraft((current) =>
                    current ? { ...current, date: event.target.value } : current
                  )
                }
                className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
              />
            </div>

            <textarea
              value={stageDraft.note}
              onChange={(event) =>
                setStageDraft((current) =>
                  current ? { ...current, note: event.target.value } : current
                )
              }
              placeholder="Add stage remarks for shortlist, interview, offer, joining, or rejection."
              className="mt-4 min-h-[150px] w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
            />

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (!stageDraft.note.trim() || !stageDraft.date) {
                    setError("Please add both remarks and date before saving the stage update.");
                    return;
                  }

                  await handleStageChange(
                    stageDraft.application.id,
                    stageDraft.stage,
                    stageDraft.note.trim(),
                    stageDraft.date
                  );
                  setStageDraft(null);
                }}
                className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
              >
                Save Stage Update
              </button>
              <button
                type="button"
                onClick={() => setStageDraft(null)}
                className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
