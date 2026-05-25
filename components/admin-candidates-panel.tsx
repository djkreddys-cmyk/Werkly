"use client";

import { useEffect, useMemo, useState } from "react";
import { useCrmAccessControl } from "@/hooks/use-crm-access-control";
import {
  type JobApplication,
  type JobApplicationAssignmentPayload,
  type JobApplicationStage,
} from "@/lib/jobs";
import type { ClientRecord, EmployeeRecord } from "@/lib/crm";
import type { JobSummary } from "@/lib/jobs";
import type { SavedViewRecord } from "@/lib/workflow";
import { formatPersonName } from "@/lib/format";
import { AdminJobIdTrigger } from "@/components/admin-job-id-trigger";
import { AdminCandidateEditModal } from "@/components/admin-candidate-edit-modal";
import { TableActionMenu } from "@/components/table-action-menu";

const stageOptions: JobApplicationStage[] = [
  "applied",
  "shortlisted",
  "interview",
  "offered",
  "joined",
  "screen-rejection",
  "rejected",
];

function sortJobsByOpenAndClosingDate(jobs: JobSummary[]) {
  const distantFuture = new Date("9999-12-31").getTime();

  return [...jobs].sort((first, second) => {
    const firstOpenRank = first.status === "open" ? 0 : 1;
    const secondOpenRank = second.status === "open" ? 0 : 1;

    if (firstOpenRank !== secondOpenRank) {
      return firstOpenRank - secondOpenRank;
    }

    const firstClosingTime = first.lastDateToApply
      ? new Date(first.lastDateToApply).getTime()
      : distantFuture;
    const secondClosingTime = second.lastDateToApply
      ? new Date(second.lastDateToApply).getTime()
      : distantFuture;

    if (firstClosingTime !== secondClosingTime) {
      return firstClosingTime - secondClosingTime;
    }

    return String(second.jobCode || "").localeCompare(String(first.jobCode || ""));
  });
}

function labelizeStage(stage: JobApplicationStage) {
  return stage
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function normalizeSearchText(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function includesSearch(value: unknown, search: string) {
  return !search || normalizeSearchText(String(value ?? "")).includes(search);
}

function extractFirstNumber(value?: string) {
  const match = String(value || "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function tokenize(value?: string) {
  return normalizeSearchText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function findTokenMatches(source: string, tokens: string[]) {
  const normalizedSource = normalizeSearchText(source);
  return tokens.filter((token) => normalizedSource.includes(token));
}

function scoreCandidateForJob(application: JobApplication, job: JobSummary) {
  let score = 0;
  const reasons: string[] = [];
  const concerns: string[] = [];
  const candidateRoleText = [
    application.currentDesignation,
    application.preferredRole,
    application.jobTitle,
    application.candidateMessage,
  ].join(" ");
  const candidateLocationText = [
    application.currentLocation,
    application.preferredLocation,
    application.jobLocation,
  ].join(" ");
  const candidateSkillText = [
    application.currentDesignation,
    application.preferredRole,
    application.preferredSector,
    application.candidateMessage,
    application.sourceNote,
  ].join(" ");
  const jobRoleTokens = tokenize(job.title);
  const jobSkillTokens = [
    ...tokenize(job.sector),
    ...job.skills.flatMap((skill) => tokenize(skill)),
    ...(job.requirements ?? []).flatMap((requirement) => tokenize(requirement)),
  ];
  const roleMatches = findTokenMatches(candidateRoleText, jobRoleTokens);
  const skillMatches = findTokenMatches(candidateSkillText, Array.from(new Set(jobSkillTokens)));
  const locationMatches = findTokenMatches(candidateLocationText, tokenize(job.location));
  const candidateExperience = extractFirstNumber(application.experience);
  const jobExperience = extractFirstNumber(job.experience);
  const expectedCtc = extractFirstNumber(application.expectedCtc);
  const jobSalary = extractFirstNumber(job.packagePerAnnum || job.salary);

  if (roleMatches.length) {
    score += Math.min(32, 18 + roleMatches.length * 7);
    reasons.push("Role match");
  }
  if (skillMatches.length) {
    score += Math.min(26, 10 + skillMatches.length * 4);
    reasons.push(`${skillMatches.length} skill match${skillMatches.length === 1 ? "" : "es"}`);
  }
  if (locationMatches.length) {
    score += 18;
    reasons.push("Location match");
  } else if (job.location && candidateLocationText.trim()) {
    concerns.push("Location mismatch");
  }
  if (candidateExperience && jobExperience) {
    if (candidateExperience >= Math.max(0, jobExperience - 1)) {
      score += 16;
      reasons.push("Experience fit");
    } else {
      concerns.push("Experience lower than job");
    }
  }
  if (application.resumeFileData) {
    score += 5;
    reasons.push("Resume available");
  }
  if (expectedCtc && jobSalary) {
    if (expectedCtc <= jobSalary * 1.15) {
      score += 8;
      reasons.push("Salary fit");
    } else {
      concerns.push("Salary mismatch");
    }
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    level: score >= 75 ? "Strong" : score >= 55 ? "Good" : "Possible",
    reasons: Array.from(new Set([...reasons, ...concerns])).slice(0, 5),
  };
}

export function AdminCandidatesPanel() {
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [authType] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthType") ?? "admin"
      : "admin"
  );
  const [authEmail] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminEmail") ?? ""
      : ""
  );
  const [authEmployeeCode] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyEmployeeCode") ?? ""
      : ""
  );
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [universalTotals, setUniversalTotals] = useState({
    profiles: 0,
    mergedDuplicates: 0,
  });
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("");
  const [noticeFilter, setNoticeFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [recruiterFilter, setRecruiterFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [savedCandidateViews, setSavedCandidateViews] = useState<SavedViewRecord[]>([]);
  const [selectedSavedViewId, setSelectedSavedViewId] = useState("");
  const [matchJobId, setMatchJobId] = useState("");
  const [minimumMatchScore, setMinimumMatchScore] = useState(35);
  const [page, setPage] = useState(1);
  const [actionMenuApplicationId, setActionMenuApplicationId] = useState("");
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);
  const [stageDraft, setStageDraft] = useState<{
    application: JobApplication;
    stage: JobApplicationStage;
    note: string;
    date: string;
    interviewScheduledAt: string;
    interviewMode: string;
    interviewPanel: string;
    interviewReminderAt: string;
    finalCtc: string;
    dateOfJoining: string;
  } | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<{
    application: JobApplication;
    assignmentType: "ownership-transfer" | "follow-up-support";
    assignedEmployeeId: string;
    effectiveFromDate: string;
    effectiveToDate: string;
    note: string;
  } | null>(null);
  const [jobAssignmentDraft, setJobAssignmentDraft] = useState<{
    application: JobApplication;
    jobId: string;
    stage: JobApplicationStage;
  } | null>(null);
  const [isAssigningJob, setIsAssigningJob] = useState(false);
  const [timelineDraft, setTimelineDraft] = useState<{
    application: JobApplication;
    logs: Array<{
      id: number;
      actionType: string;
      actorName?: string;
      actorRole?: string;
      createdAt: string;
      afterData?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }>;
    isLoading: boolean;
  } | null>(null);
  const [authRole] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthRole") ?? "super-admin"
      : "super-admin"
  );
  const { roleAccess } = useCrmAccessControl(
    token,
    authType,
    authRole,
    authEmployeeCode,
    authEmail
  );
  const [viewMessage, setViewMessage] = useState("");
  const isSuperAdmin = authType === "admin" || authRole === "super-admin";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (timelineDraft) {
        setTimelineDraft(null);
        return;
      }

      if (editingApplication) {
        setEditingApplication(null);
        return;
      }

      if (assignmentDraft) {
        setAssignmentDraft(null);
        return;
      }

      if (jobAssignmentDraft) {
        setJobAssignmentDraft(null);
        return;
      }

      if (stageDraft) {
        setStageDraft(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [assignmentDraft, editingApplication, jobAssignmentDraft, stageDraft, timelineDraft]);

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      fetch("/api/admin/applications?slim=1", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/employees", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/clients", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/candidate-profiles?summary=1", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([
        applicationsResponse,
        employeesResponse,
        jobsResponse,
        clientsResponse,
        profilesResponse,
      ]) => {
        const applicationsResult = (await applicationsResponse.json()) as {
          applications?: JobApplication[];
          message?: string;
        };
        const employeesResult = (await employeesResponse.json()) as {
          employees?: EmployeeRecord[];
          message?: string;
        };
        const jobsResult = (await jobsResponse.json()) as {
          jobs?: JobSummary[];
          message?: string;
        };
        const clientsResult = (await clientsResponse.json()) as {
          clients?: ClientRecord[];
          message?: string;
        };
        const profilesResult = (await profilesResponse.json()) as {
          totals?: {
            profiles?: number;
            mergedDuplicates?: number;
          };
          message?: string;
        };

        if (!applicationsResponse.ok) {
          throw new Error(applicationsResult.message || "Unable to load candidates.");
        }
        if (!employeesResponse.ok) {
          throw new Error(employeesResult.message || "Unable to load employees.");
        }
        if (!jobsResponse.ok) {
          throw new Error(jobsResult.message || "Unable to load jobs.");
        }
        if (!clientsResponse.ok) {
          throw new Error(clientsResult.message || "Unable to load clients.");
        }
        if (!profilesResponse.ok) {
          throw new Error(profilesResult.message || "Unable to load universal candidate profiles.");
        }

        setApplications(applicationsResult.applications ?? []);
        setEmployees(employeesResult.employees ?? []);
        setJobs(jobsResult.jobs ?? []);
        setClients(clientsResult.clients ?? []);
        setUniversalTotals({
          profiles: profilesResult.totals?.profiles ?? 0,
          mergedDuplicates: profilesResult.totals?.mergedDuplicates ?? 0,
        });
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load candidates."
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    fetch("/api/admin/saved-views?moduleKey=candidates&scope=all", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const result = (await response.json()) as { views?: SavedViewRecord[] };
        if (response.ok) {
          setSavedCandidateViews(result.views ?? []);
        }
      })
      .catch(() => {
        setSavedCandidateViews([]);
      });
  }, [token, viewMessage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedQuery = window.localStorage.getItem("werklyCandidatesQuery");
    const savedStage = window.localStorage.getItem("werklyCandidatesStage");
    const savedAdvancedFilters = window.localStorage.getItem("werklyCandidatesAdvancedFilters");
    if (savedQuery) {
      setQuery(savedQuery);
    }
    if (savedStage) {
      setStageFilter(savedStage);
    }
    if (savedAdvancedFilters) {
      try {
        const filters = JSON.parse(savedAdvancedFilters) as Record<string, string>;
        setSkillFilter(filters.skillFilter ?? "");
        setLocationFilter(filters.locationFilter ?? "");
        setExperienceFilter(filters.experienceFilter ?? "");
        setSalaryFilter(filters.salaryFilter ?? "");
        setNoticeFilter(filters.noticeFilter ?? "");
        setLanguageFilter(filters.languageFilter ?? "");
        setGenderFilter(filters.genderFilter ?? "all");
        setRecruiterFilter(filters.recruiterFilter ?? "all");
        setClientFilter(filters.clientFilter ?? "all");
        setJobFilter(filters.jobFilter ?? "all");
        setMatchJobId(filters.matchJobId ?? "");
      } catch {
        window.localStorage.removeItem("werklyCandidatesAdvancedFilters");
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("werklyCandidatesQuery", query);
    window.localStorage.setItem("werklyCandidatesStage", stageFilter);
    window.localStorage.setItem(
      "werklyCandidatesAdvancedFilters",
      JSON.stringify({
        skillFilter,
        locationFilter,
        experienceFilter,
        salaryFilter,
        noticeFilter,
        languageFilter,
        genderFilter,
        recruiterFilter,
        clientFilter,
        jobFilter,
        matchJobId,
      })
    );
  }, [
    clientFilter,
    experienceFilter,
    genderFilter,
    jobFilter,
    languageFilter,
    locationFilter,
    matchJobId,
    noticeFilter,
    query,
    recruiterFilter,
    salaryFilter,
    skillFilter,
    stageFilter,
  ]);

  const isEmployeeSession = authType === "employee" || Boolean(authEmployeeCode);
  const currentEmployeeId = useMemo(
    () =>
      employees.find(
        (employee) => employee.employeeCode === authEmployeeCode || employee.email === authEmail
      )?.id ?? "",
    [authEmail, authEmployeeCode, employees]
  );
  const visibleClients = useMemo(() => {
    if (!isEmployeeSession) {
      return clients;
    }

    return clients.filter(
      (client) =>
        client.assignedEmployeeId === currentEmployeeId ||
        client.followUpEmployeeId === currentEmployeeId
    );
  }, [clients, currentEmployeeId, isEmployeeSession]);
  const visibleClientIds = useMemo(
    () => new Set(visibleClients.map((client) => client.id)),
    [visibleClients]
  );
  const visibleJobs = useMemo(() => {
    if (!isEmployeeSession) {
      return jobs;
    }

    return jobs.filter(
      (job) =>
        job.recruiterId === currentEmployeeId ||
        job.recruiterEmail === authEmail ||
        (job.clientId ? visibleClientIds.has(job.clientId) : false)
    );
  }, [authEmail, currentEmployeeId, isEmployeeSession, jobs, visibleClientIds]);
  const assignableJobs = useMemo(() => sortJobsByOpenAndClosingDate(visibleJobs), [visibleJobs]);
  const visibleJobIds = useMemo(
    () => new Set(visibleJobs.map((job) => job.id)),
    [visibleJobs]
  );
  const visibleApplications = useMemo(() => {
    if (!isEmployeeSession) {
      return applications;
    }

    return applications.filter(
      (application) =>
        application.assignedEmployeeId === currentEmployeeId ||
        application.followUpEmployeeId === currentEmployeeId ||
        application.recruiterEmail === authEmail ||
        visibleJobIds.has(application.jobId) ||
        visibleClients.some((client) => client.companyName === application.clientName)
    );
  }, [
    applications,
    authEmail,
    currentEmployeeId,
    isEmployeeSession,
    visibleClients,
    visibleJobIds,
  ]);

  const filteredApplications = useMemo(() => {
    const skillSearch = normalizeSearchText(skillFilter);
    const locationSearch = normalizeSearchText(locationFilter);
    const experienceSearch = normalizeSearchText(experienceFilter);
    const salarySearch = normalizeSearchText(salaryFilter);
    const noticeSearch = normalizeSearchText(noticeFilter);
    const languageSearch = normalizeSearchText(languageFilter);

    return visibleApplications.filter((application) => {
      const matchesQuery =
        !query ||
        [
          application.candidateName,
          application.candidateEmail,
          application.candidatePhone,
          application.gender,
          application.motherTongue,
          application.otherLanguages,
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

      const matchesSkill = includesSearch(
        [
          application.currentDesignation,
          application.preferredRole,
          application.preferredSector,
          application.candidateMessage,
          application.sourceNote,
          application.jobTitle,
          application.sector,
        ].join(" "),
        skillSearch
      );
      const matchesLocation = includesSearch(
        [application.currentLocation, application.preferredLocation, application.jobLocation].join(" "),
        locationSearch
      );
      const matchesExperience = includesSearch(application.experience, experienceSearch);
      const matchesSalary = includesSearch(
        [application.currentCtc, application.expectedCtc, application.finalCtc].join(" "),
        salarySearch
      );
      const matchesNotice = includesSearch(
        [application.sourceNote, application.candidateMessage, application.stageNote].join(" "),
        noticeSearch
      );
      const matchesLanguage = includesSearch(
        [application.motherTongue, application.otherLanguages].join(" "),
        languageSearch
      );
      const matchesGender =
        genderFilter === "all" ||
        normalizeSearchText(application.gender) === normalizeSearchText(genderFilter);
      const linkedJob = visibleJobs.find((job) => job.id === application.jobId);
      const matchesRecruiter =
        recruiterFilter === "all" ||
        application.assignedEmployeeId === recruiterFilter ||
        application.recruiterEmail === recruiterFilter ||
        application.recruiterName === recruiterFilter ||
        linkedJob?.recruiterId === recruiterFilter ||
        linkedJob?.recruiterEmail === recruiterFilter ||
        linkedJob?.recruiterName === recruiterFilter;
      const matchesClient =
        clientFilter === "all" ||
        application.clientId === clientFilter ||
        application.clientName === clients.find((client) => client.id === clientFilter)?.companyName;
      const matchesJob = jobFilter === "all" || application.jobId === jobFilter;

      return (
        matchesQuery &&
        matchesStage &&
        matchesSkill &&
        matchesLocation &&
        matchesExperience &&
        matchesSalary &&
        matchesNotice &&
        matchesLanguage &&
        matchesGender &&
        matchesRecruiter &&
        matchesClient &&
        matchesJob
      );
    });
  }, [
    clientFilter,
    clients,
    experienceFilter,
    genderFilter,
    jobFilter,
    languageFilter,
    locationFilter,
    noticeFilter,
    query,
    recruiterFilter,
    salaryFilter,
    skillFilter,
    stageFilter,
    visibleApplications,
    visibleJobs,
  ]);

  const stageCounts = useMemo(() => {
    return stageOptions.reduce<Record<JobApplicationStage, number>>((acc, stage) => {
      acc[stage] = visibleApplications.filter(
        (application) => (application.stage ?? "applied") === stage
      ).length;
      return acc;
    }, {} as Record<JobApplicationStage, number>);
  }, [visibleApplications]);

  useEffect(() => {
    setPage(1);
  }, [query, stageFilter, visibleApplications.length]);

  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filteredApplications.length / pageSize));
  const paginatedApplications = useMemo(
    () => filteredApplications.slice((page - 1) * pageSize, page * pageSize),
    [filteredApplications, page]
  );
  const selectedMatchJob = useMemo(
    () => visibleJobs.find((job) => job.id === matchJobId) ?? visibleJobs[0],
    [matchJobId, visibleJobs]
  );
  const matchedCandidates = useMemo(() => {
    if (!selectedMatchJob) {
      return [];
    }

    return visibleApplications
      .map((application) => ({
        application,
        match: scoreCandidateForJob(application, selectedMatchJob),
      }))
      .filter(({ match }) => match.score >= minimumMatchScore)
      .sort((first, second) => second.match.score - first.match.score)
      .slice(0, 25);
  }, [minimumMatchScore, selectedMatchJob, visibleApplications]);

  async function handleStageChange(
    id: string,
    stage: JobApplicationStage,
    stageNote: string,
    stageDate: string,
    interviewSchedule?: {
      interviewScheduledAt?: string;
      interviewMode?: string;
      interviewPanel?: string;
      interviewReminderAt?: string;
      finalCtc?: string;
      dateOfJoining?: string;
    }
  ) {
    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/admin/jobs/applications/${id}/stage`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stage, stageNote, stageDate, ...interviewSchedule }),
      });

      const updated = (await response.json()) as JobApplication & { message?: string };
      if (!response.ok) {
        throw new Error(updated.message || "Unable to update candidate stage.");
      }

      if ("approvalPending" in updated && (updated as { approvalPending?: boolean }).approvalPending) {
        setError(updated.message || "Stage override request submitted for approval.");
        return;
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
                interviewScheduledAt: updated.interviewScheduledAt,
                interviewMode: updated.interviewMode,
                interviewPanel: updated.interviewPanel,
                interviewReminderAt: updated.interviewReminderAt,
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
      // No row-level loading indicator needed here because updates happen via modal.
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
      interviewScheduledAt: application.interviewScheduledAt
        ? application.interviewScheduledAt.slice(0, 16)
        : "",
      interviewMode: application.interviewMode ?? "",
      interviewPanel: application.interviewPanel ?? "",
      interviewReminderAt: application.interviewReminderAt
        ? application.interviewReminderAt.slice(0, 16)
        : "",
      finalCtc: application.finalCtc ?? application.currentCtc ?? "",
      dateOfJoining:
        application.dateOfJoining ?? application.stageDate ?? new Date().toISOString().slice(0, 10),
    });
    setError("");
  }

  function openAssignmentEditor(application: JobApplication) {
    setActionMenuApplicationId("");
    setAssignmentDraft({
      application,
      assignmentType: "ownership-transfer",
      assignedEmployeeId: application.assignedEmployeeId || "",
      effectiveFromDate: application.followUpFromDate || new Date().toISOString().slice(0, 10),
      effectiveToDate: application.followUpToDate || "",
      note: application.followUpAssignmentNote || "",
    });
    setError("");
  }

  function openJobAssignmentEditor(application: JobApplication) {
    setActionMenuApplicationId("");
    setJobAssignmentDraft({
      application,
      jobId: "",
      stage: "shortlisted",
    });
    setError("");
    setViewMessage("");
  }

  async function handleJobAssignmentSave() {
    if (!token || !jobAssignmentDraft) {
      return;
    }

    if (!jobAssignmentDraft.jobId) {
      setError("Please select a target job.");
      return;
    }

    setIsAssigningJob(true);
    setError("");
    setViewMessage("");

    try {
      const response = await fetch(
        `/api/admin/jobs/applications/${jobAssignmentDraft.application.id}/assign-job`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            jobId: jobAssignmentDraft.jobId,
            initialStage: jobAssignmentDraft.stage,
            stageDate: new Date().toISOString().slice(0, 10),
            stageNote: `Assigned from ${jobAssignmentDraft.application.jobCode || jobAssignmentDraft.application.jobTitle || "candidate profile"}.`,
          }),
        }
      );
      const assigned = (await response.json()) as JobApplication & { message?: string };

      if (!response.ok) {
        throw new Error(assigned.message || "Unable to assign candidate to job.");
      }

      setApplications((current) =>
        current.some((application) => application.id === assigned.id)
          ? current.map((application) => (application.id === assigned.id ? assigned : application))
          : [assigned, ...current]
      );
      setJobAssignmentDraft(null);
      setViewMessage(
        `${formatPersonName(assigned.candidateName)} assigned to ${assigned.jobCode || assigned.jobTitle || "selected job"}.`
      );
    } catch (assignError) {
      setError(
        assignError instanceof Error ? assignError.message : "Unable to assign candidate to job."
      );
    } finally {
      setIsAssigningJob(false);
    }
  }

  async function handleDeleteCandidate(application: JobApplication) {
    if (!token || !isSuperAdmin) {
      setError("Only Super Admin can delete candidates.");
      return;
    }

    const confirmed = window.confirm(
      `Delete candidate "${application.candidateName}" from the CRM? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setActionMenuApplicationId("");

    try {
      const response = await fetch(`/api/admin/applications/${application.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json()) as { message?: string; success?: boolean };
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to delete candidate.");
      }

      setApplications((current) => current.filter((item) => item.id !== application.id));
      setJobs((current) =>
        current.map((job) =>
          job.id === application.jobId
            ? { ...job, applicationsCount: Math.max(0, (job.applicationsCount || 0) - 1) }
            : job
        )
      );
      setViewMessage("Candidate deleted successfully.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Unable to delete candidate."
      );
    }
  }

  async function openTimeline(application: JobApplication) {
    setActionMenuApplicationId("");
    setTimelineDraft({
      application,
      logs: [],
      isLoading: true,
    });

    try {
      const response = await fetch(
        `/api/admin/audit-logs?entityType=application&entityId=${application.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = (await response.json()) as {
        logs?: Array<{
          id: number;
          actionType: string;
          actorName?: string;
          actorRole?: string;
          createdAt: string;
          afterData?: Record<string, unknown>;
          metadata?: Record<string, unknown>;
        }>;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.message || "Unable to load candidate timeline.");
      }

      setTimelineDraft({
        application,
        logs: result.logs ?? [],
        isLoading: false,
      });
    } catch (timelineError) {
      setError(
        timelineError instanceof Error
          ? timelineError.message
          : "Unable to load candidate timeline."
      );
      setTimelineDraft({
        application,
        logs: [],
        isLoading: false,
      });
    }
  }

  async function handleAssignmentSave() {
    if (!token || !assignmentDraft) {
      return;
    }

    if (!assignmentDraft.assignedEmployeeId) {
      setError("Please select the employee for candidate transfer.");
      return;
    }

    if (!assignmentDraft.effectiveFromDate) {
      setError("Please select the effective from date.");
      return;
    }

    if (
      assignmentDraft.assignmentType === "follow-up-support" &&
      !assignmentDraft.effectiveToDate
    ) {
      setError("Please select the follow-up end date.");
      return;
    }

    try {
      const payload = {
        assignedEmployeeId: assignmentDraft.assignedEmployeeId,
        assignmentType: assignmentDraft.assignmentType,
        effectiveFromDate: assignmentDraft.effectiveFromDate,
        effectiveToDate:
          assignmentDraft.assignmentType === "follow-up-support"
            ? assignmentDraft.effectiveToDate
            : undefined,
        note: assignmentDraft.note,
      } satisfies JobApplicationAssignmentPayload;

      const response = await fetch(
        `/api/admin/jobs/applications/${assignmentDraft.application.id}/assignment`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const updated = (await response.json()) as JobApplication & { message?: string };

      if (!response.ok) {
        throw new Error(updated.message || "Unable to update candidate transfer.");
      }

      if ("approvalPending" in updated && (updated as { approvalPending?: boolean }).approvalPending) {
        setAssignmentDraft(null);
        setError(updated.message || "Candidate transfer request submitted for approval.");
        return;
      }

      setApplications((current) =>
        current.map((application) =>
          application.id === updated.id
            ? {
                ...application,
                assignedEmployeeId: updated.assignedEmployeeId,
                recruiterName: updated.recruiterName,
                recruiterEmail: updated.recruiterEmail,
                followUpEmployeeId: updated.followUpEmployeeId,
                followUpEmployeeName: updated.followUpEmployeeName,
                followUpFromDate: updated.followUpFromDate,
                followUpToDate: updated.followUpToDate,
                followUpAssignmentNote: updated.followUpAssignmentNote,
              }
            : application
        )
      );
      setAssignmentDraft(null);
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "Unable to update candidate transfer."
      );
    }
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
      gender: safeCell(application.gender),
      motherTongue: safeCell(application.motherTongue),
      otherLanguages: safeCell(application.otherLanguages),
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
            <td>${escapeHtml(row.gender)}</td>
            <td>${escapeHtml(row.motherTongue)}</td>
            <td>${escapeHtml(row.otherLanguages)}</td>
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
                <th>Gender</th>
                <th>Mother Tongue</th>
                <th>Other Languages</th>
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

  async function loadApplicationResume(application: JobApplication) {
    if (application.resumeFileData && application.resumeFileName) {
      return {
        resumeFileData: application.resumeFileData,
        resumeFileName: application.resumeFileName,
      };
    }

    const response = await fetch(`/api/admin/applications/${application.id}/resume`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = (await response.json()) as {
      resumeFileData?: string;
      resumeFileName?: string;
      message?: string;
    };

    if (!response.ok || !result.resumeFileData || !result.resumeFileName) {
      throw new Error(result.message || "Unable to load resume.");
    }

    setApplications((current) =>
      current.map((item) =>
        item.id === application.id
          ? {
              ...item,
              resumeFileData: result.resumeFileData,
              resumeFileName: result.resumeFileName,
              resumeAvailable: true,
            }
          : item
      )
    );

    return {
      resumeFileData: result.resumeFileData,
      resumeFileName: result.resumeFileName,
    };
  }

  async function viewApplicationResume(application: JobApplication) {
    try {
      const resume = await loadApplicationResume(application);
      window.open(resume.resumeFileData, "_blank", "noopener,noreferrer");
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : "Unable to load resume.");
    }
  }

  async function downloadApplicationResume(application: JobApplication) {
    try {
      const resume = await loadApplicationResume(application);
      const link = document.createElement("a");
      link.href = resume.resumeFileData;
      link.download = resume.resumeFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (resumeError) {
      setError(resumeError instanceof Error ? resumeError.message : "Unable to download resume.");
    }
  }

  function resetAdvancedFilters() {
    setQuery("");
    setStageFilter("all");
    setSkillFilter("");
    setLocationFilter("");
    setExperienceFilter("");
    setSalaryFilter("");
    setNoticeFilter("");
    setLanguageFilter("");
    setGenderFilter("all");
    setRecruiterFilter("all");
    setClientFilter("all");
    setJobFilter("all");
    setSelectedSavedViewId("");
  }

  function applySavedCandidateView(viewId: string) {
    setSelectedSavedViewId(viewId);
    const view = savedCandidateViews.find((item) => item.id === viewId);
    if (!view) {
      return;
    }

    const filters = view.filters || {};
    setQuery(String(filters.query ?? ""));
    setStageFilter(String(filters.stageFilter ?? "all"));
    setSkillFilter(String(filters.skillFilter ?? ""));
    setLocationFilter(String(filters.locationFilter ?? ""));
    setExperienceFilter(String(filters.experienceFilter ?? ""));
    setSalaryFilter(String(filters.salaryFilter ?? ""));
    setNoticeFilter(String(filters.noticeFilter ?? ""));
    setLanguageFilter(String(filters.languageFilter ?? ""));
    setGenderFilter(String(filters.genderFilter ?? "all"));
    setRecruiterFilter(String(filters.recruiterFilter ?? "all"));
    setClientFilter(String(filters.clientFilter ?? "all"));
    setJobFilter(String(filters.jobFilter ?? "all"));
    setMatchJobId(String(filters.matchJobId ?? ""));
    setViewMessage(`Applied saved view: ${view.viewName}`);
  }

  async function saveCurrentCandidatesView() {
    if (!token) {
      return;
    }

    setViewMessage("");

    try {
      const response = await fetch("/api/admin/saved-views", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          moduleKey: "candidates",
          viewKey: "job-applicants",
          viewName: `Candidates View ${new Date().toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          isShared: !isEmployeeSession,
          filters: {
            query,
            stageFilter,
            skillFilter,
            locationFilter,
            experienceFilter,
            salaryFilter,
            noticeFilter,
            languageFilter,
            genderFilter,
            recruiterFilter,
            clientFilter,
            jobFilter,
            matchJobId,
            authType,
          },
          columns: ["candidate", "contact", "job", "client", "recruiter", "stage", "appliedDate"],
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to save candidates view.");
      }

      setViewMessage("Current candidates view saved.");
    } catch (saveError) {
      setViewMessage(
        saveError instanceof Error ? saveError.message : "Unable to save candidates view."
      );
    }
  }

  return (
    <div className="space-y-6">
      {!roleAccess.modules.candidates ? (
        <section className="accent-card p-8">
          <p className="eyebrow">Restricted</p>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
            Candidates module is hidden for this login from CRM settings.
          </h2>
        </section>
      ) : null}
      {roleAccess.modules.candidates ? (
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
        <article className="accent-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
            Unique Profiles
          </p>
          <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
            {universalTotals.profiles}
          </p>
        </article>
        <article className="accent-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
            Duplicates Merged
          </p>
          <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">
            {universalTotals.mergedDuplicates}
          </p>
        </article>
      </section>

      <section className="accent-card p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Auto Candidate Matching</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
              Match candidates to an open job with score reasons.
            </h2>
            <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
              Scores use role, skills, location, experience, resume availability, and salary fit from the current CRM data.
            </p>
          </div>
          <div className="grid w-full gap-3 md:grid-cols-2 lg:max-w-2xl">
            <select
              value={selectedMatchJob?.id ?? ""}
              onChange={(event) => setMatchJobId(event.target.value)}
              className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
            >
              {visibleJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.jobCode ? `${job.jobCode} - ` : ""}
                  {job.title}
                </option>
              ))}
            </select>
            <select
              value={minimumMatchScore}
              onChange={(event) => setMinimumMatchScore(Number(event.target.value))}
              className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value={0}>Any score</option>
              <option value={35}>35+ score</option>
              <option value={55}>55+ score</option>
              <option value={75}>75+ score</option>
            </select>
          </div>
        </div>

        {!selectedMatchJob ? (
          <p className="muted-copy mt-6 text-sm">No jobs are available for matching.</p>
        ) : matchedCandidates.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">No candidates match the selected score threshold.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {["Score", "Candidate", "Role", "Location", "Experience", "Salary", "Match Reasons", "Resume"].map((heading) => (
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
                  {matchedCandidates.map(({ application, match }, index) => (
                    <tr
                      key={`${application.id}-${selectedMatchJob.id}`}
                      className={
                        index === matchedCandidates.length - 1
                          ? "align-top"
                          : "align-top border-b border-[var(--color-line)]"
                      }
                    >
                      <td className="px-4 py-4">
                        <p className="text-2xl font-semibold text-[var(--color-dark)]">{match.score}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-strong)]">
                          {match.level}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[var(--color-ink)]">
                          {formatPersonName(application.candidateName)}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {application.candidateEmail || application.candidatePhone || "Contact not added"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {application.currentDesignation || application.preferredRole || "Role not added"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {application.currentLocation || application.preferredLocation || "Location not added"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {application.experience || "Experience not added"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {application.expectedCtc || application.currentCtc || "CTC not added"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-[360px] flex-wrap gap-2">
                          {match.reasons.length ? (
                            match.reasons.map((reason) => (
                              <span
                                key={reason}
                                className="rounded-full bg-[rgba(251,133,0,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--color-accent-strong)]"
                              >
                                {reason}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--color-dark)]">
                              Partial match
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {(application.resumeAvailable || application.resumeFileData) &&
                        application.resumeFileName ? (
                          <button
                            type="button"
                            onClick={() => void viewApplicationResume(application)}
                            className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                          >
                            View Resume
                          </button>
                        ) : (
                          "No resume"
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

          <div className="grid w-full gap-3 md:grid-cols-2 xl:min-w-[1040px] xl:grid-cols-[minmax(260px,1fr)_190px_190px_auto_auto] xl:items-end">
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
            <select
              value={selectedSavedViewId}
              onChange={(event) => applySavedCandidateView(event.target.value)}
              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value="">Saved views</option>
              {savedCandidateViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.viewName}
                </option>
              ))}
            </select>
            {roleAccess.modules.reports && roleAccess.fields["reports.download"] ? (
              <button
                type="button"
                onClick={handleApplicantDownload}
                disabled={filteredApplications.length === 0}
                className="h-[50px] rounded-2xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Download Applicant Details
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void saveCurrentCandidatesView()}
              className="h-[50px] rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
            >
              Save Current View
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-[1.25rem] border border-[var(--color-line)] bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              value={skillFilter}
              onChange={(event) => setSkillFilter(event.target.value)}
              placeholder="Skill or role"
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
            />
            <input
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              placeholder="Location"
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
            />
            <input
              value={experienceFilter}
              onChange={(event) => setExperienceFilter(event.target.value)}
              placeholder="Experience"
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
            />
            <input
              value={salaryFilter}
              onChange={(event) => setSalaryFilter(event.target.value)}
              placeholder="CTC / salary"
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
            />
            <input
              value={noticeFilter}
              onChange={(event) => setNoticeFilter(event.target.value)}
              placeholder="Notice period"
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
            />
            <input
              value={languageFilter}
              onChange={(event) => setLanguageFilter(event.target.value)}
              placeholder="Language"
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
            />
            <select
              value={genderFilter}
              onChange={(event) => setGenderFilter(event.target.value)}
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value="all">All genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <select
              value={recruiterFilter}
              onChange={(event) => setRecruiterFilter(event.target.value)}
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value="all">All recruiters</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
            <select
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value="all">All clients</option>
              {visibleClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName}
                </option>
              ))}
            </select>
            <select
              value={jobFilter}
              onChange={(event) => setJobFilter(event.target.value)}
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value="all">All jobs</option>
              {visibleJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.jobCode ? `${job.jobCode} - ` : ""}
                  {job.title}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="muted-copy text-xs">
              Advanced filters cover skill, location, experience, salary, notice, language, gender, recruiter, client, and job.
            </p>
            <button
              type="button"
              onClick={resetAdvancedFilters}
              className="rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}
        {viewMessage ? (
          <p className="mt-4 text-sm font-medium text-[var(--color-dark)]">{viewMessage}</p>
        ) : null}

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading candidates...</p>
        ) : filteredApplications.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">No candidates matched the current filters.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-[1360px] border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {[
                      "Candidate",
                      "Contact",
                      "Job",
                      "Client",
                      "Recruiter",
                      ...(roleAccess.fields["candidates.resume"] ? ["Resume"] : []),
                      "Stage",
                      "Applied Date",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)] ${
                          heading === "Actions" ? "w-[240px] min-w-[240px]" : ""
                        }`}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedApplications.map((application, index) => {
                    const shouldOpenUp = index >= paginatedApplications.length - 2;

                    return (
                    <tr
                      key={application.id}
                      className={
                        index === filteredApplications.length - 1
                          ? "align-top"
                          : "align-top border-b border-[var(--color-line)]"
                      }
                    >
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setEditingApplication(application)}
                          className="font-semibold text-[var(--color-ink)] transition hover:text-[var(--color-dark)]"
                        >
                          {formatPersonName(application.candidateName)}
                        </button>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {application.experience || "Experience not added"}
                        </p>
                        {[application.gender, application.motherTongue, application.otherLanguages].filter(Boolean).length > 0 ? (
                          <p className="mt-1 text-xs text-[var(--color-muted)]">
                            {[application.gender, application.motherTongue, application.otherLanguages].filter(Boolean).join(" | ")}
                          </p>
                        ) : null}
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
                          <AdminJobIdTrigger
                            jobId={application.jobId}
                            jobCode={application.jobCode}
                          />
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
                      {roleAccess.fields["candidates.resume"] ? (
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {(application.resumeAvailable || application.resumeFileData) &&
                          application.resumeFileName ? (
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => void viewApplicationResume(application)}
                                className="font-semibold text-[var(--color-accent-strong)] transition hover:text-[var(--color-dark)]"
                              >
                                View Resume
                              </button>
                              <button
                                type="button"
                                onClick={() => void downloadApplicationResume(application)}
                                className="text-xs font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
                              >
                                Download
                              </button>
                            </div>
                          ) : (
                            "No resume"
                          )}
                        </td>
                      ) : null}
                      <td className="px-4 py-4 text-sm">
                        <span className="inline-flex rounded-full border border-[rgba(8,96,108,0.14)] bg-[rgba(8,96,108,0.05)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-dark)]">
                          {labelizeStage(
                            (application.stage ?? "applied") as JobApplicationStage
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {new Date(application.appliedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="relative w-[240px] min-w-[240px] px-4 py-4 align-middle text-right">
                        <div className="flex flex-nowrap items-center justify-end gap-2">
                          <a
                            href={`/admin/candidates/${application.id}`}
                            className="shrink-0 rounded-xl border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                          >
                            Open
                          </a>
                          {roleAccess.fields["candidates.updateStage"] ? (
                            <button
                              type="button"
                              onClick={() => openStageEditor(application)}
                              className="shrink-0 rounded-xl bg-[var(--color-dark)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
                            >
                              Stage
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void openTimeline(application)}
                            className="shrink-0 rounded-xl border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                          >
                            Timeline
                          </button>
                          <TableActionMenu
                            label={`Open actions for ${application.candidateName}`}
                            isOpen={actionMenuApplicationId === application.id}
                            onToggle={() =>
                              setActionMenuApplicationId((current) =>
                                current === application.id ? "" : application.id
                              )
                            }
                            onClose={() => setActionMenuApplicationId("")}
                            openUp={shouldOpenUp}
                            items={[
                              ...(roleAccess.fields["candidates.transfer"]
                                ? [
                                    {
                                      label: "Transfer Candidate",
                                      onClick: () => openAssignmentEditor(application),
                                    },
                                    {
                                      label: "Assign To Job",
                                      onClick: () => openJobAssignmentEditor(application),
                                      tone: "accent" as const,
                                    },
                                  ]
                                : []),
                              ...(roleAccess.fields["candidates.resume"] &&
                              (application.resumeAvailable || application.resumeFileData) &&
                              application.resumeFileName
                                ? [
                                    {
                                      label: "View Resume",
                                      onClick: () => {
                                        void viewApplicationResume(application);
                                      },
                                      tone: "accent" as const,
                                    },
                                    {
                                      label: "Download Resume",
                                      onClick: () => {
                                        void downloadApplicationResume(application);
                                      },
                                      tone: "danger" as const,
                                    },
                                  ]
                                : []),
                              ...(isSuperAdmin
                                ? [
                                    {
                                      label: "Delete Candidate",
                                      onClick: () => {
                                        void handleDeleteCandidate(application);
                                      },
                                      tone: "danger" as const,
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {!isLoading && filteredApplications.length > pageSize ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="muted-copy text-sm">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredApplications.length)} of{" "}
              {filteredApplications.length} candidates
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={page === pageCount}
                className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
        </div>
      ) : null}

      <AdminCandidateEditModal
        token={token}
        application={editingApplication}
        canViewCompensation={roleAccess.fields["candidates.compensation"]}
        onClose={() => setEditingApplication(null)}
        onSaved={(updatedApplication) => {
          setApplications((current) =>
            current.map((application) =>
              application.id === updatedApplication.id ? updatedApplication : application
            )
          );
        }}
      />

      {stageDraft ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Stage Update</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {formatPersonName(stageDraft.application.candidateName)}
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
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Stage
                </span>
                <select
                  value={stageDraft.stage}
                  onChange={(event) =>
                    setStageDraft((current) =>
                      current
                        ? {
                            ...current,
                            stage: event.target.value as JobApplicationStage,
                          }
                        : current
                    )
                  }
                  className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                >
                  {stageOptions.map((stage) => (
                    <option key={stage} value={stage}>
                      {labelizeStage(stage)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Stage Effective Date
                </span>
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
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Stage Remark
              </span>
              <textarea
                value={stageDraft.note}
                onChange={(event) =>
                  setStageDraft((current) =>
                    current ? { ...current, note: event.target.value } : current
                  )
                }
                placeholder="Add stage remarks for shortlist, interview, offer, joining, or rejection."
                className="min-h-[150px] w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>

            {stageDraft.stage === "interview" ? (
              <div className="mt-4 rounded-2xl border border-[var(--color-line)] bg-[rgba(8,96,108,0.03)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Interview Scheduler
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Interview Time
                    </span>
                    <input
                      type="datetime-local"
                      value={stageDraft.interviewScheduledAt}
                      onChange={(event) =>
                        setStageDraft((current) =>
                          current
                            ? { ...current, interviewScheduledAt: event.target.value }
                            : current
                        )
                      }
                      className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Mode
                    </span>
                    <select
                      value={stageDraft.interviewMode}
                      onChange={(event) =>
                        setStageDraft((current) =>
                          current ? { ...current, interviewMode: event.target.value } : current
                        )
                      }
                      className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
                    >
                      <option value="">Select mode</option>
                      <option value="Phone">Phone</option>
                      <option value="Video">Video</option>
                      <option value="In-person">In-person</option>
                      <option value="Client round">Client round</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Panel
                    </span>
                    <input
                      value={stageDraft.interviewPanel}
                      onChange={(event) =>
                        setStageDraft((current) =>
                          current ? { ...current, interviewPanel: event.target.value } : current
                        )
                      }
                      placeholder="Panel or interviewer"
                      className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Reminder
                    </span>
                    <input
                      type="datetime-local"
                      value={stageDraft.interviewReminderAt}
                      onChange={(event) =>
                        setStageDraft((current) =>
                          current
                            ? { ...current, interviewReminderAt: event.target.value }
                            : current
                        )
                      }
                      className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {stageDraft.stage === "joined" ? (
              <div className="mt-4 rounded-2xl border border-[var(--color-line)] bg-[rgba(8,96,108,0.03)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Joining & Invoice Details
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                      placeholder="Example: 6 LPA or 600000"
                      className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
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
                          current ? { ...current, dateOfJoining: event.target.value, date: event.target.value } : current
                        )
                      }
                      className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (!stageDraft.note.trim() || !stageDraft.date) {
                    setError("Please add both remarks and date before saving the stage update.");
                    return;
                  }
                  if (
                    stageDraft.stage === "joined" &&
                    (!stageDraft.finalCtc.trim() || !stageDraft.dateOfJoining)
                  ) {
                    setError("Please add final CTC and date of joining before marking candidate as joined.");
                    return;
                  }

                  await handleStageChange(
                    stageDraft.application.id,
                    stageDraft.stage,
                    stageDraft.note.trim(),
                    stageDraft.date,
                    stageDraft.stage === "interview"
                      ? {
                          interviewScheduledAt: stageDraft.interviewScheduledAt || undefined,
                          interviewMode: stageDraft.interviewMode.trim() || undefined,
                          interviewPanel: stageDraft.interviewPanel.trim() || undefined,
                          interviewReminderAt: stageDraft.interviewReminderAt || undefined,
                        }
                      : stageDraft.stage === "joined"
                        ? {
                            finalCtc: stageDraft.finalCtc.trim(),
                            dateOfJoining: stageDraft.dateOfJoining,
                          }
                        : undefined
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

      {assignmentDraft ? (
        <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-2xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Transfer Candidate</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {formatPersonName(assignmentDraft.application.candidateName)}
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  Choose full ownership transfer or date-based follow-up assignment for this candidate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignmentDraft(null)}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Assignment Type
                </span>
                <select
                  value={assignmentDraft.assignmentType}
                  onChange={(event) =>
                    setAssignmentDraft((current) =>
                      current
                        ? {
                            ...current,
                            assignmentType: event.target.value as
                              | "ownership-transfer"
                              | "follow-up-support",
                          }
                        : current
                    )
                  }
                  className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                >
                  <option value="ownership-transfer">Full Ownership Transfer</option>
                  <option value="follow-up-support">Follow-Up Only</option>
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Transfer To
                </span>
                <select
                  value={assignmentDraft.assignedEmployeeId}
                  onChange={(event) =>
                    setAssignmentDraft((current) =>
                      current
                        ? { ...current, assignedEmployeeId: event.target.value }
                        : current
                    )
                  }
                  className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                >
                  <option value="">Select employee</option>
                  {employees
                    .filter((employee) => employee.status === "active")
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName} - {employee.role}
                      </option>
                    ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Effective From Date
                </span>
                <input
                  type="date"
                  value={assignmentDraft.effectiveFromDate}
                  onChange={(event) =>
                    setAssignmentDraft((current) =>
                      current
                        ? { ...current, effectiveFromDate: event.target.value }
                        : current
                    )
                  }
                  className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                />
              </label>

              {assignmentDraft.assignmentType === "follow-up-support" ? (
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Effective To Date
                  </span>
                  <input
                    type="date"
                    value={assignmentDraft.effectiveToDate}
                    onChange={(event) =>
                      setAssignmentDraft((current) =>
                        current
                          ? { ...current, effectiveToDate: event.target.value }
                          : current
                      )
                    }
                    className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  />
                </label>
              ) : (
                <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(8,96,108,0.03)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Current Owner
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[var(--color-ink)]">
                    {assignmentDraft.application.recruiterName || "Unassigned"}
                  </p>
                </div>
              )}

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Remarks
                </span>
                <textarea
                  value={assignmentDraft.note}
                  onChange={(event) =>
                    setAssignmentDraft((current) =>
                      current ? { ...current, note: event.target.value } : current
                    )
                  }
                  className="min-h-[140px] w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  placeholder="Reason for transfer or follow-up support"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleAssignmentSave()}
                className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
              >
                Save Candidate Transfer
              </button>
              <button
                type="button"
                onClick={() => setAssignmentDraft(null)}
                className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {jobAssignmentDraft ? (
        <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-2xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Assign To Job</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {formatPersonName(jobAssignmentDraft.application.candidateName)}
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  Copy this candidate profile and resume to another open job.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setJobAssignmentDraft(null)}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Target Job
                </span>
                <select
                  value={jobAssignmentDraft.jobId}
                  onChange={(event) =>
                    setJobAssignmentDraft((current) =>
                      current ? { ...current, jobId: event.target.value } : current
                    )
                  }
                  className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                >
                  <option value="">Select job</option>
                  {assignableJobs
                    .filter((job) => job.id !== jobAssignmentDraft.application.jobId)
                    .map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.status === "open" ? "Open - " : ""}
                        {job.jobCode ? `${job.jobCode} - ` : ""}
                        {job.title}
                        {job.lastDateToApply ? ` - closes ${job.lastDateToApply}` : ""}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Stage
                </span>
                <select
                  value={jobAssignmentDraft.stage}
                  onChange={(event) =>
                    setJobAssignmentDraft((current) =>
                      current
                        ? { ...current, stage: event.target.value as JobApplicationStage }
                        : current
                    )
                  }
                  className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                >
                  {stageOptions.map((stage) => (
                    <option key={stage} value={stage}>
                      {labelizeStage(stage)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleJobAssignmentSave}
                disabled={isAssigningJob || !jobAssignmentDraft.jobId}
                className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAssigningJob ? "Assigning..." : "Assign Candidate"}
              </button>
              <button
                type="button"
                onClick={() => setJobAssignmentDraft(null)}
                className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {timelineDraft ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-3xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Candidate Timeline</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {formatPersonName(timelineDraft.application.candidateName)}
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  View stage movement, transfers, and manual CRM actions for this profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTimelineDraft(null)}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            {timelineDraft.isLoading ? (
              <p className="muted-copy mt-6 text-sm">Loading candidate timeline...</p>
            ) : timelineDraft.logs.length === 0 ? (
              <p className="muted-copy mt-6 text-sm">No candidate activity is recorded yet.</p>
            ) : (
              <div className="mt-6 max-h-[65vh] space-y-4 overflow-y-auto pr-1">
                {timelineDraft.logs.map((log) => (
                  <article
                    key={log.id}
                    className="rounded-[1.25rem] border border-[var(--color-line)] bg-[rgba(8,96,108,0.03)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--color-ink)]">
                          {(log.actorName || "Werkly User").toString()}
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">
                          {(log.actorRole || "internal-user").toString()}
                        </p>
                      </div>
                      <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-dark)]">
                        {log.actionType}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          Updated On
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-ink)]">
                          {new Date(log.createdAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                          Current Snapshot
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-ink)]">
                          {String(
                            log.afterData?.stage ||
                              log.metadata?.assignmentType ||
                              log.metadata?.candidateName ||
                              "Updated"
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
