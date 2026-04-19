"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ClientRecord,
  ClientStatus,
  ClientTransferRequestRecord,
  EmployeeRecord,
  EmployeeStatus,
} from "@/lib/crm";
import type { AttendanceSessionRecord } from "@/lib/attendance";
import type { ScreenActivityRecord } from "@/lib/activity";

type EmployeeFormState = {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  dateOfBirth: string;
  dateOfJoining: string;
  educationQualification: string;
  previousExperience: string;
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
  dateOfBirth: "",
  dateOfJoining: "",
  educationQualification: "",
  previousExperience: "",
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
  const [attendance, setAttendance] = useState<AttendanceSessionRecord[]>([]);
  const [activity, setActivity] = useState<ScreenActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function applyCrmData(data: {
    employees: EmployeeRecord[];
    clients: ClientRecord[];
    attendance: AttendanceSessionRecord[];
    activity: ScreenActivityRecord[];
  }) {
    setEmployees(data.employees);
    setClients(data.clients);
    setAttendance(data.attendance);
    setActivity(data.activity);
  }

  async function loadCrm(activeToken: string) {
    const [employeesResponse, clientsResponse, attendanceResponse, activityResponse] = await Promise.all([
      fetch("/api/admin/employees", {
        headers: { Authorization: `Bearer ${activeToken}` },
      }),
      fetch("/api/admin/clients", {
        headers: { Authorization: `Bearer ${activeToken}` },
      }),
      fetch("/api/admin/attendance", {
        headers: { Authorization: `Bearer ${activeToken}` },
      }),
      fetch("/api/admin/activity", {
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
    const attendanceResult = (await attendanceResponse.json()) as {
      attendance?: AttendanceSessionRecord[];
      message?: string;
    };
    const activityResult = (await activityResponse.json()) as {
      activity?: ScreenActivityRecord[];
      message?: string;
    };

    if (!employeesResponse.ok) {
      throw new Error(employeesResult.message || "Unable to load employees.");
    }

    if (!clientsResponse.ok) {
      throw new Error(clientsResult.message || "Unable to load clients.");
    }

    if (!attendanceResponse.ok) {
      throw new Error(attendanceResult.message || "Unable to load attendance.");
    }

    if (!activityResponse.ok) {
      throw new Error(activityResult.message || "Unable to load screen activity.");
    }

    return {
      employees: employeesResult.employees ?? [],
      clients: clientsResult.clients ?? [],
      attendance: attendanceResult.attendance ?? [],
      activity: activityResult.activity ?? [],
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
    attendance,
    activity,
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

function formatWorkedDuration(totalMs: number) {
  const totalMinutes = Math.max(0, Math.floor(totalMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatAttendanceDateTime(value?: string) {
  if (!value) {
    return "Not captured";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function CrmFeedback({ message, error }: { message: string; error: string }) {
  return (
    <>
      {message ? <p className="mt-5 text-sm font-medium text-emerald-200">{message}</p> : null}
      {error ? <p className="mt-5 text-sm font-medium text-red-200">{error}</p> : null}
    </>
  );
}

function MoreVerticalIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="10" cy="4.5" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="10" cy="15.5" r="1.5" />
    </svg>
  );
}

function CrmEmployeesList({
  employees,
  attendance,
  activity,
  onEdit,
  canEdit,
  onResetPassword,
  onInactivate,
  resettingEmployeeId,
}: {
  employees: EmployeeRecord[];
  attendance: AttendanceSessionRecord[];
  activity: ScreenActivityRecord[];
  onEdit: (employee: EmployeeRecord) => void;
  canEdit: boolean;
  onResetPassword: (employee: EmployeeRecord) => void;
  onInactivate: (employee: EmployeeRecord) => void;
  resettingEmployeeId: string;
}) {
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const [actionMenuEmployeeId, setActionMenuEmployeeId] = useState("");
  const todayKey = new Date().toISOString().slice(0, 10);
  const attendanceByEmployee = useMemo(() => {
    const summary = new Map<
      string,
      { firstLoginAt?: string; lastLogoutAt?: string; totalWorkedMs: number }
    >();

    attendance
      .filter((session) => session.loginAt.slice(0, 10) === todayKey)
      .forEach((session) => {
        const key = session.userId || session.userIdentifier;
        const existing = summary.get(key) ?? { totalWorkedMs: 0 };
        const loginMs = new Date(session.loginAt).getTime();
        const logoutMs = session.logoutAt ? new Date(session.logoutAt).getTime() : 0;

        if (!existing.firstLoginAt || loginMs < new Date(existing.firstLoginAt).getTime()) {
          existing.firstLoginAt = session.loginAt;
        }

        if (
          session.logoutAt &&
          (!existing.lastLogoutAt ||
            logoutMs > new Date(existing.lastLogoutAt).getTime())
        ) {
          existing.lastLogoutAt = session.logoutAt;
        }

        if (session.logoutAt && logoutMs >= loginMs) {
          existing.totalWorkedMs += logoutMs - loginMs;
        }

        summary.set(key, existing);
      });

    return summary;
  }, [attendance, todayKey]);

  const activityByEmployee = useMemo(() => {
    const summary = new Map<
      string,
      { activeSeconds: number; idleSeconds: number; lastSeenAt?: string }
    >();

    activity
      .filter(
        (entry) =>
          entry.lastSeenAt.slice(0, 10) === todayKey || entry.firstSeenAt.slice(0, 10) === todayKey
      )
      .forEach((entry) => {
        const key = entry.userId || entry.userIdentifier;
        const existing = summary.get(key) ?? {
          activeSeconds: 0,
          idleSeconds: 0,
        };

        existing.activeSeconds += entry.activeSeconds;
        existing.idleSeconds += entry.idleSeconds;

        if (
          !existing.lastSeenAt ||
          new Date(entry.lastSeenAt).getTime() > new Date(existing.lastSeenAt).getTime()
        ) {
          existing.lastSeenAt = entry.lastSeenAt;
        }

        summary.set(key, existing);
      });

    return summary;
  }, [activity, todayKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(event.target as Node)
      ) {
        setActionMenuEmployeeId("");
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

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
                  {[
                    "Employee",
                    "Code",
                    "Email",
                    "Phone",
                    "Screen Time",
                    "Idle Time",
                    "Last Seen",
                    "First Login",
                    "Last Logout",
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
                {employees.map((employee, index) => {
                  const attendanceSummary =
                    attendanceByEmployee.get(employee.id) ??
                    attendanceByEmployee.get(employee.employeeCode || "") ??
                    attendanceByEmployee.get(employee.email);
                  const activitySummary =
                    activityByEmployee.get(employee.id) ??
                    activityByEmployee.get(employee.employeeCode || "") ??
                    activityByEmployee.get(employee.email);

                  return (
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
                        <span className="font-semibold text-[var(--color-ink)]">
                          {activitySummary
                            ? formatWorkedDuration(activitySummary.activeSeconds * 1000)
                            : "0h 0m"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <span className="font-semibold text-[var(--color-ink)]">
                          {activitySummary
                            ? formatWorkedDuration(activitySummary.idleSeconds * 1000)
                            : "0h 0m"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {activitySummary?.lastSeenAt
                          ? formatAttendanceDateTime(activitySummary.lastSeenAt)
                          : "Not captured"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {attendanceSummary?.firstLoginAt
                          ? formatAttendanceDateTime(attendanceSummary.firstLoginAt)
                          : "Not captured"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {attendanceSummary?.lastLogoutAt
                          ? formatAttendanceDateTime(attendanceSummary.lastLogoutAt)
                          : "Not captured"}
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
                          <div
                            className="relative inline-flex"
                            ref={
                              actionMenuEmployeeId === employee.id ? actionsMenuRef : null
                            }
                          >
                            <button
                              type="button"
                              aria-label={`Open actions for ${employee.fullName}`}
                              aria-expanded={actionMenuEmployeeId === employee.id}
                              onClick={() =>
                                setActionMenuEmployeeId((current) =>
                                  current === employee.id ? "" : employee.id
                                )
                              }
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-line)] bg-white text-[var(--color-dark)] transition hover:border-[var(--color-dark)] hover:bg-[rgba(8,96,108,0.06)]"
                            >
                              <MoreVerticalIcon />
                            </button>

                            {actionMenuEmployeeId === employee.id ? (
                              <div className="absolute right-0 top-12 z-20 min-w-[220px] overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuEmployeeId("");
                                    onEdit(employee);
                                  }}
                                  className="flex w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[rgba(8,96,108,0.06)]"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuEmployeeId("");
                                    onResetPassword(employee);
                                  }}
                                  className={`flex w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                                    resettingEmployeeId === employee.id
                                      ? "bg-[var(--color-accent)] text-[var(--color-ink)]"
                                      : "text-[var(--color-accent-strong)] hover:bg-[rgba(190,72,26,0.06)]"
                                  }`}
                                >
                                  Reset Password
                                </button>
                                {employee.status === "active" ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuEmployeeId("");
                                      onInactivate(employee);
                                    }}
                                    className="flex w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-[var(--color-accent-strong)] transition hover:bg-[rgba(190,72,26,0.06)]"
                                  >
                                    Inactivate
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--color-muted)]">View only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function CrmClientsList({ clients }: { clients: ClientRecord[] }) {
  const [selectedClientJobs, setSelectedClientJobs] = useState<ClientRecord | null>(null);

  return (
    <>
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
                        <button
                          type="button"
                          onClick={() => setSelectedClientJobs(client)}
                          className="font-semibold text-[var(--color-accent-strong)] transition hover:text-[var(--color-dark)]"
                        >
                          {client.linkedJobsCount}
                        </button>
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

      {selectedClientJobs ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-3xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Client Jobs</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {selectedClientJobs.companyName}
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  {selectedClientJobs.linkedJobsCount} linked job
                  {selectedClientJobs.linkedJobsCount === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClientJobs(null)}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 overflow-hidden rounded-[1.35rem] border border-[var(--color-line)] bg-white">
              {selectedClientJobs.linkedJobs.length === 0 ? (
                <p className="muted-copy p-5 text-sm">No jobs are linked to this client yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                        {["Job Code", "Job Title", "Status"].map((heading) => (
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
                      {selectedClientJobs.linkedJobs.map((job, index) => (
                        <tr
                          key={job.id}
                          className={
                            index === selectedClientJobs.linkedJobs.length - 1
                              ? "align-top"
                              : "align-top border-b border-[var(--color-line)]"
                          }
                        >
                          <td className="px-4 py-4 text-sm font-semibold text-[var(--color-accent-strong)]">
                            {job.jobCode || "Pending"}
                          </td>
                          <td className="px-4 py-4 text-sm text-[var(--color-ink)]">
                            {job.title}
                          </td>
                          <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                            <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
                              {job.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CrmClientTransferRequests({
  requests,
  isAdmin,
  adminNote,
  setAdminNote,
  onApprove,
  onReject,
}: {
  requests: ClientTransferRequestRecord[];
  isAdmin: boolean;
  adminNote: string;
  setAdminNote: (value: string) => void;
  onApprove: (id: string, note: string) => void;
  onReject: (id: string, note: string) => void;
}) {
  return (
    <section className="accent-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Client Transfer Requests</p>
          <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
            Reassignment requests with approval control
          </h3>
        </div>
        <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
          {requests.length} requests
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.35rem] border border-[var(--color-line)] bg-white">
        {requests.length === 0 ? (
          <p className="muted-copy p-5 text-sm">No client transfer requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                  {["Client", "Requested By", "Transfer To", "Reason", "Status", "Actions"].map((heading) => (
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
                {requests.map((request, index) => (
                  <tr
                    key={request.id}
                    className={
                      index === requests.length - 1
                        ? "align-top"
                        : "align-top border-b border-[var(--color-line)]"
                    }
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                      {request.clientName}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {request.requestedByEmployeeName}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {request.requestedToEmployeeName}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      {request.reason || "No reason added"}
                    </td>
                    <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                      <span className="rounded-full bg-[rgba(241,166,75,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-strong)]">
                        {request.status}
                      </span>
                      {request.adminNote ? (
                        <p className="mt-2 max-w-[260px] text-xs">{request.adminNote}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      {isAdmin && request.status === "pending" ? (
                        <div className="flex min-w-[260px] flex-col gap-3">
                          <textarea
                            value={adminNote}
                            onChange={(event) => setAdminNote(event.target.value)}
                            placeholder="Add approval note"
                            className="min-h-[88px] rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                          />
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => onApprove(request.id, adminNote)}
                              className="rounded-xl bg-[var(--color-dark)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => onReject(request.id, adminNote)}
                              className="rounded-xl border border-[rgba(190,72,26,0.18)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-strong)] transition hover:border-[var(--color-accent-strong)]"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--color-muted)]">
                          {request.reviewedAt
                            ? `Reviewed ${new Date(request.reviewedAt).toLocaleDateString("en-IN")}`
                            : "Waiting for Super Admin"}
                        </span>
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
    attendance,
    activity,
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
  const [inactiveEmployee, setInactiveEmployee] = useState<EmployeeRecord | null>(null);
  const [inactiveDate, setInactiveDate] = useState("");
  const [inactiveRemarks, setInactiveRemarks] = useState("");
  const [isSavingInactive, setIsSavingInactive] = useState(false);
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
      dateOfBirth: employee.dateOfBirth ?? "",
      dateOfJoining: employee.dateOfJoining ?? "",
      educationQualification: employee.educationQualification ?? "",
      previousExperience: employee.previousExperience ?? "",
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

  function loadEmployeeForInactivation(employee: EmployeeRecord) {
    setInactiveEmployee(employee);
    setInactiveDate(employee.inactiveDate ?? new Date().toISOString().slice(0, 10));
    setInactiveRemarks(employee.inactiveRemarks ?? "");
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

  async function handleInactiveSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !inactiveEmployee) {
      setError("Please sign in again. Admin token is missing.");
      return;
    }

    if (!inactiveDate || !inactiveRemarks.trim()) {
      setError("Effective inactive date and reason are required.");
      return;
    }

    setIsSavingInactive(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/employees/${inactiveEmployee.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: inactiveEmployee.fullName,
          email: inactiveEmployee.email,
          phone: inactiveEmployee.phone ?? "",
          role: inactiveEmployee.role,
          dateOfBirth: inactiveEmployee.dateOfBirth ?? "",
          dateOfJoining: inactiveEmployee.dateOfJoining ?? "",
          educationQualification: inactiveEmployee.educationQualification ?? "",
          previousExperience: inactiveEmployee.previousExperience ?? "",
          status: "inactive",
          inactiveDate,
          inactiveRemarks: inactiveRemarks.trim(),
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to inactivate employee.");
      }

      await refreshCrm(token);
      setInactiveEmployee(null);
      setInactiveDate("");
      setInactiveRemarks("");
      setMessage("Employee marked inactive successfully.");
    } catch (saveError) {
      setError(
        formatErrorMessage(
          saveError instanceof Error ? saveError.message : "Unable to inactivate employee."
        )
      );
    } finally {
      setIsSavingInactive(false);
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
      {!canManageEmployees && viewMode !== "all" ? (
        <section className="accent-card p-6">
          <p className="eyebrow">Restricted Access</p>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
            Only Super Admin can open this employee page.
          </h2>
          <p className="muted-copy mt-4 max-w-3xl text-sm leading-7">
            Employee Creation and Existing Users are limited to the Super Admin login.
            Other employee accounts should use leave, attendance, reports, jobs, candidates,
            and client screens based on their role access.
          </p>
        </section>
      ) : null}

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
                type="date"
                value={employeeForm.dateOfBirth}
                onChange={(event) => updateEmployeeField("dateOfBirth", event.target.value)}
              />
              <input
                className={fieldClassName}
                type="date"
                value={employeeForm.dateOfJoining}
                onChange={(event) => updateEmployeeField("dateOfJoining", event.target.value)}
              />
              <input
                className={fieldClassName}
                placeholder="Education qualification"
                value={employeeForm.educationQualification}
                onChange={(event) =>
                  updateEmployeeField("educationQualification", event.target.value)
                }
              />
              <input
                className={fieldClassName}
                placeholder="Previous experience"
                value={employeeForm.previousExperience}
                onChange={(event) =>
                  updateEmployeeField("previousExperience", event.target.value)
                }
              />
              <input
                className={fieldClassName}
                type="password"
                placeholder="Temporary password"
                value={employeeForm.password}
                onChange={(event) => updateEmployeeField("password", event.target.value)}
                required
              />
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
      ) : viewMode === "all" ? (
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
      ) : null}

      {viewMode !== "new" && (canManageEmployees || viewMode === "all") ? (
        <div id="existing-employees" className="scroll-mt-28">
          <CrmEmployeesList
            employees={employees}
            attendance={attendance}
            activity={activity}
            onEdit={loadEmployeeForEdit}
            canEdit={canManageEmployees}
            onResetPassword={loadEmployeeForPasswordReset}
            onInactivate={loadEmployeeForInactivation}
            resettingEmployeeId={passwordReset.employeeId}
          />
        </div>
      ) : null}

      {employeeForm.id && viewMode === "existing" ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-3xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Edit Employee</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  Update employee details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEmployeeForm(emptyEmployeeForm)}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <form className="mt-6" onSubmit={handleEmployeeSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <input className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]" placeholder="Full name" value={employeeForm.fullName} onChange={(event) => updateEmployeeField("fullName", event.target.value)} required />
                <input className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]" type="email" placeholder="Email" value={employeeForm.email} onChange={(event) => updateEmployeeField("email", event.target.value)} required />
                <input className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]" placeholder="Phone" value={employeeForm.phone} onChange={(event) => updateEmployeeField("phone", event.target.value)} />
                <input className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]" placeholder="Role" value={employeeForm.role} onChange={(event) => updateEmployeeField("role", event.target.value)} required />
                <input className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]" type="date" value={employeeForm.dateOfBirth} onChange={(event) => updateEmployeeField("dateOfBirth", event.target.value)} />
                <input className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]" type="date" value={employeeForm.dateOfJoining} onChange={(event) => updateEmployeeField("dateOfJoining", event.target.value)} />
                <input className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]" placeholder="Education qualification" value={employeeForm.educationQualification} onChange={(event) => updateEmployeeField("educationQualification", event.target.value)} />
                <input className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]" placeholder="Previous experience" value={employeeForm.previousExperience} onChange={(event) => updateEmployeeField("previousExperience", event.target.value)} />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="submit" disabled={isSavingEmployee} className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70">
                  {isSavingEmployee ? "Updating..." : "Update Employee"}
                </button>
                <button type="button" onClick={() => setEmployeeForm(emptyEmployeeForm)} className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {resettingEmployee && viewMode === "existing" ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-2xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Reset Password</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {resettingEmployee.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPasswordReset({ employeeId: "", password: "", mustChangePassword: true })
                }
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <form className="mt-6" onSubmit={handlePasswordResetSubmit}>
              <div className="grid gap-4">
                <input
                  className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  type="password"
                  placeholder="Enter new temporary password"
                  value={passwordReset.password}
                  onChange={(event) =>
                    setPasswordReset((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                />
                <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[rgba(8,96,108,0.03)] px-4 py-3 text-sm text-[var(--color-ink)]">
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
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="submit" disabled={isResettingPassword} className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70">
                  {isResettingPassword ? "Resetting..." : "Reset Password"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPasswordReset({ employeeId: "", password: "", mustChangePassword: true })
                  }
                  className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {inactiveEmployee && viewMode === "existing" ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-2xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Inactivate Employee</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {inactiveEmployee.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInactiveEmployee(null)}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <form className="mt-6" onSubmit={handleInactiveSubmit}>
              <div className="grid gap-4">
                <input
                  className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  type="date"
                  value={inactiveDate}
                  onChange={(event) => setInactiveDate(event.target.value)}
                  required
                />
                <textarea
                  className="min-h-[140px] w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  placeholder="Reason for inactivation"
                  value={inactiveRemarks}
                  onChange={(event) => setInactiveRemarks(event.target.value)}
                  required
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="submit" disabled={isSavingInactive} className="rounded-2xl bg-[var(--color-accent-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-dark)] disabled:cursor-not-allowed disabled:opacity-70">
                  {isSavingInactive ? "Saving..." : "Mark Inactive"}
                </button>
                <button type="button" onClick={() => setInactiveEmployee(null)} className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]">
                  Cancel
                </button>
              </div>
            </form>
          </div>
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
  const [authType] = useState(() =>
    typeof window === "undefined"
      ? "admin"
      : window.localStorage.getItem("werklyAuthType") ?? "admin"
  );
  const [authRole] = useState(() =>
    typeof window === "undefined"
      ? "super-admin"
      : window.localStorage.getItem("werklyAuthRole") ?? "super-admin"
  );
  const [transferRequests, setTransferRequests] = useState<ClientTransferRequestRecord[]>([]);
  const [selectedTransferClient, setSelectedTransferClient] = useState<ClientRecord | null>(null);
  const [transferToEmployeeId, setTransferToEmployeeId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [adminTransferNote, setAdminTransferNote] = useState("");
  const [clientForm, setClientForm] = useState<ClientFormState>(emptyClientForm);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isSavingTransferRequest, setIsSavingTransferRequest] = useState(false);
  const [isReviewingTransferRequest, setIsReviewingTransferRequest] = useState(false);
  const isSuperAdmin = authType === "admin" || authRole === "super-admin";

  const employeeOptions = useMemo(
    () => employees.filter((employee) => employee.status === "active"),
    [employees]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    fetch("/api/admin/client-transfer-requests", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          requests?: ClientTransferRequestRecord[];
          message?: string;
        };
        if (!response.ok) {
          throw new Error(result.message || "Unable to load client transfer requests.");
        }
        setTransferRequests(result.requests ?? []);
      })
      .catch((loadError) => {
        setError(
          formatErrorMessage(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load client transfer requests."
          )
        );
      });
  }, [setError, token]);

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

  async function refreshTransferRequests() {
    if (!token) {
      return;
    }

    const response = await fetch("/api/admin/client-transfer-requests", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const result = (await response.json()) as {
      requests?: ClientTransferRequestRecord[];
      message?: string;
    };
    if (!response.ok) {
      throw new Error(result.message || "Unable to refresh client transfer requests.");
    }
    setTransferRequests(result.requests ?? []);
  }

  async function submitTransferRequest() {
    if (!token || !selectedTransferClient) {
      return;
    }

    if (!transferToEmployeeId) {
      setError("Please select the employee to transfer this client to.");
      return;
    }

    setIsSavingTransferRequest(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/client-transfer-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId: selectedTransferClient.id,
          requestedToEmployeeId: transferToEmployeeId,
          reason: transferReason,
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to submit client transfer request.");
      }

      await refreshTransferRequests();
      setSelectedTransferClient(null);
      setTransferToEmployeeId("");
      setTransferReason("");
      setMessage("Client transfer request submitted for Super Admin approval.");
    } catch (requestError) {
      setError(
        formatErrorMessage(
          requestError instanceof Error
            ? requestError.message
            : "Unable to submit client transfer request."
        )
      );
    } finally {
      setIsSavingTransferRequest(false);
    }
  }

  async function reviewTransferRequest(id: string, status: "approved" | "rejected", note: string) {
    if (!token) {
      return;
    }

    setIsReviewingTransferRequest(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/client-transfer-requests/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          adminNote: note,
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to review client transfer request.");
      }

      await Promise.all([refreshCrm(token), refreshTransferRequests()]);
      setAdminTransferNote("");
      setMessage(
        status === "approved"
          ? "Client transfer approved and ownership updated."
          : "Client transfer request rejected."
      );
    } catch (reviewError) {
      setError(
        formatErrorMessage(
          reviewError instanceof Error
            ? reviewError.message
            : "Unable to review client transfer request."
        )
      );
    } finally {
      setIsReviewingTransferRequest(false);
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

      {viewMode !== "new" && !isSuperAdmin ? (
        <section className="accent-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Transfer Client</p>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                Request client reassignment with Super Admin approval
              </h3>
            </div>
          </div>

          <CrmFeedback message={message} error={error} />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <select
              value={selectedTransferClient?.id ?? ""}
              onChange={(event) =>
                setSelectedTransferClient(
                  clients.find((client) => client.id === event.target.value) ?? null
                )
              }
              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value="">Select your client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName}
                </option>
              ))}
            </select>
            <select
              value={transferToEmployeeId}
              onChange={(event) => setTransferToEmployeeId(event.target.value)}
              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
            >
              <option value="">Transfer to employee</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} - {employee.role}
                </option>
              ))}
            </select>
            <textarea
              value={transferReason}
              onChange={(event) => setTransferReason(event.target.value)}
              placeholder="Reason for client reassignment"
              className="min-h-[120px] rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)] sm:col-span-2"
            />
          </div>

          <div className="mt-5">
            <button
              type="button"
              disabled={isSavingTransferRequest}
              onClick={() => void submitTransferRequest()}
              className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingTransferRequest ? "Submitting..." : "Request Transfer Approval"}
            </button>
          </div>
        </section>
      ) : null}

      {viewMode !== "new" ? (
        <CrmClientTransferRequests
          requests={transferRequests}
          isAdmin={isSuperAdmin && !isReviewingTransferRequest ? true : isSuperAdmin}
          adminNote={adminTransferNote}
          setAdminNote={setAdminTransferNote}
          onApprove={(id, note) => void reviewTransferRequest(id, "approved", note)}
          onReject={(id, note) => void reviewTransferRequest(id, "rejected", note)}
        />
      ) : null}
    </section>
  );
}
