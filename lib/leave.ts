export type LeaveTypeRecord = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
};

export type LeaveAssignmentRecord = {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail?: string;
  employeeCode?: string;
  leaveTypeId: string;
  leaveTypeName: string;
  allocatedDays: number;
  approvedDays: number;
  pendingDays: number;
  remainingDays: number;
  leaveYearStart?: string;
  leaveYearEnd?: string;
  createdAt: string;
  updatedAt: string;
};

export type LeaveRequestStatus = "pending" | "approved" | "rejected";
export type LeavePortion = "full-day" | "half-day";
export type HalfDaySession = "first-half" | "second-half";

export type LeaveRequestRecord = {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail?: string;
  employeeCode?: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  leavePortion: LeavePortion;
  halfDaySession?: HalfDaySession | null;
  reason: string;
  status: LeaveRequestStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
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

export async function getLeaveTypes(token: string) {
  const data = await readJson<{ leaveTypes: LeaveTypeRecord[] } | LeaveTypeRecord[]>(
    "/admin/leaves/types",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return Array.isArray(data) ? data : data.leaveTypes;
}

export async function createLeaveType(
  payload: { name: string; description?: string; isActive?: boolean },
  token: string
) {
  return readJson<LeaveTypeRecord>("/admin/leaves/types", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getLeaveAssignments(token: string) {
  const data = await readJson<
    { assignments: LeaveAssignmentRecord[] } | LeaveAssignmentRecord[]
  >("/admin/leaves/assignments", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return Array.isArray(data) ? data : data.assignments;
}

export async function assignLeaveBalance(
  payload: { employeeId: string; leaveTypeId: string; allocatedDays: number },
  token: string
) {
  return readJson<LeaveAssignmentRecord>("/admin/leaves/assignments", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getLeaveRequests(token: string) {
  const data = await readJson<{ requests: LeaveRequestRecord[] } | LeaveRequestRecord[]>(
    "/admin/leaves/requests",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return Array.isArray(data) ? data : data.requests;
}

export async function createLeaveRequest(
  payload: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    leavePortion?: LeavePortion;
    halfDaySession?: HalfDaySession;
  },
  token: string
) {
  return readJson<LeaveRequestRecord>("/admin/leaves/requests", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateLeaveRequestStatus(
  id: string,
  payload: {
    status: LeaveRequestStatus;
    adminNote?: string;
    leaveTypeId?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    leavePortion?: LeavePortion;
    halfDaySession?: HalfDaySession;
  },
  token: string
) {
  return readJson<LeaveRequestRecord>(`/admin/leaves/requests/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
