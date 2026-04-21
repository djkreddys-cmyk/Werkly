import type { CrmAccessControlMatrix, CrmEmployeeAccessOverride } from "@/lib/access-control";

export type EmployeeStatus = "active" | "inactive";

export type EmployeeEducationEntry = {
  qualification: string;
  specialization?: string;
  institution?: string;
  yearOfPassing?: string;
  gradeOrPercentage?: string;
};

export type EmployeeExperienceEntry = {
  companyName: string;
  designation?: string;
  startDate?: string;
  endDate?: string;
  totalDuration?: string;
  industry?: string;
  responsibilities?: string;
  reasonForLeaving?: string;
};

export type EmployeeRecord = {
  id: string;
  fullName: string;
  email: string;
  employeeCode?: string;
  phone?: string;
  role: string;
  dateOfBirth?: string;
  dateOfJoining?: string;
  educationQualification?: string;
  previousExperience?: string;
  educationDetails?: EmployeeEducationEntry[];
  experienceDetails?: EmployeeExperienceEntry[];
  status: EmployeeStatus;
  mustChangePassword?: boolean;
  inactiveDate?: string;
  inactiveRemarks?: string;
  createdAt: string;
};

export type ClientStatus = "active" | "inactive";
export type ClientOnboardingStatus =
  | "new-lead"
  | "contacted"
  | "proposal-shared"
  | "negotiation"
  | "onboarded"
  | "hold";
export type ClientFollowUpStatus =
  | "pending"
  | "follow-up-due"
  | "in-progress"
  | "awaiting-client"
  | "closed";

export type ClientRecord = {
  id: string;
  companyName: string;
  contactPerson: string;
  contactEmail?: string;
  contactPhone?: string;
  communicationAddress?: string;
  sector?: string;
  branch?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  followUpEmployeeId?: string;
  followUpEmployeeName?: string;
  followUpFromDate?: string;
  followUpToDate?: string;
  followUpAssignmentNote?: string;
  status: ClientStatus;
  onboardingStatus?: ClientOnboardingStatus;
  followUpStatus?: ClientFollowUpStatus;
  nextFollowUpDate?: string;
  lastFollowUpDate?: string;
  onboardingSource?: string;
  notes?: string;
  followUpNotes?: string;
  agreementFileName?: string;
  agreementFileType?: string;
  agreementFileData?: string;
  linkedJobsCount: number;
  linkedJobs: Array<{
    id: string;
    jobCode?: string;
    title: string;
    status: string;
  }>;
  createdAt: string;
};

export type ClientFollowUpHistoryRecord = {
  id: string;
  clientId: string;
  actorEmployeeId?: string;
  actorName?: string;
  actorRole?: string;
  fromStatus?: ClientFollowUpStatus;
  toStatus: ClientFollowUpStatus;
  lastFollowUpDate?: string;
  nextFollowUpDate?: string;
  notes?: string;
  createdAt: string;
};

export type ClientActivityRecord = {
  id: string;
  clientId: string;
  type: "onboarding" | "follow-up" | "transfer-request" | "transfer-reviewed" | "job-linked";
  title: string;
  summary?: string;
  actorName?: string;
  actorRole?: string;
  fromStatus?: string;
  toStatus?: string;
  effectiveDate?: string;
  createdAt: string;
};

export type ClientOnboardingHistoryRecord = {
  id: string;
  clientId: string;
  actorEmployeeId?: string;
  actorName?: string;
  actorRole?: string;
  fromStatus?: ClientOnboardingStatus;
  toStatus: ClientOnboardingStatus;
  notes?: string;
  createdAt: string;
};

export type NotificationLogRecord = {
  id: string;
  title: string;
  message: string;
  category: string;
  severity: "info" | "warning" | "critical";
  targetType: "all" | "admin" | "employee";
  targetEmployeeId?: string;
  deliveryChannels: string[];
  isRead?: boolean;
  createdAt: string;
};

export type AuditLogRecord = {
  id: number;
  actionType: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId?: string;
  actorIdentifier?: string;
  actorName?: string;
  actorRole?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type CrmKpiSettings = {
  recruiterDailyFollowUps: number;
  recruiterDailyApplications: number;
  deliveryDailyFollowUps: number;
  deliveryDailyApplications: number;
  leadershipDailyFollowUps: number;
  leadershipDailyApplications: number;
  enableBrowserNotifications: boolean;
  enableEmailNotifications: boolean;
  enableWhatsappNotifications: boolean;
  accessControl: CrmAccessControlMatrix;
  employeeAccessOverrides: CrmEmployeeAccessOverride[];
};

export type ClientTransferRequestStatus = "pending" | "approved" | "rejected";

export type ClientTransferRequestRecord = {
  id: string;
  clientId: string;
  clientName: string;
  requestedByEmployeeId: string;
  requestedByEmployeeName: string;
  requestedToEmployeeId: string;
  requestedToEmployeeName: string;
  effectiveFromDate?: string;
  reason?: string;
  status: ClientTransferRequestStatus;
  adminNote?: string;
  reviewedByEmployeeId?: string;
  reviewedByEmployeeName?: string;
  reviewedAt?: string;
  createdAt: string;
};

export type EmployeeFormPayload = {
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  dateOfBirth?: string;
  dateOfJoining?: string;
  educationQualification?: string;
  previousExperience?: string;
  educationDetails?: EmployeeEducationEntry[];
  experienceDetails?: EmployeeExperienceEntry[];
  password?: string;
  status: EmployeeStatus;
  inactiveDate?: string;
  inactiveRemarks?: string;
};

export type EmployeePasswordResetPayload = {
  password: string;
  mustChangePassword?: boolean;
};

export type ClientFormPayload = {
  companyName: string;
  contactPerson: string;
  contactEmail?: string;
  contactPhone?: string;
  communicationAddress?: string;
  sector?: string;
  branch?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  status: ClientStatus;
  onboardingStatus?: ClientOnboardingStatus;
  followUpStatus?: ClientFollowUpStatus;
  nextFollowUpDate?: string;
  lastFollowUpDate?: string;
  onboardingSource?: string;
  notes?: string;
  followUpNotes?: string;
  agreementFileName?: string;
  agreementFileType?: string;
  agreementFileData?: string;
};

export type ClientTransferRequestPayload = {
  clientId: string;
  requestedToEmployeeId: string;
  assignmentType?: "ownership-transfer" | "follow-up-support";
  effectiveFromDate?: string;
  effectiveToDate?: string;
  reason?: string;
};

export type ClientTransferReviewPayload = {
  status: Exclude<ClientTransferRequestStatus, "pending">;
  adminNote?: string;
};

function getBaseUrl() {
  return (
    process.env.RAILWAY_API_BASE_URL ||
    process.env.NEXT_PUBLIC_RAILWAY_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
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
    throw new Error(text || `Railway request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getEmployees(token: string) {
  const data = await readJson<{ employees: EmployeeRecord[] } | EmployeeRecord[]>(
    "/admin/employees",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return Array.isArray(data) ? data : data.employees;
}

export async function createEmployee(payload: EmployeeFormPayload, token: string) {
  return readJson<EmployeeRecord>("/admin/employees", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateEmployee(id: string, payload: EmployeeFormPayload, token: string) {
  return readJson<EmployeeRecord>(`/admin/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function resetEmployeePassword(
  id: string,
  payload: EmployeePasswordResetPayload,
  token: string
) {
  return readJson<EmployeeRecord>(`/admin/employees/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getClients(token: string) {
  const data = await readJson<{ clients: ClientRecord[] } | ClientRecord[]>(
    "/admin/clients",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return Array.isArray(data) ? data : data.clients;
}

export async function createClient(payload: ClientFormPayload, token: string) {
  return readJson<ClientRecord>("/admin/clients", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getClientById(id: string, token: string) {
  return readJson<ClientRecord>(`/admin/clients/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateClientFollowUp(
  id: string,
  payload: Pick<
    ClientFormPayload,
    "followUpStatus" | "nextFollowUpDate" | "lastFollowUpDate" | "followUpNotes"
  >,
  token: string
) {
  return readJson<ClientRecord>(`/admin/clients/${id}/follow-up`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getClientFollowUpHistory(id: string, token: string) {
  const data = await readJson<{ history: ClientActivityRecord[] } | ClientActivityRecord[]>(
    `/admin/clients/${id}/history`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return Array.isArray(data) ? data : data.history;
}

export async function getClientFollowUpEntries(id: string, token: string) {
  const data = await readJson<
    { history: ClientFollowUpHistoryRecord[] } | ClientFollowUpHistoryRecord[]
  >(`/admin/clients/${id}/history/follow-ups`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return Array.isArray(data) ? data : data.history;
}

export async function updateClientOnboarding(
  id: string,
  payload: Pick<ClientFormPayload, "onboardingStatus" | "notes">,
  token: string
) {
  return readJson<ClientRecord>(`/admin/clients/${id}/onboarding`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getCrmSettings(token: string) {
  return readJson<CrmKpiSettings>("/admin/settings", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateCrmSettings(payload: Partial<CrmKpiSettings>, token: string) {
  return readJson<CrmKpiSettings>("/admin/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getNotificationLogs(token: string) {
  const data = await readJson<{ notifications: NotificationLogRecord[] } | NotificationLogRecord[]>(
    "/admin/notifications",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return Array.isArray(data) ? data : data.notifications;
}

export async function createNotificationLog(
  payload: Omit<NotificationLogRecord, "id" | "createdAt" | "isRead"> & { isRead?: boolean },
  token: string
) {
  return readJson<NotificationLogRecord>("/admin/notifications", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function markNotificationRead(id: string, token: string) {
  return readJson<NotificationLogRecord>(`/admin/notifications/${id}`, {
    method: "PUT",
    body: JSON.stringify({ isRead: true }),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getAuditLogs(
  token: string,
  params?: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    limit?: number;
  }
) {
  const searchParams = new URLSearchParams();
  if (params?.entityType) {
    searchParams.set("entityType", params.entityType);
  }
  if (params?.entityId) {
    searchParams.set("entityId", params.entityId);
  }
  if (params?.actorId) {
    searchParams.set("actorId", params.actorId);
  }
  if (params?.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const data = await readJson<{ logs: AuditLogRecord[] }>(`/admin/audit-logs${suffix}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.logs;
}

export async function getClientTransferRequests(token: string) {
  const data = await readJson<
    { requests: ClientTransferRequestRecord[] } | ClientTransferRequestRecord[]
  >("/admin/client-transfer-requests", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return Array.isArray(data) ? data : data.requests;
}

export async function createClientTransferRequest(
  payload: ClientTransferRequestPayload,
  token: string
) {
  return readJson<ClientTransferRequestRecord>("/admin/client-transfer-requests", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function reassignClient(
  id: string,
  payload: {
    assignedEmployeeId: string;
    assignmentType?: "ownership-transfer" | "follow-up-support";
    effectiveFromDate?: string;
    effectiveToDate?: string;
    reason?: string;
  },
  token: string
) {
  return readJson<ClientRecord>(`/admin/clients/${id}/reassign`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function reviewClientTransferRequest(
  id: string,
  payload: ClientTransferReviewPayload,
  token: string
) {
  return readJson<ClientTransferRequestRecord>(`/admin/client-transfer-requests/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
