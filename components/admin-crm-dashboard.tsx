"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ClientRecord,
  ClientStatus,
  EmployeeRecord,
  EmployeeStatus,
} from "@/lib/crm";

type EmployeeFormState = {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  status: EmployeeStatus;
  inactiveDate: string;
  inactiveRemarks: string;
};

type ClientFormState = {
  companyName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  sector: string;
  branch: string;
  assignedEmployeeId: string;
  status: ClientStatus;
  notes: string;
  agreementFileName: string;
  agreementFileType: string;
  agreementFileData: string;
};

const emptyEmployeeForm: EmployeeFormState = {
  fullName: "",
  email: "",
  phone: "",
  role: "",
  password: "",
  status: "active",
  inactiveDate: "",
  inactiveRemarks: "",
};

const emptyClientForm: ClientFormState = {
  companyName: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  sector: "",
  branch: "",
  assignedEmployeeId: "",
  status: "active",
  notes: "",
  agreementFileName: "",
  agreementFileType: "",
  agreementFileData: "",
};

const fieldClassName =
  "w-full rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.12)] px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none transition focus:border-[var(--color-accent)] focus:bg-[rgba(255,255,255,0.16)]";

function formatErrorMessage(message: string) {
  try {
    const parsed = JSON.parse(message) as { message?: string };
    if (parsed.message) {
      return parsed.message;
    }
  } catch {
    // Keep the original message when the response is not JSON text.
  }

  if (message.includes("404") || message.includes("Application not found")) {
    return "CRM backend route is not available yet. Redeploy the Railway backend to enable this module.";
  }

  return message;
}

function useAdminCrmData() {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : "";
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function applyCrmData(data: {
    employees: EmployeeRecord[];
    clients: ClientRecord[];
  }) {
    setEmployees(data.employees);
    setClients(data.clients);
  }

  async function loadCrm(activeToken: string) {
    const [employeesResponse, clientsResponse] = await Promise.all([
      fetch("/api/admin/employees", {
        headers: { Authorization: `Bearer ${activeToken}` },
      }),
      fetch("/api/admin/clients", {
        headers: { Authorization: `Bearer ${activeToken}` },
      }),
    ]);

    const employeesResult = (await employeesResponse.json()) as {
      employees?: EmployeeRecord[];
      message?: string;
    };
    const clientsResult = (await clientsResponse.json()) as {
      clients?: ClientRecord[];
      message?: string;
    };

    if (!employeesResponse.ok) {
      throw new Error(employeesResult.message || "Unable to load employees.");
    }

    if (!clientsResponse.ok) {
      throw new Error(clientsResult.message || "Unable to load clients.");
    }

    return {
      employees: employeesResult.employees ?? [],
      clients: clientsResult.clients ?? [],
    };
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    loadCrm(token)
      .then((data) => {
        applyCrmData(data);
      })
      .catch((loadError) => {
        setError(
          formatErrorMessage(
            loadError instanceof Error ? loadError.message : "Unable to load CRM data."
          )
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  return {
    token,
    employees,
    clients,
    isLoading,
    message,
    error,
    setMessage,
    setError,
    refreshCrm: async (activeToken: string) => {
      const data = await loadCrm(activeToken);
      applyCrmData(data);
    },
  };
}

function CrmFeedback({ message, error }: { message: string; error: string }) {
  return (
    <>
      {message ? <p className="mt-5 text-sm font-medium text-emerald-200">{message}</p> : null}
      {error ? <p className="mt-5 text-sm font-medium text-red-200">{error}</p> : null}
    </>
  );
}

function CrmEmployeesList({
  employees,
  onEdit,
  canEdit,
}: {
  employees: EmployeeRecord[];
  onEdit: (employee: EmployeeRecord) => void;
  canEdit: boolean;
}) {
  return (
    <section className="accent-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Employees</p>
          <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
            Current internal users
          </h3>
        </div>
        <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
          {employees.length} users
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {employees.length === 0 ? (
          <p className="muted-copy text-sm">No employee logins have been created yet.</p>
        ) : (
          employees.map((employee) => (
            <article
              key={employee.id}
              className="rounded-[1.3rem] border border-[var(--color-line)] bg-white/92 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-[var(--color-ink)]">
                    {employee.fullName}
                  </h4>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{employee.role}</p>
                </div>
                <span className="rounded-full bg-[rgba(241,166,75,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-strong)]">
                  {employee.status}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-[var(--color-muted)]">
                {employee.employeeCode ? (
                  <p className="font-semibold text-[var(--color-accent-strong)]">
                    Employee Code: {employee.employeeCode}
                  </p>
                ) : null}
                <p>{employee.email}</p>
                {employee.phone ? <p>{employee.phone}</p> : null}
                {employee.status === "inactive" && employee.inactiveDate ? (
                  <p>Inactive Date: {employee.inactiveDate}</p>
                ) : null}
                {employee.status === "inactive" && employee.inactiveRemarks ? (
                  <p>Remarks: {employee.inactiveRemarks}</p>
                ) : null}
              </div>
              {canEdit ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => onEdit(employee)}
                    className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                  >
                    Edit
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function CrmClientsList({ clients }: { clients: ClientRecord[] }) {
  return (
    <section className="accent-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Clients</p>
          <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
            Assigned client accounts
          </h3>
        </div>
        <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
          {clients.length} clients
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {clients.length === 0 ? (
          <p className="muted-copy text-sm">No clients have been onboarded yet.</p>
        ) : (
          clients.map((client) => (
            <article
              key={client.id}
              className="rounded-[1.3rem] border border-[var(--color-line)] bg-white/92 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-[var(--color-ink)]">
                    {client.companyName}
                  </h4>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {client.contactPerson}
                  </p>
                </div>
                <span className="rounded-full bg-[rgba(241,166,75,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-strong)]">
                  {client.status}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-[var(--color-muted)] sm:grid-cols-2">
                {client.contactEmail ? <p>{client.contactEmail}</p> : null}
                {client.contactPhone ? <p>{client.contactPhone}</p> : null}
                {client.sector ? <p>Sector: {client.sector}</p> : null}
                {client.branch ? <p>Branch: {client.branch}</p> : null}
                {client.assignedEmployeeName ? (
                  <p className="sm:col-span-2">Assigned to: {client.assignedEmployeeName}</p>
                ) : null}
                {client.linkedJobsCount ? (
                  <div className="sm:col-span-2">
                    <p className="font-medium text-[var(--color-ink)]">
                      Linked jobs: {client.linkedJobsCount}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {client.linkedJobs.map((job) => (
                        <span
                          key={job.id}
                          className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-dark)]"
                        >
                          {job.jobCode ? `${job.jobCode} - ` : ""}
                          {job.title}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {client.agreementFileData && client.agreementFileName ? (
                  <p className="sm:col-span-2">
                    <a
                      href={client.agreementFileData}
                      download={client.agreementFileName}
                      className="font-medium text-[var(--color-accent-strong)]"
                    >
                      Download signed agreement
                    </a>
                  </p>
                ) : null}
                {client.notes ? <p className="sm:col-span-2">Notes: {client.notes}</p> : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function AdminEmployeesPanel() {
  const {
    token,
    employees,
    isLoading,
    message,
    error,
    setMessage,
    setError,
    refreshCrm,
  } = useAdminCrmData();
  const [authRole] = useState(() =>
    typeof window === "undefined"
      ? "super-admin"
      : window.localStorage.getItem("werklyAuthRole") ?? "super-admin"
  );
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(emptyEmployeeForm);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const isEditingEmployee = Boolean(employeeForm.id);
  const canManageEmployees = authRole === "super-admin";

  function updateEmployeeField(field: keyof EmployeeFormState, value: string) {
    setEmployeeForm((current) => ({ ...current, [field]: value }));
  }

  function loadEmployeeForEdit(employee: EmployeeRecord) {
    setEmployeeForm({
      id: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone ?? "",
      role: employee.role,
      password: "",
      status: employee.status,
      inactiveDate: employee.inactiveDate ?? "",
      inactiveRemarks: employee.inactiveRemarks ?? "",
    });
    setMessage("");
    setError("");
  }

  async function handleEmployeeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    setIsSavingEmployee(true);
    setError("");
    setMessage("");

    if (
      employeeForm.status === "inactive" &&
      (!employeeForm.inactiveDate || !employeeForm.inactiveRemarks.trim())
    ) {
      setError("Inactive date and remarks are required when employee is inactive.");
      setIsSavingEmployee(false);
      return;
    }

    try {
      const endpoint = employeeForm.id
        ? `/api/admin/employees/${employeeForm.id}`
        : "/api/admin/employees";
      const requestConfig = {
        method: employeeForm.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(employeeForm),
      };

      const actualResponse = await fetch(endpoint, requestConfig);

      const result = (await actualResponse.json()) as {
        message?: string;
        employeeCode?: string;
      };
      if (!actualResponse.ok) {
        throw new Error(result.message || "Unable to create employee.");
      }

      await refreshCrm(token);
      setEmployeeForm(emptyEmployeeForm);
      setMessage(
        employeeForm.id
          ? "Employee details updated successfully."
          : `Employee login created successfully.${
              result.employeeCode ? ` Code: ${result.employeeCode}` : ""
            }`
      );
    } catch (saveError) {
      setError(
        formatErrorMessage(
          saveError instanceof Error ? saveError.message : "Unable to create employee."
        )
      );
    } finally {
      setIsSavingEmployee(false);
    }
  }

  return (
    <section className="space-y-6">
      {canManageEmployees ? (
        <div className="rounded-[2rem] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(135deg,rgba(8,96,108,0.88),rgba(11,64,72,0.94))] p-7 text-white shadow-[0_26px_70px_rgba(6,31,36,0.26)]">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(241,166,75,0.92)]">
              Employee Onboarding
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
              Create internal login credentials for your hiring team.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              Add recruiter and employee accounts with their role and starting password.
              Employee login codes are auto-generated as `YYMM` plus a 3-digit running number.
            </p>
          </div>

          <CrmFeedback message={message} error={error} />

          <form
            className="mt-8 rounded-[1.7rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] p-6 backdrop-blur"
            onSubmit={handleEmployeeSubmit}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className={fieldClassName}
                placeholder="Full name"
                value={employeeForm.fullName}
                onChange={(event) => updateEmployeeField("fullName", event.target.value)}
                required
              />
              <input
                className={fieldClassName}
                type="email"
                placeholder="Email"
                value={employeeForm.email}
                onChange={(event) => updateEmployeeField("email", event.target.value)}
                required
              />
              <input
                className={fieldClassName}
                placeholder="Phone"
                value={employeeForm.phone}
                onChange={(event) => updateEmployeeField("phone", event.target.value)}
              />
              <input
                className={fieldClassName}
                placeholder="Role"
                value={employeeForm.role}
                onChange={(event) => updateEmployeeField("role", event.target.value)}
                required
              />
              <input
                className={fieldClassName}
                type="password"
                placeholder={
                  isEditingEmployee ? "New password (optional)" : "Temporary password"
                }
                value={employeeForm.password}
                onChange={(event) => updateEmployeeField("password", event.target.value)}
                required={!isEditingEmployee}
              />
              <select
                className={fieldClassName}
                value={employeeForm.status}
                onChange={(event) => {
                  const nextStatus = event.target.value as EmployeeStatus;
                  setEmployeeForm((current) => ({
                    ...current,
                    status: nextStatus,
                    inactiveDate: nextStatus === "inactive" ? current.inactiveDate : "",
                    inactiveRemarks:
                      nextStatus === "inactive" ? current.inactiveRemarks : "",
                  }));
                }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {employeeForm.status === "inactive" ? (
                <>
                  <input
                    className={fieldClassName}
                    type="date"
                    value={employeeForm.inactiveDate}
                    onChange={(event) =>
                      updateEmployeeField("inactiveDate", event.target.value)
                    }
                    required
                  />
                  <textarea
                    className={`${fieldClassName} min-h-[116px] resize-y sm:col-span-2`}
                    placeholder="Inactive remarks"
                    value={employeeForm.inactiveRemarks}
                    onChange={(event) =>
                      updateEmployeeField("inactiveRemarks", event.target.value)
                    }
                    required
                  />
                </>
              ) : null}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={isSavingEmployee || isLoading}
                className="rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingEmployee
                  ? isEditingEmployee
                    ? "Updating..."
                    : "Creating..."
                  : isEditingEmployee
                    ? "Update Employee"
                    : "Create Employee Login"}
              </button>
              {isEditingEmployee ? (
                <button
                  type="button"
                  onClick={() => setEmployeeForm(emptyEmployeeForm)}
                  className="rounded-2xl border border-[rgba(255,255,255,0.14)] px-5 py-3 text-sm font-semibold text-white"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : (
        <section className="accent-card p-6">
          <p className="eyebrow">Employees</p>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
            Employee records are view-only for this login.
          </h2>
          <p className="muted-copy mt-4 max-w-3xl text-sm leading-7">
            Only admin accounts can create or edit employee logins. You can still review the
            current employee list below.
          </p>
        </section>
      )}

      <CrmEmployeesList
        employees={employees}
        onEdit={loadEmployeeForEdit}
        canEdit={canManageEmployees}
      />
    </section>
  );
}

export function AdminClientsPanel() {
  const {
    token,
    employees,
    clients,
    isLoading,
    message,
    error,
    setMessage,
    setError,
    refreshCrm,
  } = useAdminCrmData();
  const [clientForm, setClientForm] = useState<ClientFormState>(emptyClientForm);
  const [isSavingClient, setIsSavingClient] = useState(false);

  const employeeOptions = useMemo(
    () => employees.filter((employee) => employee.status === "active"),
    [employees]
  );

  function updateClientField(field: keyof ClientFormState, value: string) {
    setClientForm((current) => ({ ...current, [field]: value }));
  }

  async function handleAgreementUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setClientForm((current) => ({
        ...current,
        agreementFileName: "",
        agreementFileType: "",
        agreementFileData: "",
      }));
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Signed agreement must be uploaded as a PDF.");
      event.target.value = "";
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError("Signed agreement PDF must be 4 MB or smaller.");
      event.target.value = "";
      return;
    }

    setError("");

    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Unable to read the signed agreement PDF."));
      reader.readAsDataURL(file);
    });

    setClientForm((current) => ({
      ...current,
      agreementFileName: file.name,
      agreementFileType: file.type,
      agreementFileData: fileData,
    }));
  }

  async function handleClientSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    setIsSavingClient(true);
    setError("");
    setMessage("");

    try {
      const assignedEmployee = employees.find(
        (employee) => employee.id === clientForm.assignedEmployeeId
      );

      const response = await fetch("/api/admin/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...clientForm,
          assignedEmployeeName: assignedEmployee?.fullName,
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to create client.");
      }

      await refreshCrm(token);
      setClientForm(emptyClientForm);
      setMessage("Client onboarding saved successfully.");
    } catch (saveError) {
      setError(
        formatErrorMessage(
          saveError instanceof Error ? saveError.message : "Unable to create client."
        )
      );
    } finally {
      setIsSavingClient(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(135deg,rgba(8,96,108,0.88),rgba(11,64,72,0.94))] p-7 text-white shadow-[0_26px_70px_rgba(6,31,36,0.26)]">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(241,166,75,0.92)]">
            Client Onboarding
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            Register client accounts and assign ownership clearly.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
            Capture company details, the main client contact, and assign the right internal
            employee before jobs and follow-ups are distributed.
          </p>
        </div>

        <CrmFeedback message={message} error={error} />

        <form
          className="mt-8 rounded-[1.7rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] p-6 backdrop-blur"
          onSubmit={handleClientSubmit}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              className={fieldClassName}
              placeholder="Company name"
              value={clientForm.companyName}
              onChange={(event) => updateClientField("companyName", event.target.value)}
              required
            />
            <input
              className={fieldClassName}
              placeholder="Contact person"
              value={clientForm.contactPerson}
              onChange={(event) => updateClientField("contactPerson", event.target.value)}
              required
            />
            <input
              className={fieldClassName}
              type="email"
              placeholder="Contact email"
              value={clientForm.contactEmail}
              onChange={(event) => updateClientField("contactEmail", event.target.value)}
            />
            <input
              className={fieldClassName}
              placeholder="Contact phone"
              value={clientForm.contactPhone}
              onChange={(event) => updateClientField("contactPhone", event.target.value)}
            />
            <input
              className={fieldClassName}
              placeholder="Sector"
              value={clientForm.sector}
              onChange={(event) => updateClientField("sector", event.target.value)}
            />
            <input
              className={fieldClassName}
              placeholder="Branch / region"
              value={clientForm.branch}
              onChange={(event) => updateClientField("branch", event.target.value)}
            />
            <select
              className={fieldClassName}
              value={clientForm.assignedEmployeeId}
              onChange={(event) => updateClientField("assignedEmployeeId", event.target.value)}
            >
              <option value="">Assign employee</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} - {employee.role}
                </option>
              ))}
            </select>
            <select
              className={fieldClassName}
              value={clientForm.status}
              onChange={(event) =>
                updateClientField("status", event.target.value as ClientStatus)
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="sm:col-span-2 rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] px-4 py-4">
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/72">
                Signed agreement (PDF)
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-2xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white">
                  Upload PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={handleAgreementUpload}
                  />
                </label>
                <span className="text-sm text-white/78">
                  {clientForm.agreementFileName || "No file chosen"}
                </span>
              </div>
            </div>
            <textarea
              className={`${fieldClassName} min-h-[116px] resize-y sm:col-span-2`}
              placeholder="Notes / onboarding context"
              value={clientForm.notes}
              onChange={(event) => updateClientField("notes", event.target.value)}
            />
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={isSavingClient || isLoading}
              className="rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingClient ? "Saving..." : "Onboard Client"}
            </button>
          </div>
        </form>
      </div>

      <CrmClientsList clients={clients} />
    </section>
  );
}
