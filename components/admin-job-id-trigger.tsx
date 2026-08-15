"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { JobDetail } from "@/lib/jobs";

function getPreviewItems(items?: string[]) {
  const normalizedItems = (items ?? [])
    .flatMap((item) => item.split(/(?:\r?\n)+|,\s*\*|\s+•\s+/))
    .map((item) => item.replace(/^[-*•,;\s]+/, "").trim())
    .filter(Boolean)
    .map((item) => (item.length > 180 ? `${item.slice(0, 177).trim()}...` : item));

  return Array.from(new Set(normalizedItems)).slice(0, 5);
}

function JobPreviewList({ items }: { items?: string[] }) {
  const previewItems = getPreviewItems(items);

  if (!previewItems.length) {
    return <p className="mt-2 text-sm text-[var(--color-muted)]">Not added</p>;
  }

  return (
    <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-ink)]">
      {previewItems.map((item) => (
        <li key={item} className="flex gap-2">
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 bg-[var(--color-accent-strong)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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
        <div
          className="fixed inset-0 z-[150] flex items-start justify-center overflow-hidden bg-slate-950/55 p-3 sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Job details"
            className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden border border-[var(--color-line)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] sm:max-h-[92vh]"
          >
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {isLoading ? (
                <p className="muted-copy text-sm">Loading job details...</p>
              ) : error ? (
                <p className="text-sm font-medium text-red-700">{error}</p>
              ) : job ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Client
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {job.clientName || "Not assigned"}
                  </p>
                </div>
                  <div className="border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Recruiter
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {job.recruiterName || "Unassigned"}
                  </p>
                </div>
                  <div className="border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Location
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {job.location}
                  </p>
                </div>
                  <div className="border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Experience
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {job.experience}
                  </p>
                </div>
                  <div className="border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Employment Type
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {job.employmentType}
                  </p>
                </div>
                  <div className="border border-[var(--color-line)] bg-[rgba(248,250,252,0.8)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {job.isHidden ? "Hidden" : job.status}
                  </p>
                </div>
                  <div className="border border-[var(--color-line)] bg-white p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Description
                  </p>
                  <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm leading-7 text-[var(--color-ink)]">
                    {job.description || job.summary || "No description added."}
                  </p>
                </div>
                  <div className="border border-[var(--color-line)] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Responsibilities
                  </p>
                  <JobPreviewList items={job.responsibilities} />
                </div>
                  <div className="border border-[var(--color-line)] bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Key Skills
                  </p>
                  <JobPreviewList items={job.requirements} />
                </div>
                  <p className="text-xs text-[var(--color-muted)] sm:col-span-2">
                    Quick preview shows the first five items. Open the full page for complete job information.
                  </p>
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
