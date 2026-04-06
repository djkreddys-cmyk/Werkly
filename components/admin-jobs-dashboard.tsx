"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientRecord } from "@/lib/crm";
import type { JobApplication, JobSummary, JobStatus } from "@/lib/jobs";

type JobEditorState = {
  id?: string;
  jobCode?: string;
  clientId: string;
  title: string;
  location: string;
  sector: string;
  experience: string;
  employmentType: string;
  salary: string;
  packagePerAnnum: string;
  status: JobStatus;
  isHidden: boolean;
  lastDateToApply: string;
  responsibilities: string;
  requirements: string;
};

const emptyForm: JobEditorState = {
  clientId: "",
  title: "",
  location: "",
  sector: "",
  experience: "",
  employmentType: "Full Time",
  salary: "",
  packagePerAnnum: "",
  status: "draft",
  isHidden: false,
  lastDateToApply: "",
  responsibilities: "",
  requirements: "",
};

const fieldClassName =
  "w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]";

export function AdminJobsDashboard() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [token, setToken] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState<JobEditorState>(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [applicationsJob, setApplicationsJob] = useState<JobSummary | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isApplicationsLoading, setIsApplicationsLoading] = useState(false);

  const isEditing = Boolean(form.id);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("werklyAdminToken") ?? "";
    const savedEmail = window.localStorage.getItem("werklyAdminEmail") ?? "";
    setToken(savedToken);
    setAdminEmail(savedEmail);
  }, []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    Promise.all([
      fetch("/api/admin/jobs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetch("/api/admin/clients", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ])
      .then(async ([jobsResponse, clientsResponse]) => {
        const jobsResult = (await jobsResponse.json()) as {
          jobs?: JobSummary[];
          message?: string;
        };
        if (!jobsResponse.ok) {
          throw new Error(jobsResult.message || "Unable to load jobs.");
        }

        const clientsResult = (await clientsResponse.json()) as {
          clients?: ClientRecord[];
          message?: string;
        };
        if (!clientsResponse.ok) {
          throw new Error(clientsResult.message || "Unable to load clients.");
        }

        setJobs(jobsResult.jobs ?? []);
        setClients(clientsResult.clients ?? []);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load jobs.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) =>
        new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      ),
    [jobs]
  );

  function updateForm(field: keyof JobEditorState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function renderJobFields() {
    return (
      <>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <input
            className={`${fieldClassName} bg-slate-50 text-slate-500`}
            placeholder="Job ID"
            value={form.jobCode ?? "Auto generated when published"}
            disabled
          />
          <select
            className={fieldClassName}
            value={form.clientId}
            onChange={(event) => updateForm("clientId", event.target.value)}
            required
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.companyName}
              </option>
            ))}
          </select>
          <input
            className={fieldClassName}
            placeholder="Job title"
            value={form.title}
            onChange={(event) => updateForm("title", event.target.value)}
            required
          />
          <input
            className={fieldClassName}
            placeholder="Location"
            value={form.location}
            onChange={(event) => updateForm("location", event.target.value)}
            required
          />
          <input
            className={fieldClassName}
            placeholder="Sector"
            value={form.sector}
            onChange={(event) => updateForm("sector", event.target.value)}
            required
          />
          <input
            className={fieldClassName}
            placeholder="Experience"
            value={form.experience}
            onChange={(event) => updateForm("experience", event.target.value)}
            required
          />
          <input
            className={fieldClassName}
            placeholder="Employment type"
            value={form.employmentType}
            onChange={(event) => updateForm("employmentType", event.target.value)}
            required
          />
          <input
            className={fieldClassName}
            placeholder="Salary"
            value={form.salary}
            onChange={(event) => updateForm("salary", event.target.value)}
          />
          <input
            className={fieldClassName}
            placeholder="Package per annum"
            value={form.packagePerAnnum}
            onChange={(event) => updateForm("packagePerAnnum", event.target.value)}
          />
          <select
            className={fieldClassName}
            value={form.status}
            onChange={(event) => updateForm("status", event.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <input
            className={fieldClassName}
            type="date"
            value={form.lastDateToApply}
            onChange={(event) => updateForm("lastDateToApply", event.target.value)}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <textarea
            className={`${fieldClassName} min-h-[160px] resize-y`}
            placeholder="Job Description (one per line)"
            value={form.responsibilities}
            onChange={(event) => updateForm("responsibilities", event.target.value)}
          />
          <textarea
            className={`${fieldClassName} min-h-[160px] resize-y`}
            placeholder="Key Skills (one per line)"
            value={form.requirements}
            onChange={(event) => updateForm("requirements", event.target.value)}
          />
        </div>
      </>
    );
  }

  function populateForEdit(job: JobSummary) {
    setForm({
      id: job.id,
      jobCode: job.jobCode,
      clientId: job.clientId ?? "",
      title: job.title,
      location: job.location,
      sector: job.sector,
      experience: job.experience,
      employmentType: job.employmentType,
      salary: job.salary ?? "",
      packagePerAnnum: job.packagePerAnnum ?? "",
      status: job.status,
      isHidden: Boolean(job.isHidden),
      lastDateToApply: job.lastDateToApply ?? "",
      responsibilities: (job.responsibilities ?? []).join("\n"),
      requirements: (job.requirements ?? []).join("\n"),
    });
    setMessage("");
    setError("");
  }

  async function refreshJobs() {
    const [jobsResponse, clientsResponse] = await Promise.all([
      fetch("/api/admin/jobs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetch("/api/admin/clients", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);
    const jobsResult = (await jobsResponse.json()) as { jobs?: JobSummary[]; message?: string };
    if (!jobsResponse.ok) {
      throw new Error(jobsResult.message || "Unable to refresh jobs.");
    }
    const clientsResult = (await clientsResponse.json()) as {
      clients?: ClientRecord[];
      message?: string;
    };
    if (!clientsResponse.ok) {
      throw new Error(clientsResult.message || "Unable to refresh clients.");
    }
    setJobs(jobsResult.jobs ?? []);
    setClients(clientsResult.clients ?? []);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        form.id ? `/api/admin/jobs/${form.id}` : "/api/admin/jobs",
        {
          method: form.id ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to save job.");
      }

      await refreshJobs();
      setForm(emptyForm);
      setMessage(form.id ? "Job updated successfully." : "Job created successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save job.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleVisibilityToggle(job: JobSummary) {
    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/jobs/${job.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId: job.clientId ?? "",
          title: job.title,
          location: job.location,
          sector: job.sector,
          experience: job.experience,
          employmentType: job.employmentType,
          salary: job.salary ?? "",
          packagePerAnnum: job.packagePerAnnum ?? "",
          status: job.status,
          isHidden: !job.isHidden,
          postedAt: job.postedAt,
          lastDateToApply: job.lastDateToApply ?? "",
          responsibilities: (job.responsibilities ?? []).join("\n"),
          requirements: (job.requirements ?? []).join("\n"),
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to update job visibility.");
      }

      await refreshJobs();
      setMessage(job.isHidden ? "Job is visible again." : "Job has been hidden from the jobs page.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Unable to update job visibility."
      );
    }
  }

  async function openApplications(job: JobSummary) {
    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    setApplicationsJob(job);
    setApplications([]);
    setIsApplicationsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/jobs/${job.id}/applications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json()) as {
        applications?: JobApplication[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.message || "Unable to load applied candidates.");
      }

      setApplications(result.applications ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load applied candidates."
      );
    } finally {
      setIsApplicationsLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function escapeCsv(value: string | undefined) {
    const normalized = value ?? "";
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  function downloadApplicationsCsv() {
    if (!applicationsJob || applications.length === 0) {
      return;
    }

    const rows = [
      [
        "Candidate Name",
        "Mail ID",
        "Phone",
        "Experience",
        "Current Company",
        "Current Location",
        "Current Designation",
        "Preferred Role",
        "Current CTC",
        "Expected CTC",
        "Preferred Location",
        "Preferred Sector",
        "Job Applied For",
        "Applied Date",
        "Notes",
      ],
      ...applications.map((application) => [
        application.candidateName,
        application.candidateEmail,
        application.candidatePhone,
        application.experience,
        application.currentCompany,
        application.currentLocation,
        application.currentDesignation,
        application.preferredRole,
        application.currentCtc,
        application.expectedCtc,
        application.preferredLocation,
        application.preferredSector,
        application.jobTitle,
        new Date(application.appliedAt).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
        application.candidateMessage,
      ]),
    ];

    const csv = rows
      .map((row) => row.map((value) => escapeCsv(value)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${applicationsJob.jobCode || applicationsJob.slug}-applications.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} className="accent-card p-7" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">New Job</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
              Post a new opening.
            </h2>
          </div>
        </div>

        {!isEditing ? renderJobFields() : null}

        {message ? <p className="mt-4 text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Publish Job"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
          >
            Reset
          </button>
        </div>
      </form>

      <section className="accent-card p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Existing Jobs</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
              Review published roles and drafts.
            </h2>
            <p className="muted-copy mt-4 text-base leading-7">
              Signed in as {adminEmail || "Railway admin"}. Use edit to load a role into the form above.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading jobs...</p>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {sortedJobs.map((job) => (
              <article
                key={job.id}
                className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.16em] text-slate-400">
                      {job.sector}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                      {job.title}
                    </h3>
                    {job.clientName ? (
                      <p className="mt-2 text-sm font-medium text-[var(--color-muted)]">
                        Client: {job.clientName}
                      </p>
                    ) : null}
                    {job.jobCode ? (
                      <p className="mt-2 text-sm font-semibold text-[var(--color-accent-strong)]">
                        Job ID: {job.jobCode}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
                    {job.isHidden ? "hidden" : job.status}
                  </span>
                </div>
                <p className="muted-copy mt-3 text-sm leading-6">
                  {job.location} | {job.experience}
                </p>
                <button
                  type="button"
                  onClick={() => openApplications(job)}
                  className="mt-2 text-left text-sm font-semibold text-[var(--color-accent-strong)] transition hover:text-[var(--color-dark)]"
                >
                  Applied people: {job.applicationsCount}
                </button>
                {job.lastDateToApply ? (
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    Last date to apply: {new Date(job.lastDateToApply).toLocaleDateString("en-IN")}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => populateForEdit(job)}
                    className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVisibilityToggle(job)}
                    className="rounded-xl border border-[rgba(190,72,26,0.2)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-strong)] transition hover:bg-[rgba(190,72,26,0.06)]"
                  >
                    {job.isHidden ? "Unhide" : "Hide"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isEditing ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-4xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-7 shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Edit Job</p>
                <h3 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
                  Update the complete job details.
                </h3>
                <p className="muted-copy mt-3 text-base leading-7">
                  Edit role information, Job Description, Key Skills, and application deadline in one place.
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <form className="mt-2" onSubmit={handleSubmit}>
              {renderJobFields()}

              {message ? <p className="mt-4 text-sm font-medium text-emerald-700">{message}</p> : null}
              {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Saving..." : "Update Job"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {applicationsJob ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Applied Candidates</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {applicationsJob.title}
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  Job ID {applicationsJob.jobCode || "Pending"} | {applicationsJob.applicationsCount} applications
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApplicationsJob(null)}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <div className="mt-6">
              {isApplicationsLoading ? (
                <p className="muted-copy text-sm">Loading applied candidates...</p>
              ) : applications.length === 0 ? (
                <p className="muted-copy text-sm">No candidate details captured for this job yet.</p>
              ) : (
                <div>
                  <div className="mb-4 flex justify-end">
                    <button
                      type="button"
                      onClick={downloadApplicationsCsv}
                      className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                    >
                      Download Excel
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-[var(--color-line)]">
                  <table className="w-full border-collapse bg-[rgba(255,252,247,0.7)]">
                    <thead>
                      <tr className="bg-[rgba(8,96,108,0.06)] text-left">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          Candidate Name
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          Mail ID
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          Applied Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((application, index) => (
                        <tr
                          key={application.id}
                          className={
                            index === applications.length - 1
                              ? "align-top"
                              : "align-top border-b border-[var(--color-line)]"
                          }
                        >
                          <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                            {application.candidateName}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <a
                              href={`mailto:${application.candidateEmail}`}
                              className="font-medium text-[var(--color-accent-strong)]"
                            >
                              {application.candidateEmail}
                            </a>
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
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
