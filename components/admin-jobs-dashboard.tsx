"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientRecord, EmployeeRecord } from "@/lib/crm";
import { useCrmAccessControl } from "@/hooks/use-crm-access-control";
import type {
  JobApplication,
  JobApplicationStage,
  ManualJobApplicationPayload,
  JobSummary,
  JobStatus,
} from "@/lib/jobs";
import {
  countMatchingUniversalProfiles,
  type UniversalCandidateProfile,
} from "@/lib/candidate-profiles";
import { formatPersonName } from "@/lib/format";
import { AdminJobIdTrigger } from "@/components/admin-job-id-trigger";
import { AdminCandidateEditModal } from "@/components/admin-candidate-edit-modal";
import { TableActionMenu } from "@/components/table-action-menu";

type JobEditorState = {
  id?: string;
  jobCode?: string;
  clientId: string;
  recruiterId: string;
  title: string;
  location: string;
  sector: string;
  experience: string;
  employmentType: string;
  salary: string;
  packagePerAnnum: string;
  positionsCount: string;
  status: JobStatus;
  isHidden: boolean;
  lastDateToApply: string;
  responsibilities: string;
  requirements: string;
};

type ManualCandidateState = {
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  gender: string;
  motherTongue: string;
  otherLanguages: string;
  experience: string;
  currentCompany: string;
  currentLocation: string;
  currentDesignation: string;
  preferredRole: string;
  currentCtc: string;
  expectedCtc: string;
  preferredLocation: string;
  preferredSector: string;
  candidateMessage: string;
  sourceType: string;
  sourceNote: string;
  initialStage: JobApplicationStage;
  stageNote: string;
  stageDate: string;
  resumeFileName: string;
  resumeFileType: string;
  resumeFileData: string;
};

const emptyForm: JobEditorState = {
  clientId: "",
  recruiterId: "",
  title: "",
  location: "",
  sector: "",
  experience: "",
  employmentType: "Full Time",
  salary: "",
  packagePerAnnum: "",
  positionsCount: "1",
  status: "open",
  isHidden: false,
  lastDateToApply: "",
  responsibilities: "",
  requirements: "",
};

const fieldClassName =
  "w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-dark)]";

const applicationStages: JobApplicationStage[] = [
  "applied",
  "shortlisted",
  "interview",
  "offered",
  "joined",
  "screen-rejection",
  "rejected",
];

const manualSourceOptions = [
  "Referral",
  "Vendor",
  "WhatsApp",
  "Naukri",
  "LinkedIn",
  "Internal Database",
  "Walk-in",
  "Other",
];

const emptyManualCandidateForm: ManualCandidateState = {
  candidateName: "",
  candidateEmail: "",
  candidatePhone: "",
  gender: "",
  motherTongue: "",
  otherLanguages: "",
  experience: "",
  currentCompany: "",
  currentLocation: "",
  currentDesignation: "",
  preferredRole: "",
  currentCtc: "",
  expectedCtc: "",
  preferredLocation: "",
  preferredSector: "",
  candidateMessage: "",
  sourceType: "Referral",
  sourceNote: "",
  initialStage: "applied",
  stageNote: "",
  stageDate: new Date().toISOString().slice(0, 10),
  resumeFileName: "",
  resumeFileType: "",
  resumeFileData: "",
};

function formatExportDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB");
}

function sanitizeExportCell(value?: string) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : "-";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatStageLabel(stage: JobApplicationStage) {
  return stage
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminJobsDashboard({
  viewMode = "all",
}: {
  viewMode?: "all" | "new" | "existing";
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [token, setToken] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem("werklyAdminToken") ?? ""
  );
  const [adminEmail, setAdminEmail] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem("werklyAdminEmail") ?? ""
  );
  const [authType, setAuthType] = useState(() =>
    typeof window === "undefined" ? "admin" : window.localStorage.getItem("werklyAuthType") ?? "admin"
  );
  const [authRole, setAuthRole] = useState(() =>
    typeof window === "undefined"
      ? "super-admin"
      : window.localStorage.getItem("werklyAuthRole") ?? "super-admin"
  );
  const [authEmployeeCode, setAuthEmployeeCode] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem("werklyEmployeeCode") ?? ""
  );
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [allApplications, setAllApplications] = useState<JobApplication[]>([]);
  const [universalProfiles, setUniversalProfiles] = useState<UniversalCandidateProfile[]>([]);
  const [form, setForm] = useState<JobEditorState>(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [applicationsJob, setApplicationsJob] = useState<JobSummary | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [applicationsSearch, setApplicationsSearch] = useState("");
  const [isApplicationsLoading, setIsApplicationsLoading] = useState(false);
  const [isUpdatingStageId, setIsUpdatingStageId] = useState("");
  const [recruiterFilter, setRecruiterFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [jobsPage, setJobsPage] = useState(1);
  const [stageDraft, setStageDraft] = useState<{
    application: JobApplication;
    stage: JobApplicationStage;
    note: string;
    date: string;
    finalCtc: string;
    dateOfJoining: string;
  } | null>(null);
  const [manualCandidateJob, setManualCandidateJob] = useState<JobSummary | null>(null);
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);
  const [manualCandidateForm, setManualCandidateForm] = useState<ManualCandidateState>(
    emptyManualCandidateForm
  );
  const [isSavingCandidate, setIsSavingCandidate] = useState(false);
  const [actionMenuJobId, setActionMenuJobId] = useState("");
  const [viewMessage, setViewMessage] = useState("");
  const [submissionHistoryJob, setSubmissionHistoryJob] = useState<JobSummary | null>(null);

  const isEditing = Boolean(form.id);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("werklyAdminToken") ?? "";
    const savedEmail = window.localStorage.getItem("werklyAdminEmail") ?? "";
    const savedAuthType = window.localStorage.getItem("werklyAuthType") ?? "admin";
    const savedAuthRole = window.localStorage.getItem("werklyAuthRole") ?? "super-admin";
    const savedEmployeeCode = window.localStorage.getItem("werklyEmployeeCode") ?? "";
    setToken(savedToken);
    setAdminEmail(savedEmail);
    setAuthType(savedAuthType);
    setAuthRole(savedAuthRole);
    setAuthEmployeeCode(savedEmployeeCode);
  }, []);

  const isEmployeeSession = authType === "employee" || Boolean(authEmployeeCode);
  const { roleAccess } = useCrmAccessControl(
    token,
    authType,
    authRole,
    authEmployeeCode,
    adminEmail
  );
  const isSuperAdmin = authType === "admin" || authRole === "super-admin";
  const canManageJobs = authType === "admin" || authRole === "super-admin";
  const canUseJobForms = roleAccess.modules.jobs && roleAccess.fields["jobs.createEdit"];
  const canUseJobAssignments = roleAccess.fields["jobs.assignment"];
  const canViewJobCompensation = roleAccess.fields["jobs.compensation"];
  const canToggleJobVisibility = roleAccess.fields["jobs.hideToggle"];
  const canAddCandidates =
    roleAccess.modules.jobs &&
    roleAccess.modules.candidates &&
    roleAccess.fields["jobs.addCandidate"];
  const currentEmployeeId = useMemo(
    () =>
      employees.find(
        (employee) => employee.employeeCode === authEmployeeCode || employee.email === adminEmail
      )?.id ?? "",
    [adminEmail, authEmployeeCode, employees]
  );
  const shouldAutoAssignRecruiter = isEmployeeSession && Boolean(currentEmployeeId);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (stageDraft) {
        setStageDraft(null);
        return;
      }

      if (manualCandidateJob) {
        setManualCandidateJob(null);
        setManualCandidateForm(emptyManualCandidateForm);
        return;
      }

      if (editingApplication) {
        setEditingApplication(null);
        return;
      }

      if (applicationsJob) {
        setApplicationsJob(null);
        return;
      }

      if (isEditing) {
        setForm({
          ...emptyForm,
          recruiterId: shouldAutoAssignRecruiter ? currentEmployeeId : "",
        });
        setMessage("");
        setError("");
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [
    applicationsJob,
    currentEmployeeId,
    editingApplication,
    isEditing,
    manualCandidateJob,
    shouldAutoAssignRecruiter,
    stageDraft,
  ]);
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
  const jobFormClients = useMemo(
    () =>
      visibleClients.filter(
        (client) => client.status === "active" && client.onboardingStatus === "onboarded"
      ),
    [visibleClients]
  );
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
        job.recruiterEmail === adminEmail ||
        (job.clientId ? visibleClientIds.has(job.clientId) : false)
    );
  }, [adminEmail, currentEmployeeId, isEmployeeSession, jobs, visibleClientIds]);
  const filteredApplications = useMemo(() => {
    const searchTerm = applicationsSearch.trim().toLowerCase();
    if (!searchTerm) {
      return applications;
    }

    return applications.filter((application) =>
      [application.candidateName, application.candidateEmail, application.candidatePhone].some(
        (value) => String(value ?? "").toLowerCase().includes(searchTerm)
      )
    );
  }, [applications, applicationsSearch]);
  const duplicateCandidateMatches = useMemo(() => {
    const normalizedEmail = manualCandidateForm.candidateEmail.trim().toLowerCase();
    const normalizedPhone = manualCandidateForm.candidatePhone.replace(/\D/g, "");

    if (!normalizedEmail && !normalizedPhone) {
      return [];
    }

    return allApplications.filter((application) => {
      const applicationEmail = String(application.candidateEmail || "").trim().toLowerCase();
      const applicationPhone = String(application.candidatePhone || "").replace(/\D/g, "");
      return Boolean(
        (normalizedEmail && applicationEmail === normalizedEmail) ||
          (normalizedPhone && applicationPhone === normalizedPhone)
      );
    });
  }, [allApplications, manualCandidateForm.candidateEmail, manualCandidateForm.candidatePhone]);

  useEffect(() => {
    if (typeof window === "undefined" || !canManageJobs) {
      return;
    }

    const savedRecruiterFilter = window.localStorage.getItem("werklyJobsRecruiterFilter");
    if (savedRecruiterFilter) {
      setRecruiterFilter(savedRecruiterFilter);
    }
    const savedClientFilter = window.localStorage.getItem("werklyJobsClientFilter");
    if (savedClientFilter) {
      setClientFilter(savedClientFilter);
    }
  }, [canManageJobs]);

  useEffect(() => {
    if (typeof window === "undefined" || !canManageJobs) {
      return;
    }

    window.localStorage.setItem("werklyJobsRecruiterFilter", recruiterFilter);
    window.localStorage.setItem("werklyJobsClientFilter", clientFilter);
  }, [canManageJobs, clientFilter, recruiterFilter]);

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
      fetch("/api/admin/employees", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetch("/api/admin/applications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetch("/api/admin/candidate-profiles", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ])
      .then(async ([
        jobsResponse,
        clientsResponse,
        employeesResponse,
        applicationsResponse,
        profilesResponse,
      ]) => {
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
        const employeesResult = (await employeesResponse.json()) as {
          employees?: EmployeeRecord[];
          message?: string;
        };
        const applicationsResult = (await applicationsResponse.json()) as {
          applications?: JobApplication[];
          message?: string;
        };
        const profilesResult = (await profilesResponse.json()) as {
          profiles?: UniversalCandidateProfile[];
          message?: string;
        };
        if (!clientsResponse.ok) {
          throw new Error(clientsResult.message || "Unable to load clients.");
        }
        if (!employeesResponse.ok) {
          throw new Error(employeesResult.message || "Unable to load employees.");
        }
        if (!applicationsResponse.ok) {
          throw new Error(applicationsResult.message || "Unable to load applications.");
        }
        if (!profilesResponse.ok) {
          throw new Error(profilesResult.message || "Unable to load candidate profiles.");
        }

        setJobs(jobsResult.jobs ?? []);
        setClients(clientsResult.clients ?? []);
        setEmployees(employeesResult.employees ?? []);
        setAllApplications(applicationsResult.applications ?? []);
        setUniversalProfiles(profilesResult.profiles ?? []);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load jobs.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const sortedJobs = useMemo(
    () =>
      [...visibleJobs].sort((a, b) =>
        new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      ),
    [visibleJobs]
  );

  const filteredJobs = useMemo(() => {
    const recruiterScopedJobs =
      recruiterFilter === "all"
        ? sortedJobs
        : recruiterFilter === "unassigned"
          ? sortedJobs.filter((job) => !job.recruiterId)
          : sortedJobs.filter((job) => job.recruiterId === recruiterFilter);

    if (clientFilter === "all") {
      return recruiterScopedJobs;
    }

    if (clientFilter === "unassigned") {
      return recruiterScopedJobs.filter((job) => !job.clientId);
    }

    return recruiterScopedJobs.filter((job) => job.clientId === clientFilter);
  }, [clientFilter, recruiterFilter, sortedJobs]);

  const recruiterClientOptions = useMemo(() => {
    const recruiterScopedJobs =
      recruiterFilter === "all"
        ? sortedJobs
        : recruiterFilter === "unassigned"
          ? sortedJobs.filter((job) => !job.recruiterId)
          : sortedJobs.filter((job) => job.recruiterId === recruiterFilter);

    const seen = new Map<string, string>();
    recruiterScopedJobs.forEach((job) => {
      if (job.clientId && job.clientName && !seen.has(job.clientId)) {
        seen.set(job.clientId, job.clientName);
      }
    });

    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [recruiterFilter, sortedJobs]);

  useEffect(() => {
    setJobsPage(1);
  }, [clientFilter, recruiterFilter, sortedJobs.length]);

  useEffect(() => {
    if (
      clientFilter !== "all" &&
      clientFilter !== "unassigned" &&
      !recruiterClientOptions.some((client) => client.id === clientFilter)
    ) {
      setClientFilter("all");
    }
  }, [clientFilter, recruiterClientOptions]);

  const jobsPageSize = 8;
  const jobsPageCount = Math.max(1, Math.ceil(filteredJobs.length / jobsPageSize));
  const paginatedJobs = useMemo(
    () =>
      filteredJobs.slice((jobsPage - 1) * jobsPageSize, jobsPage * jobsPageSize),
    [filteredJobs, jobsPage]
  );

  const matchingCandidateCounts = useMemo(() => {
    return new Map(
      visibleJobs.map((job) => [
        job.id,
        countMatchingUniversalProfiles(job, universalProfiles),
      ])
    );
  }, [universalProfiles, visibleJobs]);

  const submissionHistory = useMemo(() => {
    if (!submissionHistoryJob) {
      return [];
    }

    return allApplications
      .filter((application) => application.clientName === submissionHistoryJob.clientName)
      .sort(
        (first, second) =>
          new Date(second.stageUpdatedAt || second.appliedAt).getTime() -
          new Date(first.stageUpdatedAt || first.appliedAt).getTime()
      );
  }, [allApplications, submissionHistoryJob]);

  function isLiveOnWebsite(job: JobSummary) {
    if (job.isHidden) {
      return false;
    }

    if (job.status !== "open") {
      return false;
    }

    if (!job.lastDateToApply) {
      return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(job.lastDateToApply) >= today;
  }

  function sendShortlistedProfilesToClient(job: JobSummary) {
    const shortlistedApplications = allApplications.filter(
      (application) =>
        application.jobId === job.id && (application.stage ?? "applied") === "shortlisted"
    );
    const client = clients.find((item) => item.id === job.clientId);
    const recipient = client?.contactEmail || "";

    if (shortlistedApplications.length === 0) {
      setError("No shortlisted candidates are available for this job.");
      return;
    }

    const body = shortlistedApplications
      .map((application, index) =>
        [
          `${index + 1}. ${formatPersonName(application.candidateName)}`,
          `Email: ${application.candidateEmail || "-"}`,
          `Phone: ${application.candidatePhone || "-"}`,
          `Experience: ${application.experience || "-"}`,
          `Current role: ${application.currentDesignation || "-"}`,
          `Current location: ${application.currentLocation || "-"}`,
          `Remarks: ${application.stageNote || application.candidateMessage || "-"}`,
        ].join("\n")
      )
      .join("\n\n");

    window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
      `Shortlisted profiles for ${job.title}`
    )}&body=${encodeURIComponent(
      `Dear ${client?.contactPerson || "Client"},\n\nPlease find the shortlisted profiles for ${job.title} below.\n\n${body}\n\nRegards,\nWerkly Team`
    )}`;
    setMessage(`Prepared ${shortlistedApplications.length} shortlisted profiles for client email.`);
  }

  function downloadJobsCurrentView() {
    const workbookMarkup = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #eaf2f4; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>Jobs Current View</h1>
    <table>
      <thead>
        <tr>
          <th>Job Code</th>
          <th>Title</th>
          <th>Client</th>
          <th>Recruiter</th>
          <th>Location</th>
          <th>Positions</th>
          <th>Experience</th>
          <th>Status</th>
          <th>Live Status</th>
          <th>Applications</th>
        </tr>
      </thead>
      <tbody>
        ${filteredJobs
          .map(
            (job) => `<tr>
              <td>${escapeHtml(job.jobCode || "-")}</td>
              <td>${escapeHtml(job.title)}</td>
              <td>${escapeHtml(job.clientName || "Not assigned")}</td>
              <td>${escapeHtml(job.recruiterName || "Unassigned")}</td>
              <td>${escapeHtml(job.location)}</td>
              <td>${job.positionsCount ?? 1}</td>
              <td>${escapeHtml(job.experience)}</td>
              <td>${escapeHtml(job.isHidden ? "hidden" : job.status)}</td>
              <td>${escapeHtml(isLiveOnWebsite(job) ? "Live on website" : "Not live")}</td>
              <td>${job.applicationsCount}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </body>
</html>`;

    const blob = new Blob([workbookMarkup], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jobs-current-view.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function saveCurrentJobsView() {
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
          moduleKey: "jobs",
          viewKey: viewMode === "existing" ? "existing-jobs" : "jobs-dashboard",
          viewName: `Jobs View ${new Date().toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          isShared: canManageJobs,
          filters: {
            recruiterFilter,
            clientFilter,
            viewMode,
            authType,
          },
          columns: ["job", "client", "recruiter", "location", "positions", "applications", "status"],
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to save jobs view.");
      }

      setViewMessage("Current jobs view saved.");
    } catch (saveError) {
      setViewMessage(saveError instanceof Error ? saveError.message : "Unable to save jobs view.");
    }
  }

  function updateForm(field: keyof JobEditorState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateManualCandidateField(
    field: keyof ManualCandidateState,
    value: string | JobApplicationStage
  ) {
    setManualCandidateForm((current) => ({ ...current, [field]: value }));
  }

  function renderJobFields() {
    return (
      <>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {canUseJobAssignments ? (
            <>
              <select
                className={fieldClassName}
                value={form.clientId}
                onChange={(event) => updateForm("clientId", event.target.value)}
                required
              >
                <option value="">Select client</option>
                {jobFormClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName}
                  </option>
                ))}
              </select>
              {!shouldAutoAssignRecruiter ? (
                <select
                  className={fieldClassName}
                  value={form.recruiterId}
                  onChange={(event) => updateForm("recruiterId", event.target.value)}
                >
                  <option value="">Assign recruiter</option>
                  {employees
                    .filter((employee) => employee.status === "active")
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName} - {employee.role}
                      </option>
                    ))}
                </select>
              ) : null}
            </>
          ) : null}
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
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              No. of Positions
            </span>
            <input
              className={fieldClassName}
              type="number"
              min="1"
              step="1"
              aria-label="Number of positions"
              placeholder="No. of positions"
              value={form.positionsCount}
              onChange={(event) => updateForm("positionsCount", event.target.value)}
              required
            />
          </label>
          {canViewJobCompensation ? (
            <>
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
            </>
          ) : null}
          <select
            className={fieldClassName}
            value={form.status}
            onChange={(event) => updateForm("status", event.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Last Date To Apply
            </span>
            <input
              className={fieldClassName}
              type="date"
              aria-label="Last date to apply"
              value={form.lastDateToApply}
              onChange={(event) => updateForm("lastDateToApply", event.target.value)}
            />
          </label>
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
    setActionMenuJobId("");
    setForm({
      id: job.id,
      jobCode: job.jobCode,
      clientId: job.clientId ?? "",
      recruiterId: job.recruiterId ?? "",
      title: job.title,
      location: job.location,
      sector: job.sector,
      experience: job.experience,
      employmentType: job.employmentType,
      salary: job.salary ?? "",
      packagePerAnnum: job.packagePerAnnum ?? "",
      positionsCount: String(job.positionsCount ?? 1),
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
    const [jobsResponse, clientsResponse, employeesResponse, applicationsResponse] = await Promise.all([
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
      fetch("/api/admin/employees", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetch("/api/admin/applications", {
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
    const employeesResult = (await employeesResponse.json()) as {
      employees?: EmployeeRecord[];
      message?: string;
    };
    const applicationsResult = (await applicationsResponse.json()) as {
      applications?: JobApplication[];
      message?: string;
    };
    if (!employeesResponse.ok) {
      throw new Error(employeesResult.message || "Unable to refresh employees.");
    }
    if (!applicationsResponse.ok) {
      throw new Error(applicationsResult.message || "Unable to refresh applications.");
    }
    setJobs(jobsResult.jobs ?? []);
    setClients(clientsResult.clients ?? []);
    setEmployees(employeesResult.employees ?? []);
    setAllApplications(applicationsResult.applications ?? []);
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
      const payload = shouldAutoAssignRecruiter
        ? { ...form, recruiterId: currentEmployeeId }
        : form;
      const response = await fetch(
        form.id ? `/api/admin/jobs/${form.id}` : "/api/admin/jobs",
        {
          method: form.id ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to save job.");
      }

      await refreshJobs();
      setForm({
        ...emptyForm,
        recruiterId: shouldAutoAssignRecruiter ? currentEmployeeId : "",
      });
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
          recruiterId: job.recruiterId ?? "",
          title: job.title,
          location: job.location,
          sector: job.sector,
          experience: job.experience,
          employmentType: job.employmentType,
          salary: job.salary ?? "",
          packagePerAnnum: job.packagePerAnnum ?? "",
          positionsCount: String(job.positionsCount ?? 1),
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

  async function handleMakeJobLive(job: JobSummary) {
    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    setError("");
    setMessage("");
    setActionMenuJobId("");

    try {
      const response = await fetch(`/api/admin/jobs/${job.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId: job.clientId ?? "",
          recruiterId: job.recruiterId ?? "",
          title: job.title,
          location: job.location,
          sector: job.sector,
          experience: job.experience,
          employmentType: job.employmentType,
          salary: job.salary ?? "",
          packagePerAnnum: job.packagePerAnnum ?? "",
          positionsCount: String(job.positionsCount ?? 1),
          status: "open",
          isHidden: false,
          postedAt: job.postedAt,
          lastDateToApply: job.lastDateToApply ?? "",
          responsibilities: (job.responsibilities ?? []).join("\n"),
          requirements: (job.requirements ?? []).join("\n"),
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to make job live.");
      }

      await refreshJobs();
      setMessage("Job is live now.");
    } catch (liveError) {
      setError(liveError instanceof Error ? liveError.message : "Unable to make job live.");
    }
  }

  async function handleDeleteJob(job: JobSummary) {
    if (!token || !isSuperAdmin) {
      setError("Only Super Admin can delete jobs.");
      return;
    }

    const confirmed = window.confirm(
      `Delete job "${job.title}"${job.jobCode ? ` (${job.jobCode})` : ""}? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setActionMenuJobId("");

    try {
      const response = await fetch(`/api/admin/jobs/${job.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json()) as { message?: string; success?: boolean };
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to delete job.");
      }

      await refreshJobs();
      if (form.id === job.id) {
        setForm(emptyForm);
      }
      setMessage("Job deleted successfully.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete job.");
    }
  }

  async function openApplications(job: JobSummary) {
    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    setApplicationsJob(job);
    setApplications([]);
    setApplicationsSearch("");
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
    setForm({
      ...emptyForm,
      recruiterId: shouldAutoAssignRecruiter ? currentEmployeeId : "",
    });
    setMessage("");
    setError("");
  }

  function openManualCandidateModal(job: JobSummary) {
    setActionMenuJobId("");
    setManualCandidateJob(job);
    setManualCandidateForm({
      ...emptyManualCandidateForm,
      initialStage: "applied",
      stageDate: new Date().toISOString().slice(0, 10),
    });
    setError("");
    setMessage("");
  }

  function closeManualCandidateModal() {
    setManualCandidateJob(null);
    setManualCandidateForm(emptyManualCandidateForm);
  }

  async function handleResumeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setManualCandidateForm((current) => ({
        ...current,
        resumeFileName: "",
        resumeFileType: "",
        resumeFileData: "",
      }));
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Resume must be uploaded as PDF, DOC, or DOCX.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Resume file must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setError("");

    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Unable to read the resume file."));
      reader.readAsDataURL(file);
    });

    setManualCandidateForm((current) => ({
      ...current,
      resumeFileName: file.name,
      resumeFileType: file.type,
      resumeFileData: fileData,
    }));
  }

  async function handleManualCandidateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !manualCandidateJob) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    if (
      !manualCandidateForm.candidateName.trim() ||
      (!manualCandidateForm.candidateEmail.trim() && !manualCandidateForm.candidatePhone.trim())
    ) {
      setError("Candidate name and either email or phone are required.");
      return;
    }

    setIsSavingCandidate(true);
    setError("");
    setMessage("");

    try {
      const payload: ManualJobApplicationPayload = {
        candidateName: manualCandidateForm.candidateName.trim(),
        candidateEmail: manualCandidateForm.candidateEmail.trim() || undefined,
        candidatePhone: manualCandidateForm.candidatePhone.trim() || undefined,
        gender: manualCandidateForm.gender.trim() || undefined,
        motherTongue: manualCandidateForm.motherTongue.trim() || undefined,
        otherLanguages: manualCandidateForm.otherLanguages.trim() || undefined,
        experience: manualCandidateForm.experience.trim() || undefined,
        currentCompany: manualCandidateForm.currentCompany.trim() || undefined,
        currentLocation: manualCandidateForm.currentLocation.trim() || undefined,
        currentDesignation: manualCandidateForm.currentDesignation.trim() || undefined,
        preferredRole: manualCandidateForm.preferredRole.trim() || undefined,
        currentCtc: manualCandidateForm.currentCtc.trim() || undefined,
        expectedCtc: manualCandidateForm.expectedCtc.trim() || undefined,
        preferredLocation: manualCandidateForm.preferredLocation.trim() || undefined,
        preferredSector: manualCandidateForm.preferredSector.trim() || undefined,
        candidateMessage: manualCandidateForm.candidateMessage.trim() || undefined,
        sourceType: manualCandidateForm.sourceType,
        sourceNote: manualCandidateForm.sourceNote.trim() || undefined,
        initialStage: manualCandidateForm.initialStage,
        stageNote: manualCandidateForm.stageNote.trim() || undefined,
        stageDate: manualCandidateForm.stageDate,
        resumeFileName: manualCandidateForm.resumeFileName || undefined,
        resumeFileType: manualCandidateForm.resumeFileType || undefined,
        resumeFileData: manualCandidateForm.resumeFileData || undefined,
        jobTitle: manualCandidateJob.title,
      };

      const response = await fetch(`/api/admin/jobs/${manualCandidateJob.id}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to add candidate.");
      }

      await refreshJobs();
      if (applicationsJob?.id === manualCandidateJob.id) {
        await openApplications(manualCandidateJob);
      }
      setMessage("Candidate added successfully against this job.");
      closeManualCandidateModal();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to add candidate.");
    } finally {
      setIsSavingCandidate(false);
    }
  }

  async function updateApplicationStage(
    applicationId: string,
    stage: JobApplicationStage,
    stageNote: string,
    stageDate: string,
    joinedDetails?: {
      finalCtc?: string;
      dateOfJoining?: string;
    }
  ): Promise<boolean> {
    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return false;
    }

    setIsUpdatingStageId(applicationId);
    setError("");

    try {
      const response = await fetch(`/api/admin/jobs/applications/${applicationId}/stage`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stage, stageNote, stageDate, ...joinedDetails }),
      });

      const result = (await response.json()) as JobApplication & { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to update application stage.");
      }

      if ("approvalPending" in result && (result as { approvalPending?: boolean }).approvalPending) {
        setMessage(result.message || "Stage override request submitted for approval.");
        return true;
      }

      setApplications((current) =>
        current.map((application) =>
          application.id === applicationId
            ? {
                ...application,
                stage: result.stage,
                stageNote: result.stageNote,
                stageDate: result.stageDate,
                stageUpdatedAt: result.stageUpdatedAt,
              }
            : application
        )
      );
      return true;
    } catch (stageError) {
      setError(
        stageError instanceof Error ? stageError.message : "Unable to update application stage."
      );
      return false;
    } finally {
      setIsUpdatingStageId("");
    }
  }

  function downloadApplicationsExcel() {
    if (!applicationsJob || applications.length === 0) {
      return;
    }

    const shortlistedApplications = applications.filter(
      (application) => (application.stage ?? "applied") === "shortlisted"
    );

    if (shortlistedApplications.length === 0) {
      setError("No shortlisted candidates are available to download for this job.");
      return;
    }

    const downloadedDate = formatExportDate(new Date().toISOString());
    const tableRows = shortlistedApplications
      .map(
        (application, index) => `
          <tr>
            <td>${escapeHtml(String(index + 1))}</td>
            <td>${escapeHtml(downloadedDate)}</td>
            <td>${escapeHtml(sanitizeExportCell(application.jobTitle || applicationsJob.title))}</td>
            <td>${escapeHtml(sanitizeExportCell(application.candidateName))}</td>
            <td>${escapeHtml(sanitizeExportCell(application.candidatePhone))}</td>
            <td>${escapeHtml(sanitizeExportCell(application.candidateEmail))}</td>
            <td>${escapeHtml(sanitizeExportCell(application.currentCompany))}</td>
            <td>${escapeHtml(sanitizeExportCell(application.experience))}</td>
            <td>${escapeHtml(sanitizeExportCell(application.currentCtc))}</td>
            <td>${escapeHtml(sanitizeExportCell(application.expectedCtc))}</td>
            <td>${escapeHtml("Shortlisted")}</td>
            <td>${escapeHtml(sanitizeExportCell(application.currentLocation || application.preferredLocation))}</td>
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
    link.download = `${applicationsJob.jobCode || applicationsJob.slug}-applications.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {!roleAccess.modules.jobs ? (
        <section className="accent-card p-8">
          <p className="eyebrow">Restricted</p>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
            Jobs module is hidden for this login from CRM settings.
          </h2>
          <p className="muted-copy mt-3 text-base leading-7">
            Enable the Jobs module for this role in Settings to restore access.
          </p>
        </section>
      ) : null}
      {roleAccess.modules.jobs && viewMode !== "existing" && canUseJobForms ? (
      <form
        id="new-job"
        ref={formRef}
        className="accent-card scroll-mt-28 p-7"
        onSubmit={handleSubmit}
      >
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
      ) : null}

      {roleAccess.modules.jobs && viewMode !== "new" ? (
      <section id="existing-jobs" className="accent-card scroll-mt-28 p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Existing Jobs</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
              {canManageJobs ? "Review published roles and drafts." : "Review assigned jobs."}
            </h2>
            <p className="muted-copy mt-4 text-base leading-7">
              {canManageJobs
                ? `Signed in as ${adminEmail || "Railway admin"}. Use edit to load a role into the form above.`
                : "Showing only the jobs assigned to your login."}
            </p>
          </div>
          <div className="w-full max-w-5xl lg:sticky lg:top-24">
            {canManageJobs ? (
              <>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto_auto] xl:items-end">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Filter by Recruiter
                    </span>
                    <select
                      value={recruiterFilter}
                      onChange={(event) => setRecruiterFilter(event.target.value)}
                      className={fieldClassName}
                    >
                      <option value="all">All recruiters</option>
                      <option value="unassigned">Unassigned jobs</option>
                      {employees
                        .filter((employee) => employee.status === "active")
                        .map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.fullName}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Filter by Client
                    </span>
                    <select
                      value={clientFilter}
                      onChange={(event) => setClientFilter(event.target.value)}
                      className={fieldClassName}
                    >
                      <option value="all">All clients</option>
                      <option value="unassigned">Unassigned clients</option>
                      {recruiterClientOptions.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {roleAccess.modules.reports && roleAccess.fields["reports.download"] ? (
                    <button
                      type="button"
                      onClick={downloadJobsCurrentView}
                      disabled={filteredJobs.length === 0}
                      className="h-[50px] rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Export Current View
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void saveCurrentJobsView()}
                    className="h-[50px] rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                  >
                    Save Current View
                  </button>
                </div>
              </>
            ) : (
              <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto_auto] md:items-end">
                <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(8,96,108,0.04)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)]">
                  Assigned jobs only
                </div>
                {roleAccess.modules.reports && roleAccess.fields["reports.download"] ? (
                  <button
                    type="button"
                    onClick={downloadJobsCurrentView}
                    disabled={filteredJobs.length === 0}
                    className="h-[50px] rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Export Current View
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void saveCurrentJobsView()}
                    className="h-[50px] rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                  >
                    Save Current View
                  </button>
              </div>
            )}
          </div>
        </div>
        {viewMessage ? <p className="mt-4 text-sm font-medium text-[var(--color-dark)]">{viewMessage}</p> : null}

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading jobs...</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {[
                      "Job",
                      "Client",
                      "Recruiter",
                      "Location",
                      "Positions",
                      "Applications",
                      "Matching",
                      "Status",
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
                  {paginatedJobs.map((job, index) => {
                    const shouldOpenUp = index >= paginatedJobs.length - 2;

                    return (
                    <tr
                      key={job.id}
                      className={
                        index === filteredJobs.length - 1
                          ? "align-top"
                          : "align-top border-b border-[var(--color-line)]"
                      }
                    >
                      <td className="w-[260px] px-4 py-4 align-top">
                        <p className="whitespace-normal break-words font-semibold leading-6 text-[var(--color-ink)]">
                          {job.title}
                        </p>
                        <p className="mt-1 whitespace-normal break-words text-sm text-[var(--color-muted)]">
                          {job.sector}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-accent-strong)]">
                          <AdminJobIdTrigger jobId={job.id} jobCode={job.jobCode} />
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {job.clientName || "Not assigned"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {job.recruiterName || "Unassigned"}
                      </td>
                      <td className="w-[220px] px-4 py-4 align-top text-sm text-[var(--color-muted)]">
                        <p className="whitespace-normal break-words leading-6">{job.location}</p>
                        <p className="mt-1 whitespace-normal break-words">{job.experience}</p>
                        {job.lastDateToApply ? (
                          <p className="mt-1 text-xs">
                            Close by {new Date(job.lastDateToApply).toLocaleDateString("en-IN")}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <span className="font-semibold text-[var(--color-ink)]">
                          {job.positionsCount ?? 1}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <button
                          type="button"
                          onClick={() => openApplications(job)}
                          className="font-semibold text-[var(--color-accent-strong)] transition hover:text-[var(--color-dark)]"
                        >
                          {job.applicationsCount}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <a
                          href={`/admin/jobs/${job.id}`}
                          className="font-semibold text-[var(--color-dark)] transition hover:text-[var(--color-accent-strong)]"
                        >
                          {matchingCandidateCounts.get(job.id) ?? 0}
                        </a>
                        <p className="mt-1 text-xs">candidate matches</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
                          {job.isHidden ? "hidden" : job.status}
                        </span>
                        <p
                          className={`mt-2 text-xs font-semibold ${
                            isLiveOnWebsite(job)
                              ? "text-emerald-700"
                              : "text-[var(--color-accent-strong)]"
                          }`}
                        >
                          {isLiveOnWebsite(job) ? "Live on website" : "Not live"}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="mb-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => sendShortlistedProfilesToClient(job)}
                            className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                          >
                            Send Shortlist
                          </button>
                        </div>
                        <TableActionMenu
                          label={`Open actions for ${job.title}`}
                          isOpen={actionMenuJobId === job.id}
                          onToggle={() =>
                            setActionMenuJobId((current) => (current === job.id ? "" : job.id))
                          }
                          onClose={() => setActionMenuJobId("")}
                          openUp={shouldOpenUp}
                          items={[
                            {
                              label: "Open Job Page",
                              href: `/admin/jobs/${job.id}`,
                              tone: "accent",
                            },
                            {
                              label: "Edit",
                              onClick: () => populateForEdit(job),
                            },
                            ...(canAddCandidates
                              ? [
                                  {
                                    label: "Add Candidate",
                                    onClick: () => openManualCandidateModal(job),
                                    tone: "accent" as const,
                                  },
                                ]
                              : []),
                            {
                              label: "Submission History",
                              onClick: () => setSubmissionHistoryJob(job),
                            },
                            ...(canToggleJobVisibility
                              ? [
                                  ...(job.status === "draft"
                                    ? [
                                        {
                                          label: "Make Live",
                                          onClick: () => {
                                            void handleMakeJobLive(job);
                                          },
                                          tone: "accent" as const,
                                        },
                                      ]
                                    : []),
                                  {
                                    label: job.isHidden ? "Unhide" : "Hide",
                                    onClick: () => {
                                      void handleVisibilityToggle(job);
                                    },
                                    tone: "danger" as const,
                                  },
                                ]
                              : []),
                            ...(job.slug && isLiveOnWebsite(job)
                              ? [
                                  {
                                    label: "View",
                                    href: `/jobs/${job.slug}`,
                                    external: true,
                                    tone: "accent" as const,
                                  },
                                ]
                              : []),
                            ...(isSuperAdmin
                              ? [
                                  {
                                    label: "Delete Job",
                                    onClick: () => {
                                      void handleDeleteJob(job);
                                    },
                                    tone: "danger" as const,
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {!isLoading && filteredJobs.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">
            {canManageJobs
              ? "No jobs matched the selected recruiter filter."
              : "No assigned jobs are available for this login yet. If jobs were just assigned, refresh after backend sync."}
          </p>
        ) : null}
        {!isLoading && filteredJobs.length > jobsPageSize ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="muted-copy text-sm">
              Showing {(jobsPage - 1) * jobsPageSize + 1}-
              {Math.min(jobsPage * jobsPageSize, filteredJobs.length)} of {filteredJobs.length} jobs
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setJobsPage((current) => Math.max(1, current - 1))}
                disabled={jobsPage === 1}
                className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setJobsPage((current) => Math.min(jobsPageCount, current + 1))}
                disabled={jobsPage === jobsPageCount}
                className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}

      {isEditing ? (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-950/55 p-3 sm:p-4 lg:items-center">
          <div className="my-3 flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.8rem] border border-[var(--color-line)] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:my-4 sm:max-h-[calc(100vh-2rem)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-line)] px-4 py-5 sm:px-7">
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

            <form className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7" onSubmit={handleSubmit}>
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
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-4 lg:items-center">
          <div className="my-3 flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[1.8rem] border border-[var(--color-line)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] sm:my-4 sm:max-h-[calc(100vh-2rem)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-line)] px-4 py-5 sm:px-6">
              <div>
                <p className="eyebrow">Applied Candidates</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {applicationsJob.title}
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  Job ID{" "}
                  <AdminJobIdTrigger
                    jobId={applicationsJob.id}
                    jobCode={applicationsJob.jobCode}
                    fallbackLabel="Pending"
                  />{" "}
                  | {applicationsJob.applicationsCount} applications
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

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              {isApplicationsLoading ? (
                <p className="muted-copy text-sm">Loading applied candidates...</p>
              ) : applications.length === 0 ? (
                <p className="muted-copy text-sm">No candidate details captured for this job yet.</p>
              ) : (
                <div>
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openManualCandidateModal(applicationsJob)}
                        disabled={!canAddCandidates}
                        className="rounded-xl border border-[rgba(8,96,108,0.18)] px-4 py-2 text-sm font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
                      >
                        Add Candidate
                      </button>
                      <button
                        type="button"
                        onClick={downloadApplicationsExcel}
                        className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                      >
                        Download Excel
                      </button>
                    </div>
                    <label className="block w-full lg:max-w-sm">
                      <span className="sr-only">Search candidates</span>
                      <input
                        className={fieldClassName}
                        placeholder="Search candidate, mail ID, phone"
                        value={applicationsSearch}
                        onChange={(event) => setApplicationsSearch(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="overflow-auto rounded-2xl border border-[var(--color-line)]">
                    <table className="w-full min-w-[980px] border-collapse bg-[rgba(255,252,247,0.7)]">
                      <thead>
                        <tr className="bg-[rgba(8,96,108,0.06)] text-left">
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            Candidate Name
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            Mail ID
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            Source
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            Stage
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            Remarks
                          </th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            Applied Date
                          </th>
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
                            <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                              <button
                                type="button"
                                onClick={() => setEditingApplication(application)}
                                className="text-left transition hover:text-[var(--color-dark)]"
                              >
                                {formatPersonName(application.candidateName)}
                              </button>
                            </td>
                            <td className="px-4 py-4 text-sm">
                              {application.candidateEmail ? (
                                <a
                                  href={`mailto:${application.candidateEmail}`}
                                  className="font-medium text-[var(--color-accent-strong)]"
                                >
                                  {application.candidateEmail}
                                </a>
                              ) : (
                                <span className="text-[var(--color-muted)]">No email</span>
                              )}
                              {application.candidatePhone ? (
                                <p className="mt-1 text-[var(--color-muted)]">
                                  {application.candidatePhone}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                              <p>{application.sourceType || "Website"}</p>
                              {application.entryType ? (
                                <p className="mt-1 text-xs uppercase tracking-[0.16em]">
                                  {application.entryType.replaceAll("_", " ")}
                                </p>
                              ) : null}
                              {application.uploadedByEmployeeName ? (
                                <p className="mt-1 text-xs">
                                  Added by {application.uploadedByEmployeeName}
                                </p>
                              ) : null}
                              {application.resumeFileData && application.resumeFileName ? (
                                <a
                                  href={application.resumeFileData}
                                  download={application.resumeFileName}
                                  className="mt-1 block font-medium text-[var(--color-accent-strong)]"
                                >
                                  Resume
                                </a>
                              ) : null}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <select
                                value={application.stage ?? "applied"}
                                disabled={isUpdatingStageId === application.id}
                                onChange={(event) => {
                                  setError("");
                                  setMessage("");
                                  setStageDraft({
                                    application,
                                    stage: event.target.value as JobApplicationStage,
                                    note: application.stageNote ?? "",
                                    date:
                                      application.stageDate ??
                                      new Date().toISOString().slice(0, 10),
                                    finalCtc: application.finalCtc ?? application.currentCtc ?? "",
                                    dateOfJoining:
                                      application.dateOfJoining ??
                                      application.stageDate ??
                                      new Date().toISOString().slice(0, 10),
                                  });
                                }}
                                className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                              >
                                {applicationStages.map((stage) => (
                                  <option key={stage} value={stage}>
                                    {formatStageLabel(stage)}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                              <p>{application.stageNote || "No remark added"}</p>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredApplications.length === 0 ? (
                    <p className="mt-4 text-sm font-medium text-[var(--color-muted)]">
                      No candidates matched the current search.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {manualCandidateJob ? (
        <div className="fixed inset-0 z-[125] flex items-start justify-center overflow-y-auto bg-slate-950/55 p-3 sm:p-4 lg:items-center">
          <div className="my-3 flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[1.5rem] border border-[var(--color-line)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] sm:my-4 sm:max-h-[calc(100vh-2rem)] sm:rounded-[1.8rem]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-line)] px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="eyebrow">Manual Candidate Entry</p>
                <h3 className="mt-3 text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">
                  Add candidate against {manualCandidateJob.title}
                </h3>
                <p className="muted-copy mt-2 max-w-4xl text-sm">
                  Track shortlisted resumes from referral, vendor, WhatsApp, Naukri, LinkedIn, or any outside source directly in the CRM.
                </p>
              </div>
              <button
                type="button"
                onClick={closeManualCandidateModal}
                className="shrink-0 rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleManualCandidateSubmit}>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              {duplicateCandidateMatches.length > 0 ? (
                <div className="mb-4 rounded-2xl border border-[rgba(190,72,26,0.24)] bg-[rgba(190,72,26,0.08)] px-4 py-3 text-sm text-[var(--color-accent-strong)]">
                  Candidate already exists in the CRM with the same
                  {manualCandidateForm.candidateEmail.trim() && manualCandidateForm.candidatePhone.trim()
                    ? " email or phone"
                    : manualCandidateForm.candidateEmail.trim()
                      ? " email"
                      : " phone"}
                  . You can still continue if this application is meant for a different job.
                  <div className="mt-2 text-xs text-[var(--color-ink)]">
                    {duplicateCandidateMatches
                      .slice(0, 3)
                      .map((match) => `${match.candidateName} - ${match.jobTitle || match.jobCode || "Existing application"}`)
                      .join(" | ")}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Candidate Name</span>
                  <input
                    className={fieldClassName}
                    placeholder="Candidate name"
                    value={manualCandidateForm.candidateName}
                    onChange={(event) =>
                      updateManualCandidateField("candidateName", event.target.value)
                    }
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Email</span>
                  <input
                    className={fieldClassName}
                    placeholder="Email"
                    value={manualCandidateForm.candidateEmail}
                    onChange={(event) =>
                      updateManualCandidateField("candidateEmail", event.target.value)
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Phone</span>
                  <input
                    className={fieldClassName}
                    placeholder="Phone"
                    value={manualCandidateForm.candidatePhone}
                    onChange={(event) =>
                      updateManualCandidateField("candidatePhone", event.target.value)
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Gender</span>
                  <select
                    className={fieldClassName}
                    value={manualCandidateForm.gender}
                    onChange={(event) =>
                      updateManualCandidateField("gender", event.target.value)
                    }
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Mother Tongue</span>
                  <input
                    className={fieldClassName}
                    placeholder="Mother tongue"
                    value={manualCandidateForm.motherTongue}
                    onChange={(event) =>
                      updateManualCandidateField("motherTongue", event.target.value)
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Other Languages</span>
                  <input
                    className={fieldClassName}
                    placeholder="Other languages"
                    value={manualCandidateForm.otherLanguages}
                    onChange={(event) =>
                      updateManualCandidateField("otherLanguages", event.target.value)
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Experience</span>
                  <input
                    className={fieldClassName}
                    placeholder="Experience"
                    value={manualCandidateForm.experience}
                    onChange={(event) =>
                      updateManualCandidateField("experience", event.target.value)
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Current Company</span>
                  <input
                    className={fieldClassName}
                    placeholder="Current company"
                    value={manualCandidateForm.currentCompany}
                    onChange={(event) =>
                      updateManualCandidateField("currentCompany", event.target.value)
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Current Location</span>
                  <input
                    className={fieldClassName}
                    placeholder="Current location"
                    value={manualCandidateForm.currentLocation}
                    onChange={(event) =>
                      updateManualCandidateField("currentLocation", event.target.value)
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Current Designation</span>
                  <input
                    className={fieldClassName}
                    placeholder="Current designation"
                    value={manualCandidateForm.currentDesignation}
                    onChange={(event) =>
                      updateManualCandidateField("currentDesignation", event.target.value)
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Preferred Role</span>
                  <input
                    className={fieldClassName}
                    placeholder="Preferred role"
                    value={manualCandidateForm.preferredRole}
                    onChange={(event) =>
                      updateManualCandidateField("preferredRole", event.target.value)
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Preferred Location</span>
                  <input
                    className={fieldClassName}
                    placeholder="Preferred location"
                    value={manualCandidateForm.preferredLocation}
                    onChange={(event) =>
                      updateManualCandidateField("preferredLocation", event.target.value)
                    }
                  />
                </label>
                {roleAccess.fields["candidates.compensation"] ? (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Current CTC</span>
                      <input
                        className={fieldClassName}
                        placeholder="Current CTC"
                        value={manualCandidateForm.currentCtc}
                        onChange={(event) =>
                          updateManualCandidateField("currentCtc", event.target.value)
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Expected CTC</span>
                      <input
                        className={fieldClassName}
                        placeholder="Expected CTC"
                        value={manualCandidateForm.expectedCtc}
                        onChange={(event) =>
                          updateManualCandidateField("expectedCtc", event.target.value)
                        }
                      />
                    </label>
                  </>
                ) : null}
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Preferred Sector</span>
                  <input
                    className={fieldClassName}
                    placeholder="Preferred sector"
                    value={manualCandidateForm.preferredSector}
                    onChange={(event) =>
                      updateManualCandidateField("preferredSector", event.target.value)
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Source</span>
                  <select
                    className={fieldClassName}
                    value={manualCandidateForm.sourceType}
                    onChange={(event) =>
                      updateManualCandidateField("sourceType", event.target.value)
                    }
                  >
                    {manualSourceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Initial Stage</span>
                  <select
                    className={fieldClassName}
                    value={manualCandidateForm.initialStage}
                    onChange={(event) =>
                      updateManualCandidateField(
                        "initialStage",
                        event.target.value as JobApplicationStage
                      )
                    }
                  >
                    {applicationStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {formatStageLabel(stage)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Stage Effective Date</span>
                  <input
                    className={fieldClassName}
                    type="date"
                    value={manualCandidateForm.stageDate}
                    onChange={(event) =>
                      updateManualCandidateField("stageDate", event.target.value)
                    }
                  />
                </label>
                <label className="block sm:col-span-2 xl:col-span-3">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Stage Remarks</span>
                  <textarea
                    className={`${fieldClassName} min-h-[120px] resize-y`}
                    placeholder="Initial stage remarks"
                    value={manualCandidateForm.stageNote}
                    onChange={(event) =>
                      updateManualCandidateField("stageNote", event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-[var(--color-line)] bg-[rgba(8,96,108,0.03)] px-4 py-4">
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Resume Upload
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]">
                    Upload Resume
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="sr-only"
                      onChange={handleResumeUpload}
                    />
                  </label>
                  <span className="text-sm text-[var(--color-muted)]">
                    {manualCandidateForm.resumeFileName || "No file chosen"}
                  </span>
                  <span className="text-xs font-medium text-[var(--color-muted)]">
                    Will be saved as compressed PDF
                  </span>
                </div>
              </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--color-line)] bg-white px-4 py-4 sm:flex-row sm:flex-wrap sm:px-6">
                <button
                  type="submit"
                  disabled={isSavingCandidate}
                  className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingCandidate ? "Saving..." : "Add Candidate"}
                </button>
                <button
                  type="button"
                  onClick={closeManualCandidateModal}
                  className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {submissionHistoryJob ? (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.8rem] border border-[var(--color-line)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-5">
              <div>
                <p className="eyebrow">Client Submission History</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {submissionHistoryJob.clientName || "Unassigned client"}
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  Candidate submissions linked to this client across jobs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubmissionHistoryJob(null)}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>
            <div className="overflow-auto p-6">
              {submissionHistory.length === 0 ? (
                <p className="muted-copy text-sm">No candidate submissions found for this client.</p>
              ) : (
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                      {["Candidate", "Job", "Stage", "Submitted", "Remarks"].map((heading) => (
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
                    {submissionHistory.map((application, index) => (
                      <tr
                        key={application.id}
                        className={
                          index === submissionHistory.length - 1
                            ? "align-top"
                            : "align-top border-b border-[var(--color-line)]"
                        }
                      >
                        <td className="px-4 py-4 text-sm">
                          <p className="font-semibold text-[var(--color-ink)]">
                            {formatPersonName(application.candidateName)}
                          </p>
                          <p className="mt-1 text-[var(--color-muted)]">
                            {application.candidateEmail || application.candidatePhone || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {application.jobTitle || "Untitled job"}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {formatStageLabel((application.stage ?? "applied") as JobApplicationStage)}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {new Date(application.appliedAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {application.stageNote || application.candidateMessage || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
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
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Candidate Stage</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {formatPersonName(stageDraft.application.candidateName)}
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  Save a remark and date for the {stageDraft.stage} stage so reporting stays accurate.
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
                  Current Stage
                </span>
                <input
                  value={formatStageLabel(stageDraft.stage)}
                  readOnly
                  className="w-full rounded-2xl border border-[var(--color-line)] bg-[rgba(8,96,108,0.04)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)]"
                />
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
                  className={fieldClassName}
                />
              </label>
            </div>

            <textarea
              value={stageDraft.note}
              onChange={(event) =>
                setStageDraft((current) =>
                  current ? { ...current, note: event.target.value } : current
                )
              }
              placeholder="Add follow-up remarks for this stage change."
              className={`${fieldClassName} mt-4 min-h-[150px] resize-y`}
            />

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
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isUpdatingStageId === stageDraft.application.id}
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

                  const saved = await updateApplicationStage(
                    stageDraft.application.id,
                    stageDraft.stage,
                    stageDraft.note.trim(),
                    stageDraft.date,
                    stageDraft.stage === "joined"
                      ? {
                          finalCtc: stageDraft.finalCtc.trim(),
                          dateOfJoining: stageDraft.dateOfJoining,
                        }
                      : undefined
                  );
                  if (saved) {
                    setStageDraft(null);
                  }
                }}
                className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isUpdatingStageId === stageDraft.application.id ? "Saving..." : "Save Stage Update"}
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
