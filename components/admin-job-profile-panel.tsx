"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { JobDetail } from "@/lib/jobs";
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

type CandidateSuggestion = {
  id: string;
  source: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  currentDesignation?: string;
  preferredRole?: string;
  currentCompany?: string;
  experience?: string;
  currentLocation?: string;
  preferredLocation?: string;
  preferredSector?: string;
  skills?: string;
  resumeFileName?: string;
  resumeFileData?: string;
  lastActivityAt?: string;
  matchScore: number;
  matchLevel: "Strong" | "Good" | "Possible";
  matchReasons: string[];
  aiMatchScore?: number;
  aiMatchLevel?: "Strong" | "Good" | "Possible";
  aiSummary?: string;
  aiStrengths?: string[];
  aiConcerns?: string[];
};

export function AdminJobProfilePanel({ jobId }: { jobId: string }) {
  const [token] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("werklyAdminToken") ?? "" : ""
  );
  const [job, setJob] = useState<JobDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEventRecord[]>([]);
  const [suggestions, setSuggestions] = useState<CandidateSuggestion[]>([]);
  const [totalProfilesReviewed, setTotalProfilesReviewed] = useState(0);
  const [matchingMode, setMatchingMode] = useState<"ai" | "rule-based">("rule-based");
  const [aiModel, setAiModel] = useState("");
  const [aiError, setAiError] = useState("");
  const [suggestionsError, setSuggestionsError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      fetch(`/api/admin/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/admin/timeline?entityType=job&entityId=${jobId}&limit=40`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/admin/jobs/${jobId}/suggested-profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([jobResponse, timelineResponse, suggestionsResponse]) => {
        const jobResult = (await jobResponse.json()) as JobDetail & { message?: string };
        const timelineResult = (await timelineResponse.json()) as {
          timeline?: TimelineEventRecord[];
          message?: string;
        };
        const suggestionsResult = (await suggestionsResponse.json()) as {
          suggestions?: CandidateSuggestion[];
          totalProfilesReviewed?: number;
          matchingMode?: "ai" | "rule-based";
          aiModel?: string;
          aiError?: string;
          message?: string;
        };

        if (!jobResponse.ok) {
          throw new Error(jobResult.message || "Unable to load job.");
        }
        if (!timelineResponse.ok) {
          throw new Error(timelineResult.message || "Unable to load job timeline.");
        }

        setJob(jobResult);
        setTimeline(timelineResult.timeline ?? []);
        if (suggestionsResponse.ok) {
          setSuggestions(suggestionsResult.suggestions ?? []);
          setTotalProfilesReviewed(suggestionsResult.totalProfilesReviewed ?? 0);
          setMatchingMode(suggestionsResult.matchingMode ?? "rule-based");
          setAiModel(suggestionsResult.aiModel ?? "");
          setAiError(suggestionsResult.aiError ?? "");
          setSuggestionsError("");
        } else {
          setSuggestions([]);
          setTotalProfilesReviewed(0);
          setMatchingMode("rule-based");
          setAiModel("");
          setAiError("");
          setSuggestionsError(
            suggestionsResult.message || "Unable to load suggested CRM profiles."
          );
        }
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load job details.");
      })
      .finally(() => setIsLoading(false));
  }, [jobId, token]);

  if (!token) {
    return (
      <section className="accent-card p-8">
        <p className="eyebrow">Session Required</p>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
          Sign in to view the job profile.
        </h2>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="accent-card p-8">
        <p className="muted-copy text-sm">Loading job profile...</p>
      </section>
    );
  }

  if (error && !job) {
    return (
      <section className="accent-card p-8">
        <p className="text-sm font-medium text-red-700">{error}</p>
      </section>
    );
  }

  if (!job) {
    return (
      <section className="accent-card p-8">
        <p className="muted-copy text-sm">Job not found.</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="accent-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Job Detail</p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">{job.title}</h2>
            <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
              Review recruiter ownership, client mapping, status, and the complete job activity
              timeline on a full CRM page instead of only a quick modal.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/jobs/existing"
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
            >
              Back to Jobs
            </Link>
            <Link
              href="/admin/reports/jobs"
              className="rounded-2xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
            >
              Open Job Reports
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Job ID", job.jobCode || "Pending"],
          ["Client", job.clientName || "Not assigned"],
          ["Recruiter", job.recruiterName || "Unassigned"],
          ["Applications", String(job.applicationsCount)],
        ].map(([label, value]) => (
          <article key={label} className="accent-card p-5">
            <p className="eyebrow">{label}</p>
            <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">{value}</p>
          </article>
        ))}
      </section>

      <section className="accent-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Suggested CRM Profiles</p>
            <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
              {matchingMode === "ai" ? "AI-ranked candidate matches" : "Rule-based candidate matches"}
            </h3>
            <p className="muted-copy mt-3 max-w-3xl text-sm leading-6">
              {matchingMode === "ai"
                ? `AI Matching is ranking pre-filtered CRM profiles${aiModel ? ` with ${aiModel}` : ""}.`
                : "Ranked from job applicants on other jobs, candidate enquiries, and resume-builder submissions using role, skills, sector, location, experience, resume availability, and recent CRM activity."}
            </p>
            {aiError ? (
              <p className="mt-2 max-w-3xl text-xs font-medium text-[var(--color-accent-strong)]">
                AI Matching fallback active: rule-based ranking is shown. {aiError}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
              {totalProfilesReviewed} reviewed
            </span>
            <span className="rounded-full bg-[rgba(251,133,0,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-strong)]">
              {matchingMode === "ai" ? "AI Matching" : "Rule Matching"}
            </span>
          </div>
        </div>

        {suggestionsError ? (
          <div className="mt-6 rounded-[1.25rem] border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-medium text-red-700">{suggestionsError}</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="mt-6 rounded-[1.25rem] border border-[var(--color-line)] bg-white p-5">
            <p className="muted-copy text-sm">
              No suggested CRM profiles yet. Add candidate preferences, resumes, or resume-builder
              submissions to improve matching.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {suggestions.map((profile) => (
              <article
                key={`${profile.source}-${profile.id}`}
                className="rounded-[1.25rem] border border-[var(--color-line)] bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-ink)]">
                      {profile.candidateName}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {profile.preferredRole ||
                        profile.currentDesignation ||
                        "Role preference not added"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-[var(--color-dark)]">
                      {profile.aiMatchScore ?? profile.matchScore}
                    </p>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-strong)]">
                      {profile.aiMatchLevel ?? profile.matchLevel}
                    </p>
                    {profile.aiMatchScore !== undefined ? (
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        Rule {profile.matchScore}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Contact", profile.candidateEmail || profile.candidatePhone || "Not added"],
                    ["Location", profile.preferredLocation || profile.currentLocation || "Not added"],
                    ["Experience", profile.experience || "Not added"],
                    ["Source", profile.source],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">{value}</p>
                    </div>
                  ))}
                </div>

                {profile.aiSummary ? (
                  <div className="mt-4 rounded-[1rem] border border-[var(--color-line)] bg-[rgba(8,96,108,0.04)] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-dark)]">
                      AI Recruiter Note
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                      {profile.aiSummary}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {(profile.aiStrengths?.length ? profile.aiStrengths : profile.matchReasons).length ? (
                    (profile.aiStrengths?.length ? profile.aiStrengths : profile.matchReasons).map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full bg-[rgba(251,133,0,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-accent-strong)]"
                      >
                        {reason}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-dark)]">
                      Partial CRM match
                    </span>
                  )}
                </div>

                {profile.aiConcerns?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.aiConcerns.map((concern) => (
                      <span
                        key={concern}
                        className="rounded-full bg-[rgba(128,128,128,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-muted)]"
                      >
                        {concern}
                      </span>
                    ))}
                  </div>
                ) : null}

                {profile.resumeFileData && profile.resumeFileName ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href={profile.resumeFileData}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                    >
                      View Resume
                    </a>
                    <a
                      href={profile.resumeFileData}
                      download={profile.resumeFileName}
                      className="rounded-2xl bg-[var(--color-dark)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
                    >
                      Download Resume
                    </a>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.98fr_1.02fr]">
        <article className="accent-card p-6">
          <p className="eyebrow">Job Snapshot</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Location", job.location],
              ["Sector", job.sector],
              ["Experience", job.experience],
              ["Employment Type", job.employmentType],
              ["Salary", job.salary || job.packagePerAnnum || "Not added"],
              ["Status", job.isHidden ? "Hidden" : formatLabel(job.status)],
              ["Posted On", formatDateLabel(job.postedAt)],
              ["Last Date", formatDateLabel(job.lastDateToApply)],
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

          <div className="mt-5 rounded-[1.2rem] border border-[var(--color-line)] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Description
            </p>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
              {job.description || job.summary || "No description added."}
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.2rem] border border-[var(--color-line)] bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Responsibilities
              </p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-muted)]">
                {(job.responsibilities ?? []).length ? (
                  job.responsibilities.map((item) => <p key={item}>{item}</p>)
                ) : (
                  <p>Not added</p>
                )}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-[var(--color-line)] bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Key Skills
              </p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-muted)]">
                {(job.requirements ?? []).length ? (
                  job.requirements.map((item) => <p key={item}>{item}</p>)
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
              <p className="muted-copy text-sm">No workflow events are recorded for this job yet.</p>
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
