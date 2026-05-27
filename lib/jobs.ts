export type JobStatus = "draft" | "open" | "closed";

export type JobSummary = {
  id: string;
  jobCode?: string;
  clientId?: string;
  clientName?: string;
  recruiterId?: string;
  clientAssignedEmployeeId?: string;
  clientFollowUpEmployeeId?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  slug: string;
  title: string;
  location: string;
  sector: string;
  experience: string;
  employmentType: string;
  salary?: string;
  packagePerAnnum?: string;
  positionsCount: number;
  status: JobStatus;
  isHidden?: boolean;
  postedAt: string;
  lastDateToApply?: string;
  applicationsCount: number;
  summary: string;
  skills: string[];
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
};

export type JobDetail = JobSummary & {
  description: string;
  responsibilities: string[];
  requirements: string[];
  packagePerAnnum?: string;
  applyUrl?: string;
};

export type JobApplication = {
  id: string;
  parentApplicationId?: string;
  jobId: string;
  clientId?: string;
  assignedEmployeeId?: string;
  stage?: JobApplicationStage;
  stageNote?: string;
  stageDate?: string;
  stageUpdatedAt?: string;
  jobCode?: string;
  clientName?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  jobLocation?: string;
  sector?: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  gender?: string;
  motherTongue?: string;
  otherLanguages?: string;
  experience?: string;
  currentCompany?: string;
  currentLocation?: string;
  currentDesignation?: string;
  preferredRole?: string;
  currentCtc?: string;
  expectedCtc?: string;
  noticePeriod?: string;
  finalCtc?: string;
  dateOfJoining?: string;
  preferredLocation?: string;
  preferredSector?: string;
  sourceType?: string;
  sourceNote?: string;
  entryType?: string;
  resumeFileName?: string;
  resumeFileType?: string;
  resumeFileData?: string;
  resumeAvailable?: boolean;
  uploadedByEmployeeId?: string;
  uploadedByEmployeeName?: string;
  followUpEmployeeId?: string;
  followUpEmployeeName?: string;
  followUpFromDate?: string;
  followUpToDate?: string;
  followUpAssignmentNote?: string;
  interviewScheduledAt?: string;
  interviewMode?: string;
  interviewPanel?: string;
  interviewReminderAt?: string;
  candidateMessage?: string;
  jobTitle?: string;
  appliedAt: string;
};

export type JobApplicationStageHistory = {
  id: string;
  applicationId: string;
  jobId?: string;
  jobCode?: string;
  jobTitle?: string;
  clientName?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  candidateName: string;
  candidateEmail: string;
  fromStage?: string;
  toStage: JobApplicationStage;
  stageNote?: string;
  stageDate?: string;
  changedAt: string;
};

export type CandidateEnquiry = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  gender?: string;
  motherTongue?: string;
  otherLanguages?: string;
  experience?: string;
  currentCompany?: string;
  currentLocation?: string;
  currentDesignation?: string;
  preferredRole?: string;
  currentCtc?: string;
  expectedCtc?: string;
  preferredLocation?: string;
  preferredSector?: string;
  candidateMessage?: string;
  resumeFileName?: string;
  resumeFileType?: string;
  resumeFileData?: string;
  resumeAvailable?: boolean;
  sourceType?: string;
  createdAt: string;
};

export type ResumeBuilderSubmission = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  gender?: string;
  motherTongue?: string;
  otherLanguages?: string;
  targetRole?: string;
  location?: string;
  yearsExperience?: string;
  skills?: string;
  resumeFileName?: string;
  resumeFileType?: string;
  resumeFileData?: string;
  resumeAvailable?: boolean;
  resumePayload?: unknown;
  sourceType?: string;
  createdAt: string;
  updatedAt: string;
};

export type CandidateEnquiryPayload = {
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  gender?: string;
  motherTongue?: string;
  otherLanguages?: string;
  experience?: string;
  currentCompany?: string;
  currentLocation?: string;
  currentDesignation?: string;
  preferredRole?: string;
  currentCtc?: string;
  expectedCtc?: string;
  preferredLocation?: string;
  preferredSector?: string;
  candidateMessage?: string;
  resumeFileName?: string;
  resumeFileType?: string;
  resumeFileData?: string;
  sourceType?: string;
};

export type JobApplicationStage =
  | "applied"
  | "shortlisted"
  | "interview"
  | "offered"
  | "joined"
  | "screen-rejection"
  | "rejected";

export type JobsResponse = {
  jobs: JobSummary[];
};

export type AdminLoginResponse = {
  token: string;
  sessionId?: string;
  requiresPasswordChange: boolean;
  user: {
    type: "admin" | "employee";
    name: string;
    email?: string;
    role: "super-admin" | string;
    id?: string;
    employeeCode?: string;
  };
};

export type ForgotPasswordRequestResponse = {
  requestId: string;
  maskedEmail: string;
  message?: string;
};

export type ForgotPasswordVerifyResponse = {
  resetToken: string;
  employee?: {
    employeeCode?: string;
    name?: string;
    email?: string;
  };
  message?: string;
};

type AuthClientContext = {
  clientTime?: string;
  clientTimezone?: string;
  clientUtcOffsetMinutes?: number;
};

export type JobApplicationsResponse = {
  applications: JobApplication[];
};

export type AdminApplicationsResponse = {
  applications: JobApplication[];
};

export type AdminApplicationHistoryResponse = {
  history: JobApplicationStageHistory[];
};

export type CandidateEnquiriesResponse = {
  enquiries: CandidateEnquiry[];
};

export type ResumeBuilderSubmissionsResponse = {
  submissions: ResumeBuilderSubmission[];
};

export type JobFormPayload = {
  title: string;
  slug: string;
  clientId?: string;
  recruiterId?: string;
  location: string;
  sector: string;
  experience: string;
  employmentType: string;
  salary?: string;
  packagePerAnnum?: string;
  positionsCount?: number;
  status: JobStatus;
  isHidden?: boolean;
  postedAt?: string;
  lastDateToApply?: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
};

export type ManualJobApplicationPayload = {
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  gender?: string;
  motherTongue?: string;
  otherLanguages?: string;
  experience?: string;
  currentCompany?: string;
  currentLocation?: string;
  currentDesignation?: string;
  preferredRole?: string;
  currentCtc?: string;
  expectedCtc?: string;
  noticePeriod?: string;
  preferredLocation?: string;
  preferredSector?: string;
  candidateMessage?: string;
  sourceType: string;
  sourceNote?: string;
  initialStage: JobApplicationStage;
  stageNote?: string;
  stageDate?: string;
  resumeFileName?: string;
  resumeFileType?: string;
  resumeFileData?: string;
  jobTitle?: string;
};

export type JobApplicationAssignmentPayload = {
  assignedEmployeeId: string;
  assignmentType: "ownership-transfer" | "follow-up-support";
  effectiveFromDate?: string;
  effectiveToDate?: string;
  note?: string;
};

export type JobApplicationUpdatePayload = {
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  gender?: string;
  motherTongue?: string;
  otherLanguages?: string;
  experience?: string;
  currentCompany?: string;
  currentLocation?: string;
  currentDesignation?: string;
  preferredRole?: string;
  currentCtc?: string;
  expectedCtc?: string;
  noticePeriod?: string;
  preferredLocation?: string;
  preferredSector?: string;
  sourceType?: string;
  sourceNote?: string;
  candidateMessage?: string;
  resumeFileName?: string;
  resumeFileType?: string;
  resumeFileData?: string;
  interviewScheduledAt?: string;
  interviewMode?: string;
  interviewPanel?: string;
  interviewReminderAt?: string;
};

const demoJobs: JobDetail[] = [
  {
    id: "job-erp-manager",
    jobCode: "26040001",
    slug: "erp-manager-hyderabad",
    title: "ERP Manager",
    location: "Hyderabad",
    sector: "Education Technology",
    experience: "8+ years",
    employmentType: "Full Time",
    salary: "As per experience",
    packagePerAnnum: "12 - 18 LPA",
    positionsCount: 1,
    status: "open",
    isHidden: false,
    postedAt: "2026-04-03",
    lastDateToApply: "2026-04-30",
    applicationsCount: 0,
    summary:
      "Lead ERP operations, stakeholder alignment, and rollout discipline for a growing education-focused organization.",
    description:
      "We are looking for an ERP Manager who can align business users, delivery teams, and leadership priorities while keeping execution structured and measurable.",
    skills: ["ERP", "Stakeholder Management", "Operations", "MIS Reporting"],
    responsibilities: [
      "Own ERP delivery priorities across business teams and partner stakeholders.",
      "Drive implementation follow-ups, issue resolution, and user adoption planning.",
      "Coordinate with leadership on reporting, process improvements, and execution timelines.",
    ],
    requirements: [
      "8+ years of experience in ERP or enterprise operations roles.",
      "Strong communication and stakeholder management capability.",
      "Experience in process-driven delivery environments.",
    ],
  },
  {
    id: "job-pharma-qc",
    jobCode: "26040002",
    slug: "quality-control-specialist-vijayawada",
    title: "Quality Control Specialist",
    location: "Vijayawada",
    sector: "Pharma & Life Sciences",
    experience: "4+ years",
    employmentType: "Full Time",
    salary: "Competitive",
    packagePerAnnum: "6 - 9 LPA",
    positionsCount: 2,
    status: "open",
    isHidden: false,
    postedAt: "2026-04-01",
    lastDateToApply: "2026-04-24",
    applicationsCount: 0,
    summary:
      "Support regulated quality processes, documentation discipline, and batch-release readiness in a pharma setting.",
    description:
      "This role is ideal for professionals with hands-on quality control experience who can support documentation accuracy and compliance workflows.",
    skills: ["QC", "Documentation", "GMP", "Compliance"],
    responsibilities: [
      "Review quality records and support documentation discipline.",
      "Assist with sample analysis, batch support, and release coordination.",
      "Work with manufacturing and QA teams on issue escalation and closure.",
    ],
    requirements: [
      "4+ years of experience in pharma quality control.",
      "Good understanding of GMP and documentation systems.",
      "Ability to work in structured process environments.",
    ],
  },
  {
    id: "job-construction-sales",
    jobCode: "26030001",
    slug: "regional-sales-manager-building-materials",
    title: "Regional Sales Manager",
    location: "Hyderabad / AP",
    sector: "Building Materials & Construction Systems",
    experience: "6+ years",
    employmentType: "Full Time",
    salary: "Incentive based",
    packagePerAnnum: "10 - 14 LPA",
    positionsCount: 3,
    status: "open",
    isHidden: false,
    postedAt: "2026-03-29",
    lastDateToApply: "2026-04-20",
    applicationsCount: 0,
    summary:
      "Drive dealer and project sales growth across building materials, channel development, and regional expansion.",
    description:
      "We are hiring a Regional Sales Manager to own business growth across channel partners, projects, and sales planning within the building materials sector.",
    skills: ["Channel Sales", "Project Sales", "Dealer Network", "Revenue Growth"],
    responsibilities: [
      "Manage dealer and project sales relationships across assigned regions.",
      "Drive revenue growth through channel expansion and account planning.",
      "Collaborate with leadership on forecasts, conversion, and market strategy.",
    ],
    requirements: [
      "6+ years of sales experience in building materials or allied industries.",
      "Strong regional network and business development capability.",
      "Comfortable with structured reporting and target ownership.",
    ],
  },
];

function getBaseUrl() {
  return (
    process.env.RAILWAY_API_BASE_URL ||
    process.env.NEXT_PUBLIC_RAILWAY_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
}

function canUseDemoFallback() {
  return process.env.NODE_ENV !== "production" && !getBaseUrl();
}

function normalizeJobSummary(job: Partial<JobDetail>): JobSummary {
  return {
    id: String(job.id ?? ""),
    jobCode: job.jobCode ? String(job.jobCode) : undefined,
    clientId: job.clientId ? String(job.clientId) : undefined,
    clientName: job.clientName ? String(job.clientName) : undefined,
    recruiterId: job.recruiterId ? String(job.recruiterId) : undefined,
    recruiterName: job.recruiterName ? String(job.recruiterName) : undefined,
    recruiterEmail: job.recruiterEmail ? String(job.recruiterEmail) : undefined,
    slug: String(job.slug ?? ""),
    title: String(job.title ?? ""),
    location: String(job.location ?? ""),
    sector: String(job.sector ?? ""),
    experience: String(job.experience ?? ""),
    employmentType: String(job.employmentType ?? "Full Time"),
    salary: job.salary ? String(job.salary) : undefined,
    packagePerAnnum: job.packagePerAnnum ? String(job.packagePerAnnum) : undefined,
    positionsCount:
      typeof job.positionsCount === "number"
        ? Math.max(1, job.positionsCount)
        : Math.max(1, Number(job.positionsCount ?? 1) || 1),
    status: (job.status as JobStatus) ?? "open",
    isHidden: Boolean(job.isHidden),
    postedAt: String(job.postedAt ?? ""),
    lastDateToApply: job.lastDateToApply ? String(job.lastDateToApply) : undefined,
    applicationsCount:
      typeof job.applicationsCount === "number"
        ? job.applicationsCount
        : Number(job.applicationsCount ?? 0),
    summary: String(job.summary ?? ""),
    skills: Array.isArray(job.skills) ? job.skills.map(String) : [],
    description: job.description ? String(job.description) : undefined,
    responsibilities: Array.isArray(job.responsibilities)
      ? job.responsibilities.map(String)
      : [],
    requirements: Array.isArray(job.requirements)
      ? job.requirements.map(String)
      : [],
  };
}

function normalizeJobDetail(job: Partial<JobDetail>): JobDetail {
  return {
    ...normalizeJobSummary(job),
    description: String(job.description ?? ""),
    responsibilities: Array.isArray(job.responsibilities)
      ? job.responsibilities.map(String)
      : [],
    requirements: Array.isArray(job.requirements) ? job.requirements.map(String) : [],
    packagePerAnnum: job.packagePerAnnum ? String(job.packagePerAnnum) : undefined,
  };
}

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error("Railway API base URL is not configured.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Railway request failed with status ${response.status}`;

    try {
      const parsed = JSON.parse(text) as { message?: string; error?: { message?: string } };
      message =
        parsed.message ||
        parsed.error?.message ||
        message;
    } catch {
      // Keep original text when response is not JSON.
    }

    if (message.includes("Application not found")) {
      message =
        "Railway backend is not responding on the configured domain. Redeploy the backend service and verify the Railway public domain in Vercel.";
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function getJobs(): Promise<JobSummary[]> {
  if (canUseDemoFallback()) {
    return demoJobs.map(normalizeJobSummary);
  }

  const data = await readJson<JobsResponse | JobSummary[]>("/jobs");
  const jobs = Array.isArray(data) ? data : data.jobs;
  return jobs.map(normalizeJobSummary);
}

export async function getAdminJobs(token: string): Promise<JobSummary[]> {
  const data = await readJson<JobsResponse | JobSummary[]>("/admin/jobs", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const jobs = Array.isArray(data) ? data : data.jobs;
  return jobs.map(normalizeJobSummary);
}

export async function getAdminJobById(id: string, token: string): Promise<JobDetail | null> {
  const job = await readJson<JobDetail>(`/admin/jobs/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return normalizeJobDetail(job);
}

export async function getJobBySlug(slug: string): Promise<JobDetail | null> {
  if (canUseDemoFallback()) {
    return demoJobs.find((job) => job.slug === slug) ?? null;
  }

  const job = await readJson<JobDetail>(`/jobs/${slug}`);
  return normalizeJobDetail(job);
}

export async function adminLogin(
  identifier: string,
  password: string,
  clientContext?: AuthClientContext
) {
  return readJson<AdminLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      identifier,
      password,
      clientTime: clientContext?.clientTime,
      clientTimezone: clientContext?.clientTimezone,
      clientUtcOffsetMinutes: clientContext?.clientUtcOffsetMinutes,
    }),
  });
}

export async function changeEmployeePassword(newPassword: string, token: string) {
  return readJson<AdminLoginResponse>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ newPassword }),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function requestForgotPasswordOtp(identifier: string, dateOfBirth: string) {
  return readJson<ForgotPasswordRequestResponse>("/auth/forgot-password/request", {
    method: "POST",
    body: JSON.stringify({ identifier, dateOfBirth }),
  });
}

export async function verifyForgotPasswordOtp(
  requestId: string,
  identifier: string,
  dateOfBirth: string,
  otp: string
) {
  return readJson<ForgotPasswordVerifyResponse>("/auth/forgot-password/verify", {
    method: "POST",
    body: JSON.stringify({ requestId, identifier, dateOfBirth, otp }),
  });
}

export async function resetForgotPassword(resetToken: string, newPassword: string) {
  return readJson<{ success: boolean; message?: string }>("/auth/forgot-password/reset", {
    method: "POST",
    body: JSON.stringify({ resetToken, newPassword }),
  });
}

export async function adminLogout(token: string, clientContext?: AuthClientContext) {
  return readJson<{ success: boolean }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({
      clientTime: clientContext?.clientTime,
      clientTimezone: clientContext?.clientTimezone,
      clientUtcOffsetMinutes: clientContext?.clientUtcOffsetMinutes,
    }),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function createJob(payload: JobFormPayload, token: string) {
  return readJson<JobDetail>("/admin/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateJob(id: string, payload: JobFormPayload, token: string) {
  return readJson<JobDetail>(`/admin/jobs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function mergeJobs(
  primaryJobCode: string,
  duplicateJobCode: string,
  token: string
) {
  return readJson<{
    success: boolean;
    job: JobDetail;
    mergedFrom: {
      id: string;
      jobCode: string;
      title: string;
    };
    movedApplicationsCount: number;
  }>("/admin/jobs/merge", {
    method: "POST",
    body: JSON.stringify({ primaryJobCode, duplicateJobCode }),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getJobApplications(
  id: string,
  token: string,
  options?: { slim?: boolean }
) {
  const data = await readJson<JobApplicationsResponse | JobApplication[]>(
    `/admin/jobs/${id}/applications${options?.slim ? "?slim=1" : ""}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return Array.isArray(data) ? data : data.applications;
}

export async function createManualJobApplication(
  jobId: string,
  payload: ManualJobApplicationPayload,
  token: string
) {
  return readJson<JobApplication>(`/admin/jobs/${jobId}/applications`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function assignCandidateApplicationToJob(
  applicationId: string,
  payload: {
    jobId: string;
    initialStage?: JobApplicationStage;
    stageNote?: string;
    stageDate?: string;
  },
  token: string
) {
  return readJson<JobApplication>(`/admin/jobs/applications/${applicationId}/assign-job`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getAdminApplications(token: string, options?: { slim?: boolean }) {
  const data = await readJson<AdminApplicationsResponse | JobApplication[]>(
    `/admin/applications${options?.slim ? "?slim=1" : ""}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return Array.isArray(data) ? data : data.applications;
}

export async function getAdminApplicationHistory(token: string) {
  const data = await readJson<AdminApplicationHistoryResponse | JobApplicationStageHistory[]>(
    "/admin/applications/history",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return Array.isArray(data) ? data : data.history;
}

export async function getAdminCandidateEnquiries(token: string, options?: { slim?: boolean }) {
  const data = await readJson<CandidateEnquiriesResponse | CandidateEnquiry[]>(
    `/admin/candidate-enquiries${options?.slim ? "?slim=1" : ""}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return Array.isArray(data) ? data : data.enquiries;
}

export async function createAdminCandidateEnquiry(
  payload: CandidateEnquiryPayload,
  token: string
) {
  return readJson<CandidateEnquiry>("/admin/candidate-enquiries", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getResumeBuilderSubmissions(token: string, options?: { slim?: boolean }) {
  const data = await readJson<ResumeBuilderSubmissionsResponse | ResumeBuilderSubmission[]>(
    `/admin/resume-builder-submissions${options?.slim ? "?slim=1" : ""}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return Array.isArray(data) ? data : data.submissions;
}

export async function createResumeBuilderSubmission(payload: {
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  gender?: string;
  motherTongue?: string;
  otherLanguages?: string;
  targetRole?: string;
  location?: string;
  yearsExperience?: string;
  skills?: string;
  resumeFileName?: string;
  resumeFileType?: string;
  resumeFileData?: string;
  resumePayload?: unknown;
}) {
  return readJson<ResumeBuilderSubmission>("/resume-builder-submissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateJobApplicationStage(
  id: string,
  stage: JobApplicationStage,
  stageNote: string,
  stageDate: string,
  token: string,
  interviewSchedule?: {
    interviewScheduledAt?: string;
    interviewMode?: string;
    interviewPanel?: string;
    interviewReminderAt?: string;
    finalCtc?: string;
    dateOfJoining?: string;
  }
) {
  return readJson<JobApplication>(`/admin/jobs/applications/${id}/stage`, {
    method: "PUT",
    body: JSON.stringify({ stage, stageNote, stageDate, ...interviewSchedule }),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function assignJobApplication(
  id: string,
  payload: JobApplicationAssignmentPayload,
  token: string
) {
  return readJson<JobApplication>(`/admin/jobs/applications/${id}/assignment`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateJobApplicationDetails(
  id: string,
  payload: JobApplicationUpdatePayload,
  token: string
) {
  return readJson<JobApplication>(`/admin/jobs/applications/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function deleteJob(id: string, token: string) {
  return readJson<{ success: boolean }>(`/admin/jobs/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function deleteJobApplication(id: string, token: string) {
  return readJson<{ success: boolean }>(`/admin/applications/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function splitMultiline(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
