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

type PasswordResetState = {
  employeeId: string;
  password: string;
  mustChangePassword: boolean;
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
  onResetPassword,
  resettingEmployeeId,
}: {
  employees: EmployeeRecord[];
  onEdit: (employee: EmployeeRecord) => void;
  canEdit: boolean;
  onResetPassword: (employee: EmployeeRecord) => void;
  resettingEmployeeId: string;
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

      <div className="mt-5 overflow-hidden rounded-[1.35rem] border border-[var(--color-line)] bg-white">
        {employees.length === 0 ? (
          <p className="muted-copy p-5 text-sm">No employee logins have been created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                  {["Employee", "Code", "Email", "Phone", "Status", "Actions"].map((heading) => (
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
                {employees.map((employee, index) => (
                  <tr
                    key={employee.id}
                    className={
                      index === employees.length - 1
                        ? "align-top"
                        : "align-top border-b border-[var(--color-line)]"
                    }
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[var(--color-ink)]">{employee.fullName}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{employee.role}</p>
                      {employee.status === "inactive" && employee.inactiveRemarks ? (
                        <p className="mt-1 text-xs text-[var(--color-muted)]">
                          {employee.inactiveRemarks}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[var(--color-accent-strong)]">
                      {employee.employeeCode || "Pending"}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {employee.email}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {employee.phone || "Not added"}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      <span className="rounded-full bg-[rgba(241,166,75,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-strong)]">
                        {employee.status}
                      </span>
                      {employee.status === "inactive" && employee.inactiveDate ? (
                        <p className="mt-2 text-xs">Inactive from {employee.inactiveDate}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      {canEdit ? (
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => onEdit(employee)}
                            className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onResetPassword(employee)}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                              resettingEmployeeId === employee.id
                                ? "bg-[var(--color-accent)] text-[var(--color-ink)]"
                                : "border border-[var(--color-line)] text-[var(--color-accent-strong)] hover:border-[var(--color-accent-strong)]"
                            }`}
                          >
                            Reset Password
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--color-muted)]">View only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      <div className="mt-5 overflow-hidden rounded-[1.35rem] border border-[var(--color-line)] bg-white">
        {clients.length === 0 ? (
          <p className="muted-copy p-5 text-sm">No clients have been onboarded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                  {["Client", "Contact", "Owner", "Jobs", "Status", "Agreement"].map((heading) => (
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
                {clients.map((client, index) => (
                  <tr
                    key={client.id}
                    className={
                      index === clients.length - 1
                        ? "align-top"
                        : "align-top border-b border-[var(--color-line)]"
                    }
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[var(--color-ink)]">{client.companyName}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {client.sector || "Sector not added"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      <p>{client.contactPerson}</p>
                      <p className="mt-1">{client.contactEmail || "No email"}</p>
                      <p className="mt-1">{client.contactPhone || "No phone"}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {client.assignedEmployeeName || "Not assigned"}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      <p className="font-semibold text-[var(--color-ink)]">
                        {client.linkedJobsCount}
                      </p>
                      {client.linkedJobs.length ? (
                        <p className="mt-1 max-w-[220px] text-xs leading-5">
                          {client.linkedJobs
                            .map((job) => `${job.jobCode ? `${job.jobCode} - ` : ""}${job.title}`)
                            .join(", ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      <span className="rounded-full bg-[rgba(241,166,75,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-strong)]">
                        {client.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {client.agreementFileData && client.agreementFileName ? (
                        <a
                          href={client.agreementFileData}
                          download={client.agreementFileName}
                          className="font-medium text-[var(--color-accent-strong)]"
                        >
                          Download PDF
                        </a>
                      ) : (
                        "Not uploaded"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export function AdminEmployeesPanel({
  viewMode = "all",
}: {
  viewMode?: "all" | "new" | "existing";
}) {
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
  const [passwordReset, setPasswordReset] = useState<PasswordResetState>({
    employeeId: "",
    password: "",
    mustChangePassword: true,
  });
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const isEditingEmployee = Boolean(employeeForm.id);
  const resettingEmployee = employees.find((employee) => employee.id === passwordReset.employeeId);
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

  function loadEmployeeForPasswordReset(employee: EmployeeRecord) {
    setPasswordReset({
      employeeId: employee.id,
      password: "",
      mustChangePassword: true,
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

  async function handlePasswordResetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    if (!passwordReset.employeeId) {
      setError("Choose an employee first.");
      return;
    }

    if (passwordReset.password.trim().length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    setIsResettingPassword(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/employees/${passwordReset.employeeId}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            password: passwordReset.password,
            mustChangePassword: passwordReset.mustChangePassword,
          }),
        }
      );

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to reset employee password.");
      }

      await refreshCrm(token);
      setMessage(
        passwordReset.mustChangePassword
          ? "Password reset successfully. Employee will be asked to change it on next login."
          : "Password reset successfully."
      );
      setPasswordReset({
        employeeId: "",
        password: "",
        mustChangePassword: true,
      });
    } catch (resetError) {
      setError(
        formatErrorMessage(
          resetError instanceof Error
            ? resetError.message
            : "Unable to reset employee password."
        )
      );
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <section className="space-y-6">
      {canManageEmployees && viewMode !== "existing" ? (
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

          <form
            className="mt-6 rounded-[1.7rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] p-6 backdrop-blur"
            onSubmit={handlePasswordResetSubmit}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(241,166,75,0.92)]">
                  Password Reset
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-white">
                  Reset employee password from the portal.
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                  Choose an employee from the list below, set a new temporary password,
                  and decide whether they must change it at next login.
                </p>
              </div>
              {resettingEmployee ? (
                <div className="rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] px-4 py-3 text-sm text-white/84">
                  <p className="font-semibold text-white">{resettingEmployee.fullName}</p>
                  <p className="mt-1">
                    {resettingEmployee.employeeCode || resettingEmployee.email}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <input
                className={fieldClassName}
                type="password"
                placeholder="Enter new temporary password"
                value={passwordReset.password}
                onChange={(event) =>
                  setPasswordReset((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                required
              />
              <label className="flex items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] px-4 py-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={passwordReset.mustChangePassword}
                  onChange={(event) =>
                    setPasswordReset((current) => ({
                      ...current,
                      mustChangePassword: event.target.checked,
                    }))
                  }
                />
                Force password change on next login
              </label>
              <button
                type="submit"
                disabled={isResettingPassword || !passwordReset.employeeId}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isResettingPassword ? "Resetting..." : "Reset Password"}
              </button>
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

      {viewMode !== "new" ? (
        <div id="existing-employees" className="scroll-mt-28">
          <CrmEmployeesList
            employees={employees}
            onEdit={loadEmployeeForEdit}
            canEdit={canManageEmployees}
            onResetPassword={loadEmployeeForPasswordReset}
            resettingEmployeeId={passwordReset.employeeId}
          />
        </div>
      ) : null}
    </section>
  );
}

export function AdminClientsPanel({
  viewMode = "all",
}: {
  viewMode?: "all" | "new" | "existing";
}) {
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
      {viewMode !== "existing" ? (
      <div
        id="new-client"
        className="rounded-[2rem] scroll-mt-28 border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(135deg,rgba(8,96,108,0.88),rgba(11,64,72,0.94))] p-7 text-white shadow-[0_26px_70px_rgba(6,31,36,0.26)]"
      >
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
      ) : null}

      {viewMode !== "new" ? (
        <div id="existing-clients" className="scroll-mt-28">
          <CrmClientsList clients={clients} />
        </div>
      ) : null}
    </section>
  );
}
