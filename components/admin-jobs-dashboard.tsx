"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JobSummary, JobStatus } from "@/lib/jobs";

type JobEditorState = {
  id?: string;
  jobCode?: string;
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
  const [form, setForm] = useState<JobEditorState>(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

    fetch("/api/admin/jobs", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        const result = (await response.json()) as { jobs?: JobSummary[]; message?: string };
        if (!response.ok) {
          throw new Error(result.message || "Unable to load jobs.");
        }
        setJobs(result.jobs ?? []);
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

  function populateForEdit(job: JobSummary) {
    setForm({
      id: job.id,
      jobCode: job.jobCode,
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
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function refreshJobs() {
    const response = await fetch("/api/admin/jobs", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const result = (await response.json()) as { jobs?: JobSummary[]; message?: string };
    if (!response.ok) {
      throw new Error(result.message || "Unable to refresh jobs.");
    }
    setJobs(result.jobs ?? []);
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

  function resetForm() {
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} className="accent-card p-7" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{isEditing ? "Edit Job" : "New Job"}</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
              {isEditing ? "Update the opening." : "Post a new opening."}
            </h2>
          </div>
          {isEditing ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
            >
              Cancel
            </button>
          ) : null}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <input
            className={`${fieldClassName} bg-slate-50 text-slate-500`}
            placeholder="Job ID"
            value={form.jobCode ?? "Auto generated when published"}
            disabled
          />
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

        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        {message ? <p className="mt-4 text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving
              ? "Saving..."
              : isEditing
                ? "Update Job"
                : "Publish Job"}
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
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  Applied people: {job.applicationsCount}
                </p>
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
    </div>
  );
}
