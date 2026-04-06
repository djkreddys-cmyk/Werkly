"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ClientRecord,
  ClientStatus,
  EmployeeRecord,
  EmployeeStatus,
} from "@/lib/crm";

type EmployeeFormState = {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  status: EmployeeStatus;
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
};

const emptyEmployeeForm: EmployeeFormState = {
  fullName: "",
  email: "",
  phone: "",
  role: "",
  password: "",
  status: "active",
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
};

const fieldClassName =
  "w-full rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.12)] px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none transition focus:border-[var(--color-accent)] focus:bg-[rgba(255,255,255,0.16)]";

export function AdminCrmDashboard() {
  const [token, setToken] = useState("");
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(emptyEmployeeForm);
  const [clientForm, setClientForm] = useState<ClientFormState>(emptyClientForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedToken = window.localStorage.getItem("werklyAdminToken") ?? "";
    setToken(savedToken);
  }, []);

  async function refreshCrm(activeToken: string) {
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

    setEmployees(employeesResult.employees ?? []);
    setClients(clientsResult.clients ?? []);
  }

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    refreshCrm(token)
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load CRM data.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const employeeOptions = useMemo(
    () => employees.filter((employee) => employee.status === "active"),
    [employees]
  );

  function updateEmployeeField(field: keyof EmployeeFormState, value: string) {
    setEmployeeForm((current) => ({ ...current, [field]: value }));
  }

  function updateClientField(field: keyof ClientFormState, value: string) {
    setClientForm((current) => ({ ...current, [field]: value }));
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

    try {
      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(employeeForm),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to create employee.");
      }

      await refreshCrm(token);
      setEmployeeForm(emptyEmployeeForm);
      setMessage("Employee login created successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create employee.");
    } finally {
      setIsSavingEmployee(false);
    }
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
      setError(saveError instanceof Error ? saveError.message : "Unable to create client.");
    } finally {
      setIsSavingClient(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(135deg,rgba(8,96,108,0.88),rgba(11,64,72,0.94))] p-7 text-white shadow-[0_26px_70px_rgba(6,31,36,0.26)]">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(241,166,75,0.92)]">
            CRM Onboarding
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            Create employee access and onboard clients in one internal workspace.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
            This CRM layer keeps your team logins, assigned clients, and delivery ownership
            structured before the day&apos;s openings and follow-ups move into execution.
          </p>
        </div>

        {message ? <p className="mt-5 text-sm font-medium text-emerald-200">{message}</p> : null}
        {error ? <p className="mt-5 text-sm font-medium text-red-200">{error}</p> : null}

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <form
            className="rounded-[1.7rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] p-6 backdrop-blur"
            onSubmit={handleEmployeeSubmit}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[rgba(241,166,75,0.9)]">
              Employee Onboarding
            </p>
            <h3 className="mt-4 text-2xl font-semibold">Create internal login credentials.</h3>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Add recruiter or employee accounts with their role and initial password so they
              can start handling client assignments.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
                placeholder="Temporary password"
                value={employeeForm.password}
                onChange={(event) => updateEmployeeField("password", event.target.value)}
                required
              />
              <select
                className={fieldClassName}
                value={employeeForm.status}
                onChange={(event) =>
                  updateEmployeeField("status", event.target.value as EmployeeStatus)
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={isSavingEmployee || isLoading}
                className="rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingEmployee ? "Creating..." : "Create Employee Login"}
              </button>
            </div>
          </form>

          <form
            className="rounded-[1.7rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] p-6 backdrop-blur"
            onSubmit={handleClientSubmit}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[rgba(241,166,75,0.9)]">
              Client Onboarding
            </p>
            <h3 className="mt-4 text-2xl font-semibold">Capture client accounts and ownership.</h3>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Register new client companies, their key contacts, and assign them to the right
              employee before follow-ups begin.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="accent-card p-6">
          <p className="eyebrow">Employees</p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <h3 className="text-2xl font-semibold text-[var(--color-ink)]">
              Current internal users
            </h3>
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
                    <p>{employee.email}</p>
                    {employee.phone ? <p>{employee.phone}</p> : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="accent-card p-6">
          <p className="eyebrow">Clients</p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <h3 className="text-2xl font-semibold text-[var(--color-ink)]">
              Assigned client accounts
            </h3>
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
                    {client.notes ? <p className="sm:col-span-2">Notes: {client.notes}</p> : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
