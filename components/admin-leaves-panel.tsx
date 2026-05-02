"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EmployeeRecord } from "@/lib/crm";
import type {
  HalfDaySession,
  LeaveAssignmentRecord,
  LeavePortion,
  LeaveRequestRecord,
  LeaveRequestStatus,
  LeaveTypeRecord,
} from "@/lib/leave";

type LeaveState = {
  leaveTypes: LeaveTypeRecord[];
  assignments: LeaveAssignmentRecord[];
  requests: LeaveRequestRecord[];
  employees: EmployeeRecord[];
};

type PendingRequestAction = {
  status: LeaveRequestStatus;
  adminNote: string;
};

type LeaveRequestEditState = {
  id: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  leavePortion: LeavePortion;
  halfDaySession: HalfDaySession | "";
  reason: string;
  status: LeaveRequestStatus;
  adminNote: string;
};

const inputClassName =
  "w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]";

function formatLeaveYearLabel(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) {
    return "Current leave year";
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  return `${start.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} to ${end.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function formatLeavePortionLabel(
  leavePortion: LeavePortion,
  halfDaySession?: HalfDaySession | null
) {
  if (leavePortion === "half-day") {
    if (halfDaySession === "first-half") {
      return "Half Day - First Half";
    }

    if (halfDaySession === "second-half") {
      return "Half Day - Second Half";
    }

    return "Half Day";
  }

  return "Full Day";
}

function formatLeaveDays(value?: number | string | null) {
  const normalizedValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : 0;

  if (!Number.isFinite(normalizedValue)) {
    return "0";
  }

  return Number.isInteger(normalizedValue)
    ? String(normalizedValue)
    : normalizedValue.toFixed(1);
}

export function AdminLeavesPanel() {
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [authType] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthType") ?? "admin"
      : "admin"
  );
  const [authRole] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAuthRole") ?? "super-admin"
      : "super-admin"
  );
  const [state, setState] = useState<LeaveState>({
    leaveTypes: [],
    assignments: [],
    requests: [],
    employees: [],
  });
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSavingType, setIsSavingType] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newLeaveTypeName, setNewLeaveTypeName] = useState("");
  const [newLeaveTypeDescription, setNewLeaveTypeDescription] = useState("");
  const [assignmentEmployeeId, setAssignmentEmployeeId] = useState("");
  const [assignmentLeaveTypeId, setAssignmentLeaveTypeId] = useState("");
  const [assignmentDays, setAssignmentDays] = useState("0");
  const [requestLeaveTypeId, setRequestLeaveTypeId] = useState("");
  const [requestStartDate, setRequestStartDate] = useState("");
  const [requestEndDate, setRequestEndDate] = useState("");
  const [requestLeavePortion, setRequestLeavePortion] = useState<LeavePortion>("full-day");
  const [requestHalfDaySession, setRequestHalfDaySession] = useState<HalfDaySession | "">("");
  const [requestReason, setRequestReason] = useState("");
  const [requestActions, setRequestActions] = useState<Record<string, PendingRequestAction>>(
    {}
  );
  const [editingRequest, setEditingRequest] = useState<LeaveRequestEditState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const canManageLeaves = authType === "admin" || authRole === "super-admin";

  const loadState = useCallback(async () => {
    if (!token) {
      return;
    }

    const loadJson = async (path: string) => {
      const response = await fetch(path, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load leave data.");
      }

      return result;
    };

    const baseRequests = [
      loadJson("/api/admin/leaves/types"),
      loadJson("/api/admin/leaves/assignments"),
      loadJson("/api/admin/leaves/requests"),
    ];

    const results = canManageLeaves
      ? await Promise.all([...baseRequests, loadJson("/api/admin/employees")])
      : await Promise.all(baseRequests);

    const [leaveTypesResult, assignmentsResult, requestsResult, employeesResult] = results;

    setState({
      leaveTypes: leaveTypesResult.leaveTypes ?? [],
      assignments: assignmentsResult.assignments ?? [],
      requests: requestsResult.requests ?? [],
      employees: employeesResult?.employees ?? [],
    });
  }, [canManageLeaves, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    loadState()
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load leave data.");
      })
      .finally(() => setIsLoading(false));
  }, [loadState, token]);

  const availableLeaveTypes = useMemo(() => {
    if (canManageLeaves) {
      return state.leaveTypes.filter((type) => type.isActive);
    }

    const assignedIds = new Set(state.assignments.map((assignment) => assignment.leaveTypeId));
    return state.leaveTypes.filter((type) => type.isActive && assignedIds.has(type.id));
  }, [canManageLeaves, state.assignments, state.leaveTypes]);

  async function handleCreateLeaveType(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSavingType(true);

    try {
      const response = await fetch("/api/admin/leaves/types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newLeaveTypeName,
          description: newLeaveTypeDescription,
          isActive: true,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to create leave type.");
      }

      setNewLeaveTypeName("");
      setNewLeaveTypeDescription("");
      setSuccess("Leave type added successfully.");
      await loadState();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create leave type."
      );
    } finally {
      setIsSavingType(false);
    }
  }

  async function handleAssignLeave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSavingAssignment(true);

    try {
      const response = await fetch("/api/admin/leaves/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: assignmentEmployeeId,
          leaveTypeId: assignmentLeaveTypeId,
          allocatedDays: Number(assignmentDays),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to assign leave balance.");
      }

      setAssignmentEmployeeId("");
      setAssignmentLeaveTypeId("");
      setAssignmentDays("0");
      setSuccess("Leave balance assigned successfully.");
      await loadState();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to assign leave balance."
      );
    } finally {
      setIsSavingAssignment(false);
    }
  }

  async function handleSubmitLeaveRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmittingRequest(true);

    try {
      const response = await fetch("/api/admin/leaves/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leaveTypeId: requestLeaveTypeId,
          startDate: requestStartDate,
          endDate: requestEndDate,
          leavePortion: requestLeavePortion,
          halfDaySession:
            requestLeavePortion === "half-day" ? requestHalfDaySession || undefined : undefined,
          reason: requestReason,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to submit leave request.");
      }

      setRequestLeaveTypeId("");
      setRequestStartDate("");
      setRequestEndDate("");
      setRequestLeavePortion("full-day");
      setRequestHalfDaySession("");
      setRequestReason("");
      setSuccess("Leave request submitted.");
      await loadState();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit leave request."
      );
    } finally {
      setIsSubmittingRequest(false);
    }
  }

  async function handleUpdateLeaveRequest(id: string) {
    const action = requestActions[id];
    if (!action) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/leaves/requests/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(action),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update leave request.");
      }

      setSuccess("Leave request updated successfully.");
      await loadState();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to update leave request."
      );
    }
  }

  function openEditRequest(request: LeaveRequestRecord) {
    setEditingRequest({
      id: request.id,
      leaveTypeId: request.leaveTypeId,
      startDate: request.startDate,
      endDate: request.endDate,
      leavePortion: request.leavePortion || "full-day",
      halfDaySession: request.halfDaySession || "",
      reason: request.reason,
      status: request.status,
      adminNote: request.adminNote ?? "",
    });
    setError("");
    setSuccess("");
  }

  async function handleSaveEditedRequest() {
    if (!editingRequest) {
      return;
    }

    setError("");
    setSuccess("");
    setIsSavingEdit(true);

    try {
      const response = await fetch(`/api/admin/leaves/requests/${editingRequest.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leaveTypeId: editingRequest.leaveTypeId,
          startDate: editingRequest.startDate,
          endDate: editingRequest.endDate,
          leavePortion: editingRequest.leavePortion,
          halfDaySession:
            editingRequest.leavePortion === "half-day"
              ? editingRequest.halfDaySession || undefined
              : undefined,
          reason: editingRequest.reason,
          status: editingRequest.status,
          adminNote: editingRequest.adminNote,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to edit leave request.");
      }

      setRequestActions((current) => ({
        ...current,
        [editingRequest.id]: {
          status: editingRequest.status,
          adminNote: editingRequest.adminNote,
        },
      }));
      setEditingRequest(null);
      setSuccess("Leave request edited successfully.");
      await loadState();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to edit leave request."
      );
    } finally {
      setIsSavingEdit(false);
    }
  }

  function setRequestAction(id: string, patch: Partial<PendingRequestAction>) {
    setRequestActions((current) => ({
      ...current,
      [id]: {
        status: patch.status ?? current[id]?.status ?? "pending",
        adminNote: patch.adminNote ?? current[id]?.adminNote ?? "",
      },
    }));
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      ) : null}

      {canManageLeaves ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <form className="accent-card p-7" onSubmit={handleCreateLeaveType}>
            <p className="eyebrow">Leave Types</p>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
              Create leave categories for the team.
            </h2>
            <div className="mt-6 space-y-4">
              <input
                className={inputClassName}
                value={newLeaveTypeName}
                onChange={(event) => setNewLeaveTypeName(event.target.value)}
                placeholder="Sick Leave"
                required
              />
              <textarea
                className={`${inputClassName} min-h-28 resize-y`}
                value={newLeaveTypeDescription}
                onChange={(event) => setNewLeaveTypeDescription(event.target.value)}
                placeholder="Optional notes about this leave type"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingType}
              className="mt-6 rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingType ? "Saving..." : "Add Leave Type"}
            </button>
          </form>

          <form className="accent-card p-7" onSubmit={handleAssignLeave}>
            <p className="eyebrow">Leave Allocation</p>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
              Assign leave balances to employees.
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <select
                className={inputClassName}
                value={assignmentEmployeeId}
                onChange={(event) => setAssignmentEmployeeId(event.target.value)}
                required
              >
                <option value="">Select employee</option>
                {state.employees
                  .filter((employee) => employee.status === "active")
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                      {employee.employeeCode ? ` (${employee.employeeCode})` : ""}
                    </option>
                  ))}
              </select>

              <select
                className={inputClassName}
                value={assignmentLeaveTypeId}
                onChange={(event) => setAssignmentLeaveTypeId(event.target.value)}
                required
              >
                <option value="">Select leave type</option>
                {state.leaveTypes
                  .filter((type) => type.isActive)
                  .map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
              </select>

              <input
                className={inputClassName}
                type="number"
                min="0"
                step="0.5"
                value={assignmentDays}
                onChange={(event) => setAssignmentDays(event.target.value)}
                placeholder="Allocated days"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSavingAssignment}
              className="mt-6 rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingAssignment ? "Saving..." : "Assign Leave Balance"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="accent-card p-7">
        <p className="eyebrow">{canManageLeaves ? "Assigned Leave" : "My Leave Balance"}</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
          {canManageLeaves
            ? "Review allocated leave balances across the team."
            : "Check which leave types are available for you to apply."}
        </h2>
        {state.assignments[0]?.leaveYearStart && state.assignments[0]?.leaveYearEnd ? (
          <p className="muted-copy mt-3 text-sm">
            Leave year: {formatLeaveYearLabel(state.assignments[0].leaveYearStart, state.assignments[0].leaveYearEnd)}
          </p>
        ) : null}

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading leave balances...</p>
        ) : state.assignments.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">
            {canManageLeaves
              ? "No leave balances have been assigned yet."
              : "No leave balance has been assigned to your account yet."}
          </p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {[
                      canManageLeaves ? "Employee" : "Leave Type",
                      canManageLeaves ? "Leave Type" : "Allocated",
                      "Approved",
                      "Pending",
                      "Remaining",
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
                  {state.assignments.map((assignment, index) => (
                    <tr
                      key={assignment.id}
                      className={
                        index === state.assignments.length - 1
                          ? "align-top"
                          : "align-top border-b border-[var(--color-line)]"
                      }
                    >
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {canManageLeaves ? (
                          <>
                            <p className="font-semibold text-[var(--color-ink)]">
                              {assignment.employeeName}
                            </p>
                            <p className="mt-1">
                              {assignment.employeeCode || assignment.employeeEmail}
                            </p>
                          </>
                        ) : (
                          <p className="font-semibold text-[var(--color-ink)]">
                            {assignment.leaveTypeName}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {canManageLeaves
                          ? assignment.leaveTypeName
                          : formatLeaveDays(assignment.allocatedDays)}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {formatLeaveDays(assignment.approvedDays)}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {formatLeaveDays(assignment.pendingDays)}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-[var(--color-ink)]">
                        {formatLeaveDays(assignment.remainingDays)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {!canManageLeaves ? (
        <section className="accent-card p-7">
          <p className="eyebrow">Apply Leave</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
            Submit leave only from the balances assigned to you.
          </h2>
          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmitLeaveRequest}>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Leave Type
              </span>
              <select
                className={inputClassName}
                value={requestLeaveTypeId}
                onChange={(event) => setRequestLeaveTypeId(event.target.value)}
                required
              >
                <option value="">Select leave type</option>
                {availableLeaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Leave Duration
              </span>
              <select
                className={inputClassName}
                value={requestLeavePortion}
                onChange={(event) => {
                  const nextValue = event.target.value as LeavePortion;
                  setRequestLeavePortion(nextValue);
                  if (nextValue !== "half-day") {
                    setRequestHalfDaySession("");
                  }
                }}
                required
              >
                <option value="full-day">Full Day</option>
                <option value="half-day">Half Day</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Start Date
              </span>
              <input
                className={inputClassName}
                type="date"
                value={requestStartDate}
                onChange={(event) => {
                  setRequestStartDate(event.target.value);
                  if (requestLeavePortion === "half-day") {
                    setRequestEndDate(event.target.value);
                  }
                }}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                End Date
              </span>
              <input
                className={inputClassName}
                type="date"
                value={requestEndDate}
                onChange={(event) => setRequestEndDate(event.target.value)}
                required
                disabled={requestLeavePortion === "half-day"}
              />
            </label>

            {requestLeavePortion === "half-day" ? (
              <label className="block md:col-span-2">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Half Day Session
                </span>
                <select
                  className={inputClassName}
                  value={requestHalfDaySession}
                  onChange={(event) =>
                    setRequestHalfDaySession(event.target.value as HalfDaySession | "")
                  }
                  required
                >
                  <option value="">Select session</option>
                  <option value="first-half">First Half</option>
                  <option value="second-half">Second Half</option>
                </select>
              </label>
            ) : null}

            <textarea
              className={`${inputClassName} min-h-28 resize-y md:col-span-2`}
              value={requestReason}
              onChange={(event) => setRequestReason(event.target.value)}
              placeholder="Reason for leave"
              required
            />

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSubmittingRequest || availableLeaveTypes.length === 0}
                className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmittingRequest ? "Submitting..." : "Apply Leave"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="accent-card p-7">
        <p className="eyebrow">{canManageLeaves ? "Leave Requests" : "My Leave Requests"}</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
          {canManageLeaves
            ? "Approve or reject employee leave applications."
            : "Track the status of your submitted leave requests."}
        </h2>

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading leave requests...</p>
        ) : state.requests.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">No leave requests have been submitted yet.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {[
                      canManageLeaves ? "Employee" : "Leave Type",
                      "Dates",
                      "Days",
                      "Reason",
                      "Status",
                      "Admin Note",
                      canManageLeaves ? "Action" : "Updated",
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
                  {state.requests.map((request, index) => {
                    const action = requestActions[request.id] ?? {
                      status: request.status,
                      adminNote: request.adminNote ?? "",
                    };

                    return (
                      <tr
                        key={request.id}
                        className={
                          index === state.requests.length - 1
                            ? "align-top"
                            : "align-top border-b border-[var(--color-line)]"
                        }
                      >
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {canManageLeaves ? (
                            <>
                              <p className="font-semibold text-[var(--color-ink)]">
                                {request.employeeName}
                              </p>
                              <p className="mt-1">
                                {request.employeeCode || request.employeeEmail}
                              </p>
                            </>
                          ) : (
                            <p className="font-semibold text-[var(--color-ink)]">
                              {request.leaveTypeName}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {new Date(request.startDate).toLocaleDateString("en-IN")} to{" "}
                          {new Date(request.endDate).toLocaleDateString("en-IN")}
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                            {formatLeavePortionLabel(
                              request.leavePortion || "full-day",
                              request.halfDaySession
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {formatLeaveDays(request.daysRequested)}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {request.reason}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className="font-semibold text-[var(--color-accent-strong)]">
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {canManageLeaves ? (
                            <textarea
                              className={`${inputClassName} min-h-24 min-w-[220px] resize-y`}
                              value={action.adminNote}
                              onChange={(event) =>
                                setRequestAction(request.id, {
                                  adminNote: event.target.value,
                                })
                              }
                              placeholder="Optional admin note"
                            />
                          ) : (
                            request.adminNote || "No note added"
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          {canManageLeaves ? (
                            <div className="flex min-w-[220px] flex-col gap-3">
                              <select
                                className={inputClassName}
                                value={action.status}
                                onChange={(event) =>
                                  setRequestAction(request.id, {
                                    status: event.target.value as LeaveRequestStatus,
                                  })
                                }
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => void handleUpdateLeaveRequest(request.id)}
                                className="rounded-2xl bg-[var(--color-dark)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
                              >
                                Save Status
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditRequest(request)}
                                className="rounded-2xl border border-[var(--color-line)] px-4 py-3 font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)] hover:bg-[rgba(8,96,108,0.05)]"
                              >
                                Edit Leave
                              </button>
                            </div>
                          ) : (
                            new Date(request.updatedAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {canManageLeaves && editingRequest ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-3xl rounded-[1.8rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Edit Leave Request</p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">
                  Update approved leave from admin side
                </h3>
                <p className="muted-copy mt-2 text-sm">
                  Change dates, reason, status, or admin note and save the updated leave request.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="rounded-full border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Leave Type
                </span>
                <select
                  className={inputClassName}
                  value={editingRequest.leaveTypeId}
                  onChange={(event) =>
                    setEditingRequest((current) =>
                      current ? { ...current, leaveTypeId: event.target.value } : current
                    )
                  }
                >
                  {state.leaveTypes
                    .filter((type) => type.isActive)
                    .map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Status
                </span>
                <select
                  className={inputClassName}
                  value={editingRequest.status}
                  onChange={(event) =>
                    setEditingRequest((current) =>
                      current
                        ? {
                            ...current,
                            status: event.target.value as LeaveRequestStatus,
                          }
                        : current
                    )
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Leave Duration
                </span>
                <select
                  className={inputClassName}
                  value={editingRequest.leavePortion}
                  onChange={(event) =>
                    setEditingRequest((current) =>
                      current
                        ? {
                            ...current,
                            leavePortion: event.target.value as LeavePortion,
                            halfDaySession:
                              event.target.value === "half-day" ? current.halfDaySession : "",
                            endDate:
                              event.target.value === "half-day"
                                ? current.startDate
                                : current.endDate,
                          }
                        : current
                    )
                  }
                >
                  <option value="full-day">Full Day</option>
                  <option value="half-day">Half Day</option>
                </select>
              </label>
              <div />
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Start Date
                </span>
                <input
                  className={inputClassName}
                  type="date"
                  value={editingRequest.startDate}
                  onChange={(event) =>
                    setEditingRequest((current) =>
                      current
                        ? {
                            ...current,
                            startDate: event.target.value,
                            endDate:
                              current.leavePortion === "half-day"
                                ? event.target.value
                                : current.endDate,
                          }
                        : current
                    )
                  }
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  End Date
                </span>
                <input
                  className={inputClassName}
                  type="date"
                  value={editingRequest.endDate}
                  onChange={(event) =>
                    setEditingRequest((current) =>
                      current ? { ...current, endDate: event.target.value } : current
                    )
                  }
                  disabled={editingRequest.leavePortion === "half-day"}
                />
              </label>
              {editingRequest.leavePortion === "half-day" ? (
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    Half Day Session
                  </span>
                  <select
                    className={inputClassName}
                    value={editingRequest.halfDaySession}
                    onChange={(event) =>
                      setEditingRequest((current) =>
                        current
                          ? {
                              ...current,
                              halfDaySession: event.target.value as HalfDaySession | "",
                            }
                          : current
                      )
                    }
                  >
                    <option value="">Select session</option>
                    <option value="first-half">First Half</option>
                    <option value="second-half">Second Half</option>
                  </select>
                </label>
              ) : null}
              <textarea
                className={`${inputClassName} min-h-28 resize-y md:col-span-2`}
                value={editingRequest.reason}
                onChange={(event) =>
                  setEditingRequest((current) =>
                    current ? { ...current, reason: event.target.value } : current
                  )
                }
                placeholder="Reason for leave"
              />
              <textarea
                className={`${inputClassName} min-h-28 resize-y md:col-span-2`}
                value={editingRequest.adminNote}
                onChange={(event) =>
                  setEditingRequest((current) =>
                    current ? { ...current, adminNote: event.target.value } : current
                  )
                }
                placeholder="Optional admin note"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSaveEditedRequest()}
                disabled={isSavingEdit}
                className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="rounded-2xl border border-[var(--color-line)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
