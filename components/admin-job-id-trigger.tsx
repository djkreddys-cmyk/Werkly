"use client";

import Link from "next/link";
import { useState } from "react";
import type { JobDetail } from "@/lib/jobs";

export function AdminJobIdTrigger({
  jobId,
  jobCode,
  fallbackLabel = "Pending ID",
}: {
  jobId?: string;
  jobCode?: string;
  fallbackLabel?: string;
}) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function openJobDetails() {
    if (!jobId) {
      return;
    }

    const token =
      typeof window === "undefined"
        ? ""
        : window.localStorage.getItem("werklyAdminToken") ?? "";

    if (!token) {
      setError("Admin token is missing.");
      setIsOpen(true);
      return;
    }

    setIsOpen(true);
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json()) as JobDetail & { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to load job details.");
      }

      setJob(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load job details.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!jobId) {
    return <span>{jobCode || fallbackLabel}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openJobDetails()}
        className="font-semibold text-[var(--color-accent-strong)] transition hover:text-[var(--color-dark)]"
      >
        {jobCode || fallbackLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-slate-950/55 p-3 sm:p-4">
          <div className="my-3 flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.8rem] border border-[var(--color-line)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] sm:my-4 sm:max-h-[calc(100vh-2rem)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4 sm:px-6">
              <div>
                <p className="eyebrow">Job Details</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {job?.title || "Loading job details"}
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  {job?.jobCode || jobCode || fallbackLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {isLoading ? (
                <p className="muted-copy text-sm">Loading job details...</p>
              ) : error ? (
                <p className="text-sm font-medium text-red-700">{error}</p>
              ) : job ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Client
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {job.clientName || "Not assigned"}
                  </p>
                </div>
                  <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Recruiter
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {job.recruiterName || "Unassigned"}
                  </p>
                </div>
                  <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Location
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {job.location}
                  </p>
                </div>
                  <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Experience
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {job.experience}
                  </p>
                </div>
                  <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Employment Type
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {job.employmentType}
                  </p>
                </div>
                  <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {job.isHidden ? "Hidden" : job.status}
                  </p>
                </div>
                  <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Description
                  </p>
                  <p className="mt-2 max-h-[38vh] overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-7 text-[var(--color-ink)]">
                    {job.description || job.summary || "No description added."}
                  </p>
                </div>
                  <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Responsibilities
                  </p>
                  <p className="mt-2 max-h-[38vh] overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-7 text-[var(--color-ink)]">
                    {(job.responsibilities ?? []).length
                      ? job.responsibilities?.join(", ")
                      : "Not added"}
                  </p>
                </div>
                  <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Key Skills
                  </p>
                  <p className="mt-2 max-h-[38vh] overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-7 text-[var(--color-ink)]">
                    {(job.requirements ?? []).length ? job.requirements?.join(", ") : "Not added"}
                  </p>
                </div>
              </div>
              ) : null}
            </div>

            {jobId ? (
              <div className="flex shrink-0 flex-wrap gap-3 border-t border-[var(--color-line)] px-5 py-4 sm:px-6">
                <Link
                  href={`/admin/jobs/${jobId}`}
                  onClick={() => setIsOpen(false)}
                  className="rounded-2xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
                >
                  Open Full Page
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
