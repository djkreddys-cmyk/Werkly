export type ShiftRecord = {
  id: string;
  name: string;
  code?: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  graceMinutes: number;
  workingDays: string[];
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShiftAssignmentRecord = {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail?: string;
  employeeCode?: string;
  shiftId: string;
  shiftName: string;
  shiftCode?: string;
  shiftStartTime: string;
  shiftEndTime: string;
  breakMinutes: number;
  graceMinutes: number;
  workingDays: string[];
  effectiveFromDate: string;
  effectiveToDate?: string;
  assignmentNote?: string;
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

export async function getShifts(token: string) {
  const data = await readJson<{ shifts: ShiftRecord[] } | ShiftRecord[]>("/admin/shifts", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return Array.isArray(data) ? data : data.shifts;
}

export async function createShift(
  payload: {
    name: string;
    code?: string;
    startTime: string;
    endTime: string;
    breakMinutes?: number;
    graceMinutes?: number;
    workingDays?: string[];
    notes?: string;
    isActive?: boolean;
  },
  token: string
) {
  return readJson<ShiftRecord>("/admin/shifts", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getShiftAssignments(token: string) {
  const data = await readJson<
    { assignments: ShiftAssignmentRecord[] } | ShiftAssignmentRecord[]
  >("/admin/shifts/assignments", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return Array.isArray(data) ? data : data.assignments;
}

export async function createShiftAssignment(
  payload: {
    employeeId: string;
    shiftId: string;
    effectiveFromDate: string;
    effectiveToDate?: string;
    assignmentNote?: string;
  },
  token: string
) {
  return readJson<ShiftAssignmentRecord>("/admin/shifts/assignments", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateShiftAssignment(
  assignmentId: string,
  payload: {
    employeeId: string;
    shiftId: string;
    effectiveFromDate: string;
    effectiveToDate?: string;
    assignmentNote?: string;
  },
  token: string
) {
  return readJson<ShiftAssignmentRecord>(`/admin/shifts/assignments/${assignmentId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
