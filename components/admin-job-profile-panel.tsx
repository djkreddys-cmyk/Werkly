"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  JobApplication,
  JobApplicationStage,
  JobApplicationsResponse,
  JobDetail,
} from "@/lib/jobs";
import { formatPersonName } from "@/lib/format";
import type { TimelineEventRecord } from "@/lib/workflow";
import { JobShareButton } from "@/components/job-share-button";

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

function createResumeObjectUrl(dataUrl: string, fallbackType = "application/octet-stream") {
  const normalizedDataUrl = dataUrl.startsWith("data:")
    ? dataUrl
    : `data:${fallbackType};base64,${dataUrl}`;
  const [header, content = ""] = normalizedDataUrl.split(",", 2);
  const mimeType = header.match(/^data:(.*?)(?:;base64)?$/)?.[1] || fallbackType;
  const binary = header.includes(";base64") ? window.atob(content) : decodeURIComponent(content);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return window.URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

function escapePreviewText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isLiveOnWebsite(job: JobDetail) {
  if (job.isHidden || job.status !== "open") {
    return false;
  }

  if (!job.lastDateToApply) {
    return true;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(job.lastDateToApply) >= today;
}

type CandidateSuggestion = {
  id: string;
  applicationId?: string;
  assignedJobIds?: string[];
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

type StageDraft = {
  application: JobApplication;
  stage: JobApplicationStage;
  note: string;
  date: string;
  finalCtc: string;
  dateOfJoining: string;
};

const applicationStages: JobApplicationStage[] = [
  "applied",
  "shortlisted",
  "interview",
  "offered",
  "joined",
  "screen-rejection",
  "rejected",
];

const fieldClassName =
  "w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]";

export function AdminJobProfilePanel({ jobId }: { jobId: string }) {
  const [token] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("werklyAdminToken") ?? "" : ""
  );
  const [job, setJob] = useState<JobDetail | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [timeline, setTimeline] = useState<TimelineEventRecord[]>([]);
  const [suggestions, setSuggestions] = useState<CandidateSuggestion[]>([]);
  const [totalProfilesReviewed, setTotalProfilesReviewed] = useState(0);
  const [matchingMode, setMatchingMode] = useState<"ai" | "rule-based">("rule-based");
  const [aiModel, setAiModel] = useState("");
  const [aiError, setAiError] = useState("");
  const [suggestionsError, setSuggestionsError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [profileSearch, setProfileSearch] = useState("");
  const [profileSourceFilter, setProfileSourceFilter] = useState("all");
  const [profileLevelFilter, setProfileLevelFilter] = useState("all");
  const [profileResumeFilter, setProfileResumeFilter] = useState("all");
  const [minimumScore, setMinimumScore] = useState(0);
  const [stageDraft, setStageDraft] = useState<StageDraft | null>(null);
  const [isUpdatingStageId, setIsUpdatingStageId] = useState("");
  const [isAssigningSuggestionId, setIsAssigningSuggestionId] = useState("");
  const [isLoadingResumeId, setIsLoadingResumeId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      fetch(`/api/admin/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/admin/jobs/${jobId}/applications?slim=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/admin/timeline?entityType=job&entityId=${jobId}&limit=40`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/admin/jobs/${jobId}/suggested-profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([jobResponse, applicationsResponse, timelineResponse, suggestionsResponse]) => {
        const jobResult = (await jobResponse.json()) as JobDetail & { message?: string };
        const applicationsResult = (await applicationsResponse.json()) as JobApplicationsResponse & {
          message?: string;
        };
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
        if (!applicationsResponse.ok) {
          throw new Error(applicationsResult.message || "Unable to load job applicants.");
        }
        if (!timelineResponse.ok) {
          throw new Error(timelineResult.message || "Unable to load job timeline.");
        }

        setJob(jobResult);
        setApplications(applicationsResult.applications ?? []);
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

  const suggestionSources = useMemo(
    () => Array.from(new Set(suggestions.map((profile) => profile.source))).sort(),
    [suggestions]
  );

  const filteredSuggestions = useMemo(() => {
    const query = profileSearch.trim().toLowerCase();

    return suggestions.filter((profile) => {
      const score = profile.aiMatchScore ?? profile.matchScore;
      const level = profile.aiMatchLevel ?? profile.matchLevel;
      const hasResume = Boolean(profile.resumeFileData && profile.resumeFileName);
      const searchableText = [
        profile.candidateName,
        profile.candidateEmail,
        profile.candidatePhone,
        profile.currentDesignation,
        profile.preferredRole,
        profile.currentCompany,
        profile.experience,
        profile.currentLocation,
        profile.preferredLocation,
        profile.preferredSector,
        profile.skills,
        profile.source,
        ...(profile.aiStrengths?.length ? profile.aiStrengths : profile.matchReasons),
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchableText.includes(query)) &&
        (profileSourceFilter === "all" || profile.source === profileSourceFilter) &&
        (profileLevelFilter === "all" || level === profileLevelFilter) &&
        (profileResumeFilter === "all" ||
          (profileResumeFilter === "with-resume" ? hasResume : !hasResume)) &&
        score >= minimumScore
      );
    });
  }, [
    minimumScore,
    profileLevelFilter,
    profileResumeFilter,
    profileSearch,
    profileSourceFilter,
    suggestions,
  ]);

  const resetProfileFilters = () => {
    setProfileSearch("");
    setProfileSourceFilter("all");
    setProfileLevelFilter("all");
    setProfileResumeFilter("all");
    setMinimumScore(0);
  };

  const shortlistedCount = useMemo(
    () => applications.filter((application) => application.stage === "shortlisted").length,
    [applications]
  );

  function openStageUpdate(
    application: JobApplication,
    stage = (application.stage ?? "applied") as JobApplicationStage
  ) {
    setError("");
    setMessage("");
    setStageDraft({
      application,
      stage,
      note: application.stageNote ?? "",
      date: application.stageDate ?? new Date().toISOString().slice(0, 10),
      finalCtc: application.finalCtc ?? application.currentCtc ?? "",
      dateOfJoining:
        application.dateOfJoining ?? application.stageDate ?? new Date().toISOString().slice(0, 10),
    });
  }

  async function updateApplicationStage() {
    if (!token || !stageDraft) {
      return;
    }

    if (!stageDraft.note.trim() || !stageDraft.date) {
      setError("Please add both remarks and date before saving the stage update.");
      return;
    }

    if (
      stageDraft.stage === "joined" &&
      (!stageDraft.finalCtc.trim() || !stageDraft.dateOfJoining)
    ) {
      setError("Please add final CTC and date of joining before marking the candidate as joined.");
      return;
    }

    setIsUpdatingStageId(stageDraft.application.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/jobs/applications/${stageDraft.application.id}/stage`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            stage: stageDraft.stage,
            stageNote: stageDraft.note.trim(),
            stageDate: stageDraft.date,
            ...(stageDraft.stage === "joined"
              ? {
                  finalCtc: stageDraft.finalCtc.trim(),
                  dateOfJoining: stageDraft.dateOfJoining,
                }
              : {}),
          }),
        }
      );
      const result = (await response.json()) as JobApplication & {
        approvalPending?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.message || "Unable to update application stage.");
      }

      if (result.approvalPending) {
        setMessage(result.message || "Stage override request submitted for approval.");
      } else {
        setApplications((current) =>
          current.map((application) =>
            application.id === stageDraft.application.id
              ? {
                  ...application,
                  stage: result.stage,
                  stageNote: result.stageNote,
                  stageDate: result.stageDate,
                  stageUpdatedAt: result.stageUpdatedAt,
                  finalCtc: result.finalCtc,
                  dateOfJoining: result.dateOfJoining,
                }
              : application
          )
        );
        setMessage(`${formatPersonName(stageDraft.application.candidateName)} moved to ${formatLabel(stageDraft.stage)}.`);
      }
      setStageDraft(null);
    } catch (stageError) {
      setError(
        stageError instanceof Error ? stageError.message : "Unable to update application stage."
      );
    } finally {
      setIsUpdatingStageId("");
    }
  }

  async function assignAndShortlistSuggestion(profile: CandidateSuggestion) {
    if (!token || !job) {
      setError("Please sign in again before assigning this candidate.");
      return;
    }

    if (!profile.candidateName || (!profile.candidateEmail && !profile.candidatePhone)) {
      setError("Candidate name and either email or phone are required before assignment.");
      return;
    }

    const suggestionKey = `${profile.source}:${profile.id}`;
    setIsAssigningSuggestionId(suggestionKey);
    setError("");
    setMessage("");

    const stageDate = new Date().toISOString().slice(0, 10);
    const stageNote = `Assigned and shortlisted from ${matchingMode === "ai" ? "AI" : "rule-based"} job matches.`;

    try {
      const response = profile.applicationId
        ? await fetch(`/api/admin/jobs/applications/${profile.applicationId}/assign-job`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              jobId: job.id,
              initialStage: "shortlisted",
              stageNote,
              stageDate,
            }),
          })
        : await fetch(`/api/admin/jobs/${job.id}/applications`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              candidateName: profile.candidateName,
              candidateEmail: profile.candidateEmail,
              candidatePhone: profile.candidatePhone,
              experience: profile.experience,
              currentCompany: profile.currentCompany,
              currentLocation: profile.currentLocation,
              currentDesignation: profile.currentDesignation,
              preferredRole: profile.preferredRole,
              preferredLocation: profile.preferredLocation,
              preferredSector: profile.preferredSector,
              sourceType: profile.source,
              sourceNote: `${matchingMode === "ai" ? "AI" : "Rule-based"} match score: ${profile.aiMatchScore ?? profile.matchScore}`,
              initialStage: "shortlisted",
              stageNote,
              stageDate,
              resumeFileName: profile.resumeFileName,
              resumeFileData: profile.resumeFileData,
              jobTitle: job.title,
            }),
          });

      const assigned = (await response.json()) as JobApplication & { message?: string };
      if (!response.ok) {
        throw new Error(assigned.message || "Unable to assign and shortlist this candidate.");
      }

      setApplications((current) =>
        current.some((application) => application.id === assigned.id)
          ? current
          : [assigned, ...current]
      );
      setSuggestions((current) =>
        current.filter(
          (suggestion) =>
            !(
              suggestion.id === profile.id &&
              suggestion.source === profile.source
            )
        )
      );
      setJob((current) =>
        current
          ? { ...current, applicationsCount: (current.applicationsCount ?? 0) + 1 }
          : current
      );
      setMessage(
        `${formatPersonName(assigned.candidateName || profile.candidateName)} assigned and shortlisted for ${job.title}.`
      );
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "Unable to assign and shortlist this candidate."
      );
    } finally {
      setIsAssigningSuggestionId("");
    }
  }

  async function viewApplicantResume(application: JobApplication) {
    if (!token) {
      setError("Please sign in again before viewing the resume.");
      return;
    }

    const previewWindow = window.open("", "_blank");
    previewWindow?.document.write(
      '<!doctype html><title>Loading resume</title><body style="font-family:Arial,sans-serif;padding:24px">Loading resume...</body>'
    );
    setIsLoadingResumeId(application.id);
    setError("");

    try {
      const response = await fetch(`/api/admin/applications/${application.id}/resume`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = (await response.json()) as {
        resumeFileName?: string;
        resumeFileType?: string;
        resumeFileData?: string;
        message?: string;
      };

      if (!response.ok || !result.resumeFileData) {
        throw new Error(result.message || "Unable to load resume.");
      }

      const resumeUrl = createResumeObjectUrl(
        result.resumeFileData,
        result.resumeFileType || "application/pdf"
      );
      const fileName = escapePreviewText(result.resumeFileName || "Candidate resume");
      const previewMarkup = `<!doctype html>
        <html>
          <head>
            <title>${fileName}</title>
            <style>
              html, body { margin: 0; min-height: 100%; font-family: Arial, sans-serif; color: #082f37; background: #f8fbfc; }
              .bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 18px; border-bottom: 1px solid #d8e7eb; background: #fff; }
              .title { margin: 0; font-size: 15px; font-weight: 700; }
              .button { border: 1px solid #cfe0e4; padding: 9px 13px; color: #082f37; text-decoration: none; font-size: 13px; font-weight: 700; }
              iframe { display: block; width: 100%; height: calc(100vh - 58px); border: 0; background: #fff; }
            </style>
          </head>
          <body>
            <div class="bar">
              <p class="title">${fileName}</p>
              <a class="button" href="${resumeUrl}" download="${fileName}">Download Resume</a>
            </div>
            <iframe src="${resumeUrl}" title="${fileName}"></iframe>
          </body>
        </html>`;

      if (previewWindow) {
        previewWindow.document.open();
        previewWindow.document.write(previewMarkup);
        previewWindow.document.close();
      } else {
        window.open(resumeUrl, "_blank", "noopener,noreferrer");
      }
    } catch (resumeError) {
      previewWindow?.close();
      setError(resumeError instanceof Error ? resumeError.message : "Unable to load resume.");
    } finally {
      setIsLoadingResumeId("");
    }
  }

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
      {message ? (
        <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      <section className="accent-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 xl:flex-nowrap">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Job Detail</p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">{job.title}</h2>
            <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
              Review recruiter ownership, client mapping, status, and the complete job activity
              timeline on a full CRM page instead of only a quick modal.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-3">
            {job.slug && isLiveOnWebsite(job) ? (
              <JobShareButton
                title={job.title}
                slug={job.slug}
                jobCode={job.jobCode}
                sector={job.sector}
                location={job.location}
                experience={job.experience}
                employmentType={job.employmentType}
                positionsCount={job.positionsCount}
                lastDateToApply={job.lastDateToApply}
                salary={job.salary}
                packagePerAnnum={job.packagePerAnnum}
              />
            ) : null}
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Job ID", job.jobCode || "Pending"],
          ["Client", job.clientName || "Not assigned"],
          ["Recruiter", job.recruiterName || "Unassigned"],
          ["Positions", String(job.positionsCount ?? 1)],
          ["Applications", String(job.applicationsCount)],
        ].map(([label, value]) => (
          label === "Applications" ? (
            <a key={label} href="#job-applicants" className="accent-card p-5 transition hover:border-[var(--color-dark)]">
              <p className="eyebrow">{label}</p>
              <p className="mt-3 text-xl font-semibold text-[var(--color-accent-strong)]">{value}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--color-muted)]">Open applicants</p>
            </a>
          ) : (
            <article key={label} className="accent-card p-5">
              <p className="eyebrow">{label}</p>
              <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">{value}</p>
            </article>
          )
        ))}
      </section>

      <section id="job-applicants" className="accent-card scroll-mt-24 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Job Applicants</p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
              Applicant status and resume
            </h3>
            <p className="muted-copy mt-2 max-w-3xl text-sm leading-6">
              Update each applicant&apos;s pipeline stage from the job profile and open the stored resume from the same row.
            </p>
          </div>
          <div className="flex gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
            <span className="bg-[rgba(8,96,108,0.08)] px-3 py-2 text-[var(--color-dark)]">
              {applications.length} applicants
            </span>
            <span className="bg-[rgba(251,133,0,0.08)] px-3 py-2 text-[var(--color-accent-strong)]">
              {shortlistedCount} shortlisted
            </span>
          </div>
        </div>

        {applications.length === 0 ? (
          <p className="muted-copy mt-6 border border-[var(--color-line)] bg-white px-4 py-5 text-sm">
            No applicants are available for this job yet.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto border border-[var(--color-line)] bg-white">
            <table className="w-full min-w-[1040px] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[20%]" />
                <col className="w-[13%]" />
                <col className="w-[14%]" />
                <col className="w-[25%]" />
                <col className="w-[13%]" />
              </colgroup>
              <thead className="bg-[rgba(8,96,108,0.06)]">
                <tr>
                  {[
                    "Candidate",
                    "Contact",
                    "Applied",
                    "Status",
                    "Remarks",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id} className="border-t border-[var(--color-line)] align-top">
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/candidates/${application.id}`}
                        className="font-semibold text-[var(--color-ink)] hover:text-[var(--color-accent-strong)]"
                      >
                        {formatPersonName(application.candidateName)}
                      </Link>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {application.experience || "Experience not added"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      <p className="break-all">{application.candidateEmail || "Email not added"}</p>
                      <p className="mt-1">{application.candidatePhone || "Phone not added"}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {formatDateTimeLabel(application.appliedAt)}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={application.stage ?? "applied"}
                        disabled={isUpdatingStageId === application.id}
                        onChange={(event) =>
                          openStageUpdate(application, event.target.value as JobApplicationStage)
                        }
                        className="border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                      >
                        {applicationStages.map((stage) => (
                          <option key={stage} value={stage}>
                            {formatLabel(stage)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="max-w-xs px-4 py-4 text-sm text-[var(--color-muted)]">
                      <p>{application.stageNote || "No remarks added"}</p>
                      {application.stageDate ? (
                        <p className="mt-1 text-xs font-medium text-[var(--color-accent-strong)]">
                          {formatDateLabel(application.stageDate)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void viewApplicantResume(application)}
                          disabled={
                            isLoadingResumeId === application.id ||
                            !(application.resumeAvailable || application.resumeFileData)
                          }
                          className="bg-[var(--color-dark)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {isLoadingResumeId === application.id
                            ? "Loading..."
                            : application.resumeAvailable || application.resumeFileData
                              ? "View Resume"
                              : "No Resume"}
                        </button>
                        <Link
                          href={`/admin/candidates/${application.id}`}
                          className="border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                        >
                          View Profile
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                Matching note: {aiError}
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
          <div className="mt-6 space-y-4">
            <div className="rounded-[1.25rem] border border-[var(--color-line)] bg-white p-4">
              <div className="grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.7fr_auto]">
                <input
                  value={profileSearch}
                  onChange={(event) => setProfileSearch(event.target.value)}
                  placeholder="Search name, role, location, source, skill"
                  className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
                />
                <select
                  value={profileSourceFilter}
                  onChange={(event) => setProfileSourceFilter(event.target.value)}
                  className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
                >
                  <option value="all">All sources</option>
                  {suggestionSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
                <select
                  value={profileLevelFilter}
                  onChange={(event) => setProfileLevelFilter(event.target.value)}
                  className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
                >
                  <option value="all">All levels</option>
                  <option value="Strong">Strong</option>
                  <option value="Good">Good</option>
                  <option value="Possible">Possible</option>
                </select>
                <select
                  value={profileResumeFilter}
                  onChange={(event) => setProfileResumeFilter(event.target.value)}
                  className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
                >
                  <option value="all">All resumes</option>
                  <option value="with-resume">Resume available</option>
                  <option value="without-resume">No resume</option>
                </select>
                <select
                  value={minimumScore}
                  onChange={(event) => setMinimumScore(Number(event.target.value))}
                  className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
                >
                  <option value={0}>Any score</option>
                  <option value={35}>35+</option>
                  <option value={45}>45+</option>
                  <option value={55}>55+</option>
                  <option value={75}>75+</option>
                </select>
                <button
                  type="button"
                  onClick={resetProfileFilters}
                  className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                >
                  Clear
                </button>
              </div>
              <p className="muted-copy mt-3 text-xs">
                Showing {filteredSuggestions.length} of {suggestions.length} suggested profiles.
              </p>
            </div>

            <div className="overflow-x-auto rounded-[1.25rem] border border-[var(--color-line)] bg-white">
              <table className="w-full min-w-[1520px] table-fixed border-collapse text-left text-sm">
                <colgroup>
                  <col className="w-[5%]" />
                  <col className="w-[10%]" />
                  <col className="w-[18%]" />
                  <col className="w-[15%]" />
                  <col className="w-[9%]" />
                  <col className="w-[7%]" />
                  <col className="w-[8%]" />
                  <col className="w-[12%]" />
                  <col className="w-[7%]" />
                  <col className="w-[9%]" />
                </colgroup>
                <thead className="bg-[rgba(8,96,108,0.06)]">
                  <tr>
                    {[
                      "Score",
                      "Candidate",
                      "Role",
                      "Contact",
                      "Location",
                      "Experience",
                      "Source",
                      "Match Reasons",
                      "Resume",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSuggestions.length ? (
                    filteredSuggestions.map((profile) => {
                      const reasons = profile.aiStrengths?.length
                        ? profile.aiStrengths
                        : profile.matchReasons;
                      const score = profile.aiMatchScore ?? profile.matchScore;
                      const level = profile.aiMatchLevel ?? profile.matchLevel;

                      return (
                        <tr
                          key={`${profile.source}-${profile.id}`}
                          className="border-t border-[var(--color-line)] align-top"
                        >
                          <td className="px-4 py-4">
                            <p className="text-2xl font-semibold text-[var(--color-dark)]">{score}</p>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-strong)]">
                              {level}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-[var(--color-ink)]">
                              {formatPersonName(profile.candidateName)}
                            </p>
                            <p
                              className="mt-1 line-clamp-3 text-xs leading-5 text-[var(--color-muted)]"
                              title={profile.currentCompany || "Company not added"}
                            >
                              {profile.currentCompany || "Company not added"}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p
                              className="line-clamp-4 font-medium leading-5 text-[var(--color-ink)]"
                              title={
                                profile.preferredRole ||
                                profile.currentDesignation ||
                                "Role preference not added"
                              }
                            >
                              {profile.preferredRole ||
                                profile.currentDesignation ||
                                "Role preference not added"}
                            </p>
                            {profile.preferredSector ? (
                              <p className="mt-1 text-xs text-[var(--color-muted)]">
                                {profile.preferredSector}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4">
                            <p className="break-all font-medium text-[var(--color-ink)]">
                              {profile.candidateEmail || "Email not added"}
                            </p>
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                              {profile.candidatePhone || "Phone not added"}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p
                              className="line-clamp-3 leading-5"
                              title={profile.preferredLocation || profile.currentLocation || "Not added"}
                            >
                              {profile.preferredLocation || profile.currentLocation || "Not added"}
                            </p>
                          </td>
                          <td className="px-4 py-4">{profile.experience || "Not added"}</td>
                          <td className="px-4 py-4 break-words">{profile.source}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col items-start gap-1.5">
                              {reasons.length ? (
                                reasons.slice(0, 3).map((reason) => (
                                  <span
                                    key={reason}
                                    className="line-clamp-2 max-w-full rounded-full bg-[rgba(251,133,0,0.08)] px-2.5 py-1 text-xs font-semibold leading-4 text-[var(--color-accent-strong)]"
                                    title={reason}
                                  >
                                    {reason}
                                  </span>
                                ))
                              ) : (
                                <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--color-dark)]">
                                  Partial CRM match
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {profile.resumeFileData && profile.resumeFileName ? (
                              <div className="flex w-full flex-col gap-2">
                                <a
                                  href={profile.resumeFileData}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full rounded-xl border border-[var(--color-line)] px-3 py-2 text-center text-xs font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                                >
                                  View
                                </a>
                                <a
                                  href={profile.resumeFileData}
                                  download={profile.resumeFileName}
                                  className="w-full rounded-xl bg-[var(--color-dark)] px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
                                >
                                  Download
                                </a>
                              </div>
                            ) : (
                              <span className="text-xs text-[var(--color-muted)]">No resume</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => void assignAndShortlistSuggestion(profile)}
                              disabled={
                                isAssigningSuggestionId === `${profile.source}:${profile.id}` ||
                                (!profile.candidateEmail && !profile.candidatePhone)
                              }
                              className="w-full whitespace-nowrap bg-[var(--color-dark)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              {isAssigningSuggestionId === `${profile.source}:${profile.id}`
                                ? "Assigning..."
                                : "Assign & Shortlist"}
                            </button>
                            {!profile.candidateEmail && !profile.candidatePhone ? (
                              <p className="mt-2 max-w-[150px] text-xs text-red-700">
                                Add contact details first
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-6 text-sm text-[var(--color-muted)]">
                        No profiles match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
              ["No. of Positions", String(job.positionsCount ?? 1)],
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

      {stageDraft ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-xl border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Applicant Status</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {formatPersonName(stageDraft.application.candidateName)}
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  Confirm the new status, effective date, and remarks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStageDraft(null)}
                className="border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Applicant Status
                </span>
                <select
                  value={stageDraft.stage}
                  onChange={(event) =>
                    setStageDraft((current) =>
                      current
                        ? { ...current, stage: event.target.value as JobApplicationStage }
                        : current
                    )
                  }
                  className={fieldClassName}
                >
                  {applicationStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {formatLabel(stage)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Effective Date
                </span>
                <input
                  type="date"
                  value={stageDraft.date}
                  onChange={(event) =>
                    setStageDraft((current) =>
                      current ? { ...current, date: event.target.value } : current
                    )
                  }
                  className={fieldClassName}
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Remarks
              </span>
              <textarea
                value={stageDraft.note}
                onChange={(event) =>
                  setStageDraft((current) =>
                    current ? { ...current, note: event.target.value } : current
                  )
                }
                placeholder="Add status remarks for reporting and follow-up."
                className={`${fieldClassName} min-h-[130px] resize-y`}
              />
            </label>

            {stageDraft.stage === "joined" ? (
              <div className="mt-4 grid gap-4 border border-[var(--color-line)] bg-[rgba(8,96,108,0.03)] p-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Final CTC
                  </span>
                  <input
                    value={stageDraft.finalCtc}
                    onChange={(event) =>
                      setStageDraft((current) =>
                        current ? { ...current, finalCtc: event.target.value } : current
                      )
                    }
                    className={fieldClassName}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Date of Joining
                  </span>
                  <input
                    type="date"
                    value={stageDraft.dateOfJoining}
                    onChange={(event) =>
                      setStageDraft((current) =>
                        current
                          ? {
                              ...current,
                              dateOfJoining: event.target.value,
                              date: event.target.value,
                            }
                          : current
                      )
                    }
                    className={fieldClassName}
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void updateApplicationStage()}
                disabled={isUpdatingStageId === stageDraft.application.id}
                className="bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isUpdatingStageId === stageDraft.application.id ? "Saving..." : "Save Status"}
              </button>
              <button
                type="button"
                onClick={() => setStageDraft(null)}
                className="border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
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
