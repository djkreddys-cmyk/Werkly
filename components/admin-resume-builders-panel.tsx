"use client";

import { useEffect, useMemo, useState } from "react";
import type { ResumeBuilderSubmission } from "@/lib/jobs";
import { formatPersonName } from "@/lib/format";

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
  const [previewSubmission, setPreviewSubmission] = useState<ResumeBuilderSubmission | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    fetch("/api/admin/resume-builders?slim=1", {
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
        item.gender,
        item.motherTongue,
        item.otherLanguages,
        item.targetRole,
        item.location,
        item.skills,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [query, submissions]);

  function decodeStoredResume(dataUrl?: string) {
    if (!dataUrl) {
      return "";
    }

    const [, payload = ""] = dataUrl.split(",");
    if (!payload) {
      return "";
    }

    try {
      const binary = window.atob(payload);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch {
      return "";
    }
  }

  function downloadStoredResume(item: ResumeBuilderSubmission) {
    if (!item.resumeFileData || !item.resumeFileName) {
      return;
    }

    const link = document.createElement("a");
    link.href = item.resumeFileData;
    link.download = item.resumeFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function printStoredResume(item: ResumeBuilderSubmission) {
    const markup = decodeStoredResume(item.resumeFileData);
    if (!markup) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=960,height=1200");
    if (!printWindow) {
      return;
    }

    printWindow.document.write(markup);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function loadStoredResume(item: ResumeBuilderSubmission) {
    if (item.resumeFileData && item.resumeFileName) {
      return item;
    }

    const response = await fetch(`/api/admin/resume-builders/${item.id}/resume`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = (await response.json()) as {
      resumeFileData?: string;
      resumeFileName?: string;
      resumeFileType?: string;
      message?: string;
    };

    if (!response.ok || !result.resumeFileData || !result.resumeFileName) {
      throw new Error(result.message || "Unable to load stored resume.");
    }

    const hydrated = {
      ...item,
      resumeFileData: result.resumeFileData,
      resumeFileName: result.resumeFileName,
      resumeFileType: result.resumeFileType,
      resumeAvailable: true,
    };
    setSubmissions((current) =>
      current.map((submission) => (submission.id === item.id ? hydrated : submission))
    );
    return hydrated;
  }

  async function openStoredResume(item: ResumeBuilderSubmission) {
    try {
      setPreviewSubmission(await loadStoredResume(item));
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : "Unable to load stored resume.");
    }
  }

  async function downloadStoredResumeOnDemand(item: ResumeBuilderSubmission) {
    try {
      downloadStoredResume(await loadStoredResume(item));
    } catch (resumeError) {
      setError(
        resumeError instanceof Error ? resumeError.message : "Unable to download stored resume."
      );
    }
  }

  const previewMarkup = previewSubmission ? decodeStoredResume(previewSubmission.resumeFileData) : "";

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
            {submissions.filter((item) => item.resumeAvailable || item.resumeFileData).length}
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
                          {formatPersonName(item.candidateName)}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {item.yearsExperience || "Experience not added"}
                        </p>
                        {[item.gender, item.motherTongue, item.otherLanguages].filter(Boolean).length > 0 ? (
                          <p className="mt-1 text-xs text-[var(--color-muted)]">
                            {[item.gender, item.motherTongue, item.otherLanguages].filter(Boolean).join(" | ")}
                          </p>
                        ) : null}
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
                        {(item.resumeAvailable || item.resumeFileData) && item.resumeFileName ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void openStoredResume(item)}
                              className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                            >
                              View Format
                            </button>
                            <button
                              type="button"
                              onClick={() => void downloadStoredResumeOnDemand(item)}
                              className="rounded-xl bg-[var(--color-dark)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
                            >
                              Download
                            </button>
                          </div>
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

      {previewSubmission ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.8rem] border border-[var(--color-line)] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.25)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
              <div>
                <p className="eyebrow">Stored Resume Format</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                  {formatPersonName(previewSubmission.candidateName)}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => printStoredResume(previewSubmission)}
                  disabled={!previewMarkup}
                  className="rounded-2xl bg-[var(--color-dark)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => void downloadStoredResumeOnDemand(previewSubmission)}
                  className="rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSubmission(null)}
                  className="rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                >
                  Close
                </button>
              </div>
            </div>
            {previewMarkup ? (
              <iframe
                title={`${previewSubmission.candidateName} resume preview`}
                srcDoc={previewMarkup}
                className="h-[76vh] w-full bg-white"
              />
            ) : (
              <div className="p-6">
                <p className="text-sm font-medium text-red-700">
                  This stored resume could not be opened for preview.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
