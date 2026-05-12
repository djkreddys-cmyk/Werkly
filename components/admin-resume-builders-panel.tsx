"use client";

import { useEffect, useMemo, useState } from "react";
import type { ResumeBuilderSubmission } from "@/lib/jobs";

function formatDateTime(value?: string) {
  if (!value) {
    return "Not captured";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminResumeBuildersPanel() {
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [submissions, setSubmissions] = useState<ResumeBuilderSubmission[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    fetch("/api/admin/resume-builders", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          submissions?: ResumeBuilderSubmission[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(result.message || "Unable to load resume builder candidates.");
        }

        setSubmissions(result.submissions ?? []);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load resume builder candidates."
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const filteredSubmissions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return submissions;
    }

    return submissions.filter((item) =>
      [
        item.candidateName,
        item.candidateEmail,
        item.candidatePhone,
        item.targetRole,
        item.location,
        item.skills,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [query, submissions]);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="accent-card p-5">
          <p className="eyebrow">Total Built</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
            {submissions.length}
          </p>
        </article>
        <article className="accent-card p-5">
          <p className="eyebrow">With Resume Copy</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
            {submissions.filter((item) => item.resumeFileData).length}
          </p>
        </article>
        <article className="accent-card p-5">
          <p className="eyebrow">Filtered</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
            {filteredSubmissions.length}
          </p>
        </article>
      </section>

      <section className="accent-card p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="eyebrow">Resume Builders</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
              Candidates who generated a resume on the website.
            </h2>
            <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
              Each generated resume is saved here with the final downloadable copy.
            </p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, role, phone"
            className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)] xl:max-w-md"
          />
        </div>

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading resume builder candidates...</p>
        ) : filteredSubmissions.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">No resume builder candidates are available yet.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {["Candidate", "Contact", "Role", "Location", "Skills", "Created", "Resume"].map(
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
                  {filteredSubmissions.map((item, index) => (
                    <tr
                      key={item.id}
                      className={
                        index === filteredSubmissions.length - 1
                          ? "align-top"
                          : "align-top border-b border-[var(--color-line)]"
                      }
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[var(--color-ink)]">
                          {item.candidateName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {item.yearsExperience || "Experience not added"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <p>{item.candidateEmail}</p>
                        {item.candidatePhone ? <p className="mt-1">{item.candidatePhone}</p> : null}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {item.targetRole || "Role not added"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {item.location || "Location not added"}
                      </td>
                      <td className="max-w-xs px-4 py-4 text-sm text-[var(--color-muted)]">
                        {item.skills || "Skills not added"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {item.resumeFileData && item.resumeFileName ? (
                          <a
                            href={item.resumeFileData}
                            download={item.resumeFileName}
                            className="font-semibold text-[var(--color-accent-strong)] transition hover:text-[var(--color-dark)]"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-[var(--color-muted)]">No file</span>
                        )}
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
