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
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
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

      if (stageDraft) {
        setStageDraft(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [assignmentDraft, editingApplication, stageDraft, timelineDraft]);

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      fetch("/api/admin/applications", {
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
    ])
      .then(async ([applicationsResponse, employeesResponse, jobsResponse, clientsResponse]) => {
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

        setApplications(applicationsResult.applications ?? []);
        setEmployees(employeesResult.employees ?? []);
        setJobs(jobsResult.jobs ?? []);
        setClients(clientsResult.clients ?? []);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load candidates."
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedQuery = window.localStorage.getItem("werklyCandidatesQuery");
    const savedStage = window.localStorage.getItem("werklyCandidatesStage");
    if (savedQuery) {
      setQuery(savedQuery);
    }
    if (savedStage) {
      setStageFilter(savedStage);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("werklyCandidatesQuery", query);
    window.localStorage.setItem("werklyCandidatesStage", stageFilter);
  }, [query, stageFilter]);

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
    return visibleApplications.filter((application) => {
      const matchesQuery =
        !query ||
        [
          application.candidateName,
          application.candidateEmail,
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

      return matchesQuery && matchesStage;
    });
  }, [query, stageFilter, visibleApplications]);

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

          <div className="grid w-full gap-3 md:grid-cols-2 xl:min-w-[880px] xl:grid-cols-[minmax(260px,1fr)_220px_auto_auto] xl:items-end">
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
              <table className="min-w-full border-collapse">
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
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]"
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
                          {application.resumeFileData && application.resumeFileName ? (
                            <div className="flex flex-col gap-2">
                              <a
                                href={application.resumeFileData}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-[var(--color-accent-strong)] transition hover:text-[var(--color-dark)]"
                              >
                                View Resume
                              </a>
                              <a
                                href={application.resumeFileData}
                                download={application.resumeFileName}
                                className="text-xs font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
                              >
                                Download
                              </a>
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
                      <td className="relative px-4 py-4 align-middle text-right">
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
                            {
                              label: "Open Candidate Page",
                              href: `/admin/candidates/${application.id}`,
                              tone: "accent",
                            },
                            ...(roleAccess.fields["candidates.updateStage"]
                              ? [
                                  {
                                    label: "Update Stage",
                                    onClick: () => openStageEditor(application),
                                  },
                                ]
                              : []),
                            ...(roleAccess.fields["candidates.transfer"]
                              ? [
                                  {
                                    label: "Transfer Candidate",
                                    onClick: () => openAssignmentEditor(application),
                                  },
                                ]
                              : []),
                            {
                              label: "View Timeline",
                              onClick: () => void openTimeline(application),
                              tone: "accent",
                            },
                            ...(roleAccess.fields["candidates.resume"] &&
                            application.resumeFileData &&
                            application.resumeFileName
                              ? [
                                  {
                                    label: "View Resume",
                                    href: application.resumeFileData,
                                    external: true,
                                    tone: "accent" as const,
                                  },
                                  {
                                    label: "Download Resume",
                                    onClick: () => {
                                      const link = document.createElement("a");
                                      link.href = application.resumeFileData || "";
                                      link.download = application.resumeFileName || "resume";
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
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
