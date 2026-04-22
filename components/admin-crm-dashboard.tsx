"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  ClientFollowUpStatus,
  ClientOnboardingStatus,
  ClientRecord,
  ClientStatus,
  ClientTransferRequestRecord,
  EmployeeEducationEntry,
  EmployeeExperienceEntry,
  EmployeeRecord,
  EmployeeStatus,
} from "@/lib/crm";
import type { AttendanceSessionRecord } from "@/lib/attendance";
import type { ScreenActivityRecord } from "@/lib/activity";
import { AdminJobIdTrigger } from "@/components/admin-job-id-trigger";
import { TableActionMenu } from "@/components/table-action-menu";

type EmployeeFormState = {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  dateOfBirth: string;
  dateOfJoining: string;
  educationDetails: EmployeeEducationEntry[];
  experienceDetails: EmployeeExperienceEntry[];
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
  communicationAddress: string;
  sector: string;
  branch: string;
  assignedEmployeeId: string;
  status: ClientStatus;
  onboardingStatus: ClientOnboardingStatus;
  followUpStatus: ClientFollowUpStatus;
  nextFollowUpDate: string;
  lastFollowUpDate: string;
  onboardingSource: string;
  notes: string;
  followUpNotes: string;
  agreementFileName: string;
  agreementFileType: string;
  agreementFileData: string;
};

function createEmptyEducationEntry(): EmployeeEducationEntry {
  return {
    qualification: "",
    specialization: "",
    institution: "",
    yearOfPassing: "",
    gradeOrPercentage: "",
  };
}

function createEmptyExperienceEntry(): EmployeeExperienceEntry {
  return {
    companyName: "",
    designation: "",
    startDate: "",
    endDate: "",
    totalDuration: "",
    industry: "",
    responsibilities: "",
    reasonForLeaving: "",
  };
}

function buildEducationSummary(entries: EmployeeEducationEntry[]) {
  return entries
    .filter((entry) => entry.qualification.trim())
    .map((entry) =>
      [entry.qualification, entry.specialization, entry.institution]
        .filter(Boolean)
        .join(" - ")
    )
    .join(", ");
}

function buildExperienceSummary(entries: EmployeeExperienceEntry[]) {
  return entries
    .filter((entry) => entry.companyName.trim())
    .map((entry) =>
      [entry.companyName, entry.designation, entry.totalDuration]
        .filter(Boolean)
        .join(" - ")
    )
    .join(", ");
}

const emptyEmployeeForm: EmployeeFormState = {
  fullName: "",
  email: "",
  phone: "",
  role: "",
  dateOfBirth: "",
  dateOfJoining: "",
  educationDetails: [createEmptyEducationEntry()],
  experienceDetails: [createEmptyExperienceEntry()],
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
  communicationAddress: "",
  sector: "",
  branch: "",
  assignedEmployeeId: "",
  status: "active",
  onboardingStatus: "new-lead",
  followUpStatus: "pending",
  nextFollowUpDate: "",
  lastFollowUpDate: "",
  onboardingSource: "",
  notes: "",
  followUpNotes: "",
  agreementFileName: "",
  agreementFileType: "",
  agreementFileData: "",
};

const fieldClassName =
  "w-full rounded-2xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.12)] px-4 py-3 text-sm text-white placeholder:text-white/55 outline-none transition focus:border-[var(--color-accent)] focus:bg-[rgba(255,255,255,0.16)]";
const clientFormLabelClassName =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-white/78";
const clientSelectClassName =
  `${fieldClassName} appearance-none pr-10 [color-scheme:dark]`;
const clientSelectOptionStyle = {
  backgroundColor: "#0f5962",
  color: "#ffffff",
};

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

function EmployeeEducationFields({
  entries,
  onChange,
  onAdd,
  onRemove,
  inputClassName,
  secondaryButtonClassName,
}: {
  entries: EmployeeEducationEntry[];
  onChange: (index: number, field: keyof EmployeeEducationEntry, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  inputClassName: string;
  secondaryButtonClassName: string;
}) {
  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
            Education Details
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Add each qualification separately.
          </p>
        </div>
        <button type="button" onClick={onAdd} className={secondaryButtonClassName}>
          Add Education
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {entries.map((entry, index) => (
          <div
            key={`education-${index}`}
            className="rounded-[1.35rem] border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                Qualification {index + 1}
              </p>
              {entries.length > 1 ? (
                <button type="button" onClick={() => onRemove(index)} className={secondaryButtonClassName}>
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className={inputClassName} placeholder="Qualification" value={entry.qualification} onChange={(event) => onChange(index, "qualification", event.target.value)} />
              <input className={inputClassName} placeholder="Specialization" value={entry.specialization ?? ""} onChange={(event) => onChange(index, "specialization", event.target.value)} />
              <input className={inputClassName} placeholder="Institute / University" value={entry.institution ?? ""} onChange={(event) => onChange(index, "institution", event.target.value)} />
              <input className={inputClassName} placeholder="Year of passing" value={entry.yearOfPassing ?? ""} onChange={(event) => onChange(index, "yearOfPassing", event.target.value)} />
              <input className={inputClassName} placeholder="Grade / Percentage" value={entry.gradeOrPercentage ?? ""} onChange={(event) => onChange(index, "gradeOrPercentage", event.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeeExperienceFields({
  entries,
  onChange,
  onAdd,
  onRemove,
  inputClassName,
  textareaClassName,
  secondaryButtonClassName,
}: {
  entries: EmployeeExperienceEntry[];
  onChange: (index: number, field: keyof EmployeeExperienceEntry, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  inputClassName: string;
  textareaClassName: string;
  secondaryButtonClassName: string;
}) {
  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-strong)]">
            Experience Details
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Add one row for each company the employee worked in.
          </p>
        </div>
        <button type="button" onClick={onAdd} className={secondaryButtonClassName}>
          Add Experience
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {entries.map((entry, index) => (
          <div
            key={`experience-${index}`}
            className="rounded-[1.35rem] border border-[var(--color-line)] bg-[rgba(255,255,255,0.04)] p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                Company {index + 1}
              </p>
              {entries.length > 1 ? (
                <button type="button" onClick={() => onRemove(index)} className={secondaryButtonClassName}>
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className={inputClassName} placeholder="Company name" value={entry.companyName} onChange={(event) => onChange(index, "companyName", event.target.value)} />
              <input className={inputClassName} placeholder="Designation" value={entry.designation ?? ""} onChange={(event) => onChange(index, "designation", event.target.value)} />
              <input className={inputClassName} type="date" value={entry.startDate ?? ""} onChange={(event) => onChange(index, "startDate", event.target.value)} />
              <input className={inputClassName} type="date" value={entry.endDate ?? ""} onChange={(event) => onChange(index, "endDate", event.target.value)} />
              <input className={inputClassName} placeholder="Total duration" value={entry.totalDuration ?? ""} onChange={(event) => onChange(index, "totalDuration", event.target.value)} />
              <input className={inputClassName} placeholder="Industry" value={entry.industry ?? ""} onChange={(event) => onChange(index, "industry", event.target.value)} />
              <textarea className={`${textareaClassName} sm:col-span-2`} placeholder="Responsibilities" value={entry.responsibilities ?? ""} onChange={(event) => onChange(index, "responsibilities", event.target.value)} />
              <textarea className={`${textareaClassName} sm:col-span-2`} placeholder="Reason for leaving" value={entry.reasonForLeaving ?? ""} onChange={(event) => onChange(index, "reasonForLeaving", event.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
                  const shouldOpenUp = index >= employees.length - 2;
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
                          <TableActionMenu
                            label={`Open actions for ${employee.fullName}`}
                            isOpen={actionMenuEmployeeId === employee.id}
                            onToggle={() =>
                              setActionMenuEmployeeId((current) =>
                                current === employee.id ? "" : employee.id
                              )
                            }
                            onClose={() => setActionMenuEmployeeId("")}
                            openUp={shouldOpenUp}
                            items={[
                              {
                                label: "Open Profile",
                                href: `/admin/employees/${employee.id}`,
                                tone: "accent",
                              },
                              {
                                label: "Edit",
                                onClick: () => onEdit(employee),
                              },
                              {
                                label: "Reset Password",
                                onClick: () => onResetPassword(employee),
                                tone: resettingEmployeeId === employee.id ? "accent" : "danger",
                              },
                              ...(employee.status === "active"
                                ? [
                                    {
                                      label: "Inactivate",
                                      onClick: () => onInactivate(employee),
                                      tone: "danger" as const,
                                    },
                                  ]
                                : []),
                            ]}
                          />
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

function CrmClientsList({
  clients,
  canManageActions,
  canDelete,
  onTransfer,
  onFollowUp,
  onDelete,
}: {
  clients: ClientRecord[];
  canManageActions: boolean;
  canDelete: boolean;
  onTransfer: (client: ClientRecord) => void;
  onFollowUp: (client: ClientRecord) => void;
  onDelete: (client: ClientRecord) => void;
}) {
  const [selectedClientJobs, setSelectedClientJobs] = useState<ClientRecord | null>(null);
  const [actionMenuClientId, setActionMenuClientId] = useState("");
  const [token] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("werklyAdminToken") ?? "" : ""
  );
  const [query, setQuery] = useState(() =>
    typeof window !== "undefined" ? window.localStorage.getItem("werklyClientsQuery") ?? "" : ""
  );
  const [statusFilter, setStatusFilter] = useState(() =>
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyClientsStatus") ?? "all"
      : "all"
  );
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("werklyClientsQuery", query);
    window.localStorage.setItem("werklyClientsStatus", statusFilter);
  }, [query, statusFilter]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesQuery =
        !query ||
        [
          client.companyName,
          client.contactPerson,
          client.contactEmail,
          client.assignedEmployeeName,
          client.followUpEmployeeName,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query.trim().toLowerCase()));

      const matchesStatus =
        statusFilter === "all" || (client.status || "active") === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [clients, query, statusFilter]);

  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const activePage = Math.min(page, pageCount);
  const paginatedClients = useMemo(
    () => filteredClients.slice((activePage - 1) * pageSize, activePage * pageSize),
    [activePage, filteredClients]
  );

  function exportCurrentView() {
    const workbookMarkup = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #eaf2f4; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>Clients Current View</h1>
    <table>
      <thead>
        <tr>
          <th>Client</th>
          <th>Contact</th>
          <th>Owner</th>
          <th>Onboarding</th>
          <th>Follow-Up</th>
          <th>Jobs</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${filteredClients
          .map(
            (client) => `<tr>
              <td>${client.companyName}</td>
              <td>${client.contactPerson}</td>
              <td>${client.assignedEmployeeName || "Not assigned"}</td>
              <td>${client.onboardingStatus || "new-lead"}</td>
              <td>${client.followUpStatus || "pending"}</td>
              <td>${client.linkedJobsCount}</td>
              <td>${client.status}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </body>
</html>`;

    const blob = new Blob([workbookMarkup], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "clients-current-view.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function saveCurrentClientsView() {
    if (!token) {
      return;
    }

    try {
      await fetch("/api/admin/saved-views", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          moduleKey: "clients",
          viewKey: "assigned-clients",
          viewName: `Clients View ${new Date().toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          filters: {
            query,
            statusFilter,
          },
          columns: ["client", "contact", "owner", "onboarding", "followUp", "jobs", "status"],
        }),
      });
    } catch {
      // Keep the page usable even if saved-view persistence fails.
    }
  }

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
            {filteredClients.length} clients
          </span>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search client, contact, owner"
            className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
          />
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            type="button"
            onClick={exportCurrentView}
            disabled={filteredClients.length === 0}
            className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export Current View
          </button>
          <button
            type="button"
            onClick={() => void saveCurrentClientsView()}
            className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
          >
            Save Current View
          </button>
        </div>

        <div className="mt-5 rounded-[1.35rem] border border-[var(--color-line)] bg-white">
          {filteredClients.length === 0 ? (
            <p className="muted-copy p-5 text-sm">No clients have been onboarded yet.</p>
          ) : (
            <div className="overflow-x-auto pb-4">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {["Client", "Contact", "Owner", "Onboarding", "Follow-Up", "Jobs", "Status", "Agreement", "Actions"].map((heading) => (
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
                {paginatedClients.map((client, index) => {
                    const shouldOpenUp = index >= paginatedClients.length - 2;

                    return (
                    <tr
                      key={client.id}
                      className={
                        index === paginatedClients.length - 1
                          ? "align-top"
                          : "align-top border-b border-[var(--color-line)]"
                      }
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="font-semibold text-[var(--color-ink)] transition hover:text-[var(--color-dark)]"
                        >
                          {client.companyName}
                        </Link>
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
                          {client.onboardingStatus || "new-lead"}
                        </p>
                        <p className="mt-1 text-xs">
                          {client.onboardingSource || "Source not added"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <p className="font-semibold text-[var(--color-ink)]">
                          {client.followUpStatus || "pending"}
                        </p>
                        <p className="mt-1 text-xs">
                          Next: {client.nextFollowUpDate || "Not scheduled"}
                        </p>
                        {client.followUpNotes ? (
                          <p className="mt-1 max-w-[220px] text-xs leading-5">
                            {client.followUpNotes}
                          </p>
                        ) : null}
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
                      <td className="px-4 py-4">
                        {canManageActions ? (
                          <TableActionMenu
                            label={`Open actions for ${client.companyName}`}
                            isOpen={actionMenuClientId === client.id}
                            onToggle={() =>
                              setActionMenuClientId((current) =>
                                current === client.id ? "" : client.id
                              )
                            }
                            onClose={() => setActionMenuClientId("")}
                            openUp={shouldOpenUp}
                            items={[
                              {
                                label: "View Client",
                                href: `/admin/clients/${client.id}`,
                              },
                              {
                                label: "Follow-Up",
                                onClick: () => onFollowUp(client),
                              },
                              {
                                label: "Transfer Client",
                                onClick: () => onTransfer(client),
                              },
                              ...(canDelete
                                ? [
                                    {
                                      label: "Delete Client",
                                      onClick: () => onDelete(client),
                                      tone: "danger" as const,
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        ) : (
                          <span className="text-sm text-[var(--color-muted)]">View only</span>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {filteredClients.length > pageSize ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="muted-copy text-sm">
              Showing {(activePage - 1) * pageSize + 1}-{Math.min(activePage * pageSize, filteredClients.length)} of{" "}
              {filteredClients.length} clients
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={activePage === 1}
                className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={activePage === pageCount}
                className="rounded-xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
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
                            <AdminJobIdTrigger jobId={job.id} jobCode={job.jobCode} fallbackLabel="Pending" />
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

  function updateEducationEntry(
    index: number,
    field: keyof EmployeeEducationEntry,
    value: string
  ) {
    setEmployeeForm((current) => ({
      ...current,
      educationDetails: current.educationDetails.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      ),
    }));
  }

  function addEducationEntry() {
    setEmployeeForm((current) => ({
      ...current,
      educationDetails: [...current.educationDetails, createEmptyEducationEntry()],
    }));
  }

  function removeEducationEntry(index: number) {
    setEmployeeForm((current) => ({
      ...current,
      educationDetails:
        current.educationDetails.length === 1
          ? [createEmptyEducationEntry()]
          : current.educationDetails.filter((_, entryIndex) => entryIndex !== index),
    }));
  }

  function updateExperienceEntry(
    index: number,
    field: keyof EmployeeExperienceEntry,
    value: string
  ) {
    setEmployeeForm((current) => ({
      ...current,
      experienceDetails: current.experienceDetails.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      ),
    }));
  }

  function addExperienceEntry() {
    setEmployeeForm((current) => ({
      ...current,
      experienceDetails: [...current.experienceDetails, createEmptyExperienceEntry()],
    }));
  }

  function removeExperienceEntry(index: number) {
    setEmployeeForm((current) => ({
      ...current,
      experienceDetails:
        current.experienceDetails.length === 1
          ? [createEmptyExperienceEntry()]
          : current.experienceDetails.filter((_, entryIndex) => entryIndex !== index),
    }));
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
      educationDetails:
        employee.educationDetails && employee.educationDetails.length > 0
          ? employee.educationDetails
          : employee.educationQualification
            ? [
                {
                  qualification: employee.educationQualification,
                  specialization: "",
                  institution: "",
                  yearOfPassing: "",
                  gradeOrPercentage: "",
                },
              ]
            : [createEmptyEducationEntry()],
      experienceDetails:
        employee.experienceDetails && employee.experienceDetails.length > 0
          ? employee.experienceDetails
          : employee.previousExperience
            ? [
                {
                  companyName: employee.previousExperience,
                  designation: "",
                  startDate: "",
                  endDate: "",
                  totalDuration: "",
                  industry: "",
                  responsibilities: "",
                  reasonForLeaving: "",
                },
              ]
            : [createEmptyExperienceEntry()],
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
        body: JSON.stringify({
          ...employeeForm,
          educationQualification: buildEducationSummary(employeeForm.educationDetails),
          previousExperience: buildExperienceSummary(employeeForm.experienceDetails),
        }),
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
          educationQualification: buildEducationSummary(
            inactiveEmployee.educationDetails ?? []
          ),
          previousExperience: buildExperienceSummary(
            inactiveEmployee.experienceDetails ?? []
          ),
          educationDetails: inactiveEmployee.educationDetails ?? [],
          experienceDetails: inactiveEmployee.experienceDetails ?? [],
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
              <label className="block">
                <span className={clientFormLabelClassName}>Date of Birth (DOB)</span>
                <input
                  className={fieldClassName}
                  type="date"
                  value={employeeForm.dateOfBirth}
                  onChange={(event) => updateEmployeeField("dateOfBirth", event.target.value)}
                />
              </label>
              <label className="block">
                <span className={clientFormLabelClassName}>Date of Joining (DOJ)</span>
                <input
                  className={fieldClassName}
                  type="date"
                  value={employeeForm.dateOfJoining}
                  onChange={(event) => updateEmployeeField("dateOfJoining", event.target.value)}
                />
              </label>
              <EmployeeEducationFields
                entries={employeeForm.educationDetails}
                onChange={updateEducationEntry}
                onAdd={addEducationEntry}
                onRemove={removeEducationEntry}
                inputClassName={fieldClassName}
                secondaryButtonClassName="rounded-2xl border border-[rgba(255,255,255,0.14)] px-4 py-2 text-sm font-semibold text-white"
              />
              <EmployeeExperienceFields
                entries={employeeForm.experienceDetails}
                onChange={updateExperienceEntry}
                onAdd={addExperienceEntry}
                onRemove={removeExperienceEntry}
                inputClassName={fieldClassName}
                textareaClassName={`${fieldClassName} min-h-[110px]`}
                secondaryButtonClassName="rounded-2xl border border-[rgba(255,255,255,0.14)] px-4 py-2 text-sm font-semibold text-white"
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
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Date of Birth (DOB)</span>
                  <input className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]" type="date" value={employeeForm.dateOfBirth} onChange={(event) => updateEmployeeField("dateOfBirth", event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Date of Joining (DOJ)</span>
                  <input className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]" type="date" value={employeeForm.dateOfJoining} onChange={(event) => updateEmployeeField("dateOfJoining", event.target.value)} />
                </label>
                <EmployeeEducationFields
                  entries={employeeForm.educationDetails}
                  onChange={updateEducationEntry}
                  onAdd={addEducationEntry}
                  onRemove={removeEducationEntry}
                  inputClassName="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  secondaryButtonClassName="rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
                />
                <EmployeeExperienceFields
                  entries={employeeForm.experienceDetails}
                  onChange={updateExperienceEntry}
                  onAdd={addExperienceEntry}
                  onRemove={removeExperienceEntry}
                  inputClassName="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  textareaClassName="min-h-[110px] w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  secondaryButtonClassName="rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
                />
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
  const router = useRouter();
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
  const [authEmail] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem("werklyAdminEmail") ?? ""
  );
  const [authEmployeeCode] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem("werklyEmployeeCode") ?? ""
  );
  const [authRole] = useState(() =>
    typeof window === "undefined"
      ? "super-admin"
      : window.localStorage.getItem("werklyAuthRole") ?? "super-admin"
  );
  const [transferRequests, setTransferRequests] = useState<ClientTransferRequestRecord[]>([]);
  const [selectedTransferClient, setSelectedTransferClient] = useState<ClientRecord | null>(null);
  const [selectedFollowUpClient, setSelectedFollowUpClient] = useState<ClientRecord | null>(null);
  const [transferToEmployeeId, setTransferToEmployeeId] = useState("");
  const [transferType, setTransferType] = useState<"ownership-transfer" | "follow-up-support">(
    "ownership-transfer"
  );
  const [transferEffectiveFromDate, setTransferEffectiveFromDate] = useState("");
  const [transferEffectiveToDate, setTransferEffectiveToDate] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [followUpStatus, setFollowUpStatus] = useState<ClientFollowUpStatus>("pending");
  const [followUpNextDate, setFollowUpNextDate] = useState("");
  const [followUpLastDate, setFollowUpLastDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [adminTransferNote, setAdminTransferNote] = useState("");
  const [clientForm, setClientForm] = useState<ClientFormState>(emptyClientForm);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isSavingTransferRequest, setIsSavingTransferRequest] = useState(false);
  const [isSavingClientFollowUp, setIsSavingClientFollowUp] = useState(false);
  const [isReviewingTransferRequest, setIsReviewingTransferRequest] = useState(false);
  const isSuperAdmin = authType === "admin" || authRole === "super-admin";
  const currentEmployeeId = useMemo(
    () =>
      employees.find(
        (employee) => employee.employeeCode === authEmployeeCode || employee.email === authEmail
      )?.id ?? "",
    [authEmail, authEmployeeCode, employees]
  );
  const visibleClients = useMemo(() => {
    if (isSuperAdmin) {
      return clients;
    }

    return clients.filter(
      (client) =>
        client.assignedEmployeeId === currentEmployeeId ||
        client.followUpEmployeeId === currentEmployeeId
    );
  }, [clients, currentEmployeeId, isSuperAdmin]);

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
      router.push("/admin/clients/existing");
      router.refresh();
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

  async function handleDeleteClient(client: ClientRecord) {
    if (!token || !isSuperAdmin) {
      setError("Only Super Admin can delete clients.");
      return;
    }

    const confirmed = window.confirm(
      `Delete client "${client.companyName}" from the CRM? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/clients/${client.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json()) as { message?: string; success?: boolean };
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to delete client.");
      }

      await refreshCrm(token);
      setMessage("Client deleted successfully.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete client.");
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
    if (!transferEffectiveFromDate) {
      setError("Please select the effective from date.");
      return;
    }
    if (isSuperAdmin && transferType === "follow-up-support" && !transferEffectiveToDate) {
      setError("Please select the follow-up end date.");
      return;
    }

    setIsSavingTransferRequest(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        isSuperAdmin
          ? `/api/admin/clients/${selectedTransferClient.id}/reassign`
          : "/api/admin/client-transfer-requests",
        {
          method: isSuperAdmin ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            ...(isSuperAdmin
              ? {
                  assignedEmployeeId: transferToEmployeeId,
                  assignmentType: transferType,
                  effectiveFromDate: transferEffectiveFromDate,
                  effectiveToDate:
                    transferType === "follow-up-support" ? transferEffectiveToDate : undefined,
                  reason: transferReason,
                }
              : {
                  clientId: selectedTransferClient.id,
                  requestedToEmployeeId: transferToEmployeeId,
                  effectiveFromDate: transferEffectiveFromDate,
                  reason: transferReason,
                }),
          }),
        }
      );
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(
          result.message ||
            (isSuperAdmin
              ? "Unable to transfer client."
              : "Unable to submit client transfer request.")
        );
      }

      await refreshCrm(token);
      if (!isSuperAdmin) {
        await refreshTransferRequests();
      }
      setSelectedTransferClient(null);
      setTransferToEmployeeId("");
      setTransferType("ownership-transfer");
      setTransferEffectiveFromDate("");
      setTransferEffectiveToDate("");
      setTransferReason("");
      setMessage(
        isSuperAdmin
          ? transferType === "follow-up-support"
            ? "Client follow-up assignment saved successfully."
            : "Client owner updated successfully."
          : "Client transfer request submitted for Super Admin approval."
      );
    } catch (requestError) {
      setError(
        formatErrorMessage(
          requestError instanceof Error
            ? requestError.message
            : isSuperAdmin
              ? "Unable to transfer client."
              : "Unable to submit client transfer request."
        )
      );
    } finally {
      setIsSavingTransferRequest(false);
    }
  }

  async function submitClientFollowUp() {
    if (!token || !selectedFollowUpClient) {
      return;
    }

    if (!followUpStatus) {
      setError("Please select the follow-up status.");
      return;
    }

    setIsSavingClientFollowUp(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/clients/${selectedFollowUpClient.id}/follow-up`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          followUpStatus,
          nextFollowUpDate: followUpNextDate,
          lastFollowUpDate: followUpLastDate,
          followUpNotes,
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to update client follow-up.");
      }

      await refreshCrm(token);
      setSelectedFollowUpClient(null);
      setFollowUpStatus("pending");
      setFollowUpNextDate("");
      setFollowUpLastDate("");
      setFollowUpNotes("");
      setMessage("Client follow-up details updated successfully.");
    } catch (saveError) {
      setError(
        formatErrorMessage(
          saveError instanceof Error ? saveError.message : "Unable to update client follow-up."
        )
      );
    } finally {
      setIsSavingClientFollowUp(false);
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
      {isSuperAdmin && viewMode !== "existing" ? (
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
            <label className="block">
              <span className={clientFormLabelClassName}>Company Name</span>
              <input
                className={fieldClassName}
                placeholder="Company name"
                value={clientForm.companyName}
                onChange={(event) => updateClientField("companyName", event.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className={clientFormLabelClassName}>Contact Person</span>
              <input
                className={fieldClassName}
                placeholder="Contact person"
                value={clientForm.contactPerson}
                onChange={(event) => updateClientField("contactPerson", event.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className={clientFormLabelClassName}>Contact Email</span>
              <input
                className={fieldClassName}
                type="email"
                placeholder="Contact email"
                value={clientForm.contactEmail}
                onChange={(event) => updateClientField("contactEmail", event.target.value)}
              />
            </label>
            <label className="block">
              <span className={clientFormLabelClassName}>Contact Phone</span>
              <input
                className={fieldClassName}
                placeholder="Contact phone"
                value={clientForm.contactPhone}
                onChange={(event) => updateClientField("contactPhone", event.target.value)}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={clientFormLabelClassName}>Communication Address</span>
              <textarea
                className={`${fieldClassName} min-h-[110px] resize-y`}
                placeholder="Communication address"
                value={clientForm.communicationAddress}
                onChange={(event) =>
                  updateClientField("communicationAddress", event.target.value)
                }
              />
            </label>
            <label className="block">
              <span className={clientFormLabelClassName}>Sector</span>
              <input
                className={fieldClassName}
                placeholder="Sector"
                value={clientForm.sector}
                onChange={(event) => updateClientField("sector", event.target.value)}
              />
            </label>
            <label className="block">
              <span className={clientFormLabelClassName}>Branch / Region</span>
              <input
                className={fieldClassName}
                placeholder="Branch / region"
                value={clientForm.branch}
                onChange={(event) => updateClientField("branch", event.target.value)}
              />
            </label>
            <label className="block">
              <span className={clientFormLabelClassName}>Assigned Employee</span>
              <select
                className={clientSelectClassName}
                value={clientForm.assignedEmployeeId}
                onChange={(event) => updateClientField("assignedEmployeeId", event.target.value)}
              >
                <option value="" style={clientSelectOptionStyle}>Assign employee</option>
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id} style={clientSelectOptionStyle}>
                    {employee.fullName} - {employee.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={clientFormLabelClassName}>Onboarding Status</span>
              <select
                className={clientSelectClassName}
                value={clientForm.onboardingStatus}
                onChange={(event) =>
                  updateClientField(
                    "onboardingStatus",
                    event.target.value as ClientOnboardingStatus
                  )
                }
              >
                <option value="new-lead" style={clientSelectOptionStyle}>New Lead</option>
                <option value="contacted" style={clientSelectOptionStyle}>Contacted</option>
                <option value="proposal-shared" style={clientSelectOptionStyle}>Proposal Shared</option>
                <option value="negotiation" style={clientSelectOptionStyle}>Negotiation</option>
                <option value="onboarded" style={clientSelectOptionStyle}>Onboarded</option>
                <option value="hold" style={clientSelectOptionStyle}>Hold</option>
              </select>
            </label>
            <label className="block">
              <span className={clientFormLabelClassName}>Onboarding Source</span>
              <input
                className={fieldClassName}
                placeholder="Onboarding source"
                value={clientForm.onboardingSource}
                onChange={(event) => updateClientField("onboardingSource", event.target.value)}
              />
            </label>
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
            <label className="block sm:col-span-2">
              <span className={clientFormLabelClassName}>Onboarding Notes</span>
              <textarea
                className={`${fieldClassName} min-h-[116px] resize-y`}
                placeholder="Notes / onboarding context"
                value={clientForm.notes}
                onChange={(event) => updateClientField("notes", event.target.value)}
              />
            </label>
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
          <CrmClientsList
            clients={visibleClients}
            canManageActions
            canDelete={isSuperAdmin}
            onTransfer={(client) => {
              setSelectedTransferClient(client);
              setTransferToEmployeeId("");
              setTransferEffectiveFromDate(new Date().toISOString().slice(0, 10));
              setTransferReason("");
              setError("");
              setMessage("");
            }}
            onFollowUp={(client) => {
              setSelectedFollowUpClient(client);
              setFollowUpStatus(client.followUpStatus || "pending");
              setFollowUpNextDate(client.nextFollowUpDate || "");
              setFollowUpLastDate(
                client.lastFollowUpDate || new Date().toISOString().slice(0, 10)
              );
              setFollowUpNotes(client.followUpNotes || "");
              setError("");
              setMessage("");
            }}
            onDelete={(client) => {
              void handleDeleteClient(client);
            }}
          />
        </div>
      ) : null}

      {selectedFollowUpClient ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-2xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Client Follow-Up</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {selectedFollowUpClient.companyName}
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  Recruiters can save the latest follow-up stage, dates, and remarks here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFollowUpClient(null);
                  setFollowUpStatus("pending");
                  setFollowUpNextDate("");
                  setFollowUpLastDate("");
                  setFollowUpNotes("");
                }}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Follow-Up Status
                </span>
                <select
                  className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  value={followUpStatus}
                  onChange={(event) =>
                    setFollowUpStatus(event.target.value as ClientFollowUpStatus)
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="follow-up-due">Follow-Up Due</option>
                  <option value="in-progress">In Discussion</option>
                  <option value="awaiting-client">Awaiting Response</option>
                  <option value="closed">Closed</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Last Follow-Up Date
                </span>
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  type="date"
                  value={followUpLastDate}
                  onChange={(event) => setFollowUpLastDate(event.target.value)}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Next Follow-Up Date
                </span>
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  type="date"
                  value={followUpNextDate}
                  onChange={(event) => setFollowUpNextDate(event.target.value)}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Follow-Up Notes
                </span>
                <textarea
                  className="mt-2 min-h-[160px] w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  placeholder="Enter call notes, meeting updates, commitments, or next steps"
                  value={followUpNotes}
                  onChange={(event) => setFollowUpNotes(event.target.value)}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void submitClientFollowUp()}
                disabled={isSavingClientFollowUp}
                className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingClientFollowUp ? "Saving..." : "Save Follow-Up"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFollowUpClient(null);
                  setFollowUpStatus("pending");
                  setFollowUpNextDate("");
                  setFollowUpLastDate("");
                  setFollowUpNotes("");
                }}
                className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedTransferClient ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-2xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Transfer Client</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  {selectedTransferClient.companyName}
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  {isSuperAdmin
                    ? "Choose full ownership transfer or date-based follow-up assignment."
                    : "Raise a transfer request for Super Admin approval."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTransferClient(null);
                  setTransferToEmployeeId("");
                  setTransferType("ownership-transfer");
                  setTransferEffectiveFromDate("");
                  setTransferEffectiveToDate("");
                  setTransferReason("");
                }}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {isSuperAdmin ? (
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Assignment Type
                  </span>
                  <select
                    className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                    value={transferType}
                    onChange={(event) =>
                      setTransferType(
                        event.target.value as "ownership-transfer" | "follow-up-support"
                      )
                    }
                  >
                    <option value="ownership-transfer">Full Ownership Transfer</option>
                    <option value="follow-up-support">Follow-Up Only</option>
                  </select>
                </label>
              ) : null}

              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Transfer To
                </span>
                <select
                  className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  value={transferToEmployeeId}
                  onChange={(event) => setTransferToEmployeeId(event.target.value)}
                >
                  <option value="">Select employee</option>
                  {employeeOptions
                    .filter((employee) => employee.id !== selectedTransferClient.assignedEmployeeId)
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName} - {employee.role}
                      </option>
                    ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  From When
                </span>
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  type="date"
                  value={transferEffectiveFromDate}
                  onChange={(event) => setTransferEffectiveFromDate(event.target.value)}
                  required
                />
              </label>

              {isSuperAdmin && transferType === "follow-up-support" ? (
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Till When
                  </span>
                  <input
                    className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                    type="date"
                    value={transferEffectiveToDate}
                    onChange={(event) => setTransferEffectiveToDate(event.target.value)}
                    required
                  />
                </label>
              ) : (
                <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(8,96,108,0.03)] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Current Owner
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[var(--color-ink)]">
                    {selectedTransferClient.assignedEmployeeName || "Not assigned"}
                  </p>
                </div>
              )}

              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Remarks
                </span>
                <textarea
                  className="mt-2 min-h-[140px] w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                  placeholder="Reason for transfer / handover notes"
                  value={transferReason}
                  onChange={(event) => setTransferReason(event.target.value)}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void submitTransferRequest()}
                disabled={isSavingTransferRequest}
                className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingTransferRequest ? "Submitting..." : "Submit Transfer Request"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTransferClient(null);
                  setTransferToEmployeeId("");
                  setTransferType("ownership-transfer");
                  setTransferEffectiveFromDate("");
                  setTransferEffectiveToDate("");
                  setTransferReason("");
                }}
                className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewMode !== "new" && isSuperAdmin ? (
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
