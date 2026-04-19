export type EmployeeStatus = "active" | "inactive";

export type EmployeeRecord = {
  id: string;
  fullName: string;
  email: string;
  employeeCode?: string;
  phone?: string;
  role: string;
  status: EmployeeStatus;
  mustChangePassword?: boolean;
  inactiveDate?: string;
  inactiveRemarks?: string;
  createdAt: string;
};

export type ClientStatus = "active" | "inactive";

export type ClientRecord = {
  id: string;
  companyName: string;
  contactPerson: string;
  contactEmail?: string;
  contactPhone?: string;
  sector?: string;
  branch?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  status: ClientStatus;
  notes?: string;
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

export type EmployeeFormPayload = {
  fullName: string;
  email: string;
  phone?: string;
  role: string;
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
  sector?: string;
  branch?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  status: ClientStatus;
  notes?: string;
  agreementFileName?: string;
  agreementFileType?: string;
  agreementFileData?: string;
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
