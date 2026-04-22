"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EmployeeRecord } from "@/lib/crm";
import type { ShiftAssignmentRecord, ShiftRecord } from "@/lib/shifts";

type ShiftState = {
  shifts: ShiftRecord[];
  assignments: ShiftAssignmentRecord[];
  employees: EmployeeRecord[];
};

const inputClassName =
  "w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]";

const weekDayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDate(value?: string) {
  if (!value) {
    return "Open ended";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeLabel(value: string) {
  const [hours = "00", minutes = "00"] = String(value || "").split(":");
  const parsedHours = Number(hours);
  const period = parsedHours >= 12 ? "PM" : "AM";
  const displayHour = parsedHours % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
}

export function AdminShiftsPanel() {
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
  const [state, setState] = useState<ShiftState>({
    shifts: [],
    assignments: [],
    employees: [],
  });
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSavingShift, setIsSavingShift] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shiftName, setShiftName] = useState("");
  const [shiftCode, setShiftCode] = useState("");
  const [shiftStartTime, setShiftStartTime] = useState("09:30");
  const [shiftEndTime, setShiftEndTime] = useState("18:30");
  const [shiftBreakMinutes, setShiftBreakMinutes] = useState("60");
  const [shiftGraceMinutes, setShiftGraceMinutes] = useState("15");
  const [shiftWorkingDays, setShiftWorkingDays] = useState<string[]>([
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
  ]);
  const [shiftNotes, setShiftNotes] = useState("");
  const [assignmentEmployeeId, setAssignmentEmployeeId] = useState("");
  const [assignmentShiftId, setAssignmentShiftId] = useState("");
  const [assignmentFromDate, setAssignmentFromDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [assignmentToDate, setAssignmentToDate] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");

  const canManageShifts = authType === "admin" || authRole === "super-admin";

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
        throw new Error(result.message || "Unable to load shifts.");
      }

      return result;
    };

    const results = canManageShifts
      ? await Promise.all([
          loadJson("/api/admin/shifts"),
          loadJson("/api/admin/shifts/assignments"),
          loadJson("/api/admin/employees"),
        ])
      : await Promise.all([
          loadJson("/api/admin/shifts"),
          loadJson("/api/admin/shifts/assignments"),
        ]);

    const [shiftsResult, assignmentsResult, employeesResult] = results;

    setState({
      shifts: shiftsResult.shifts ?? [],
      assignments: assignmentsResult.assignments ?? [],
      employees: employeesResult?.employees ?? [],
    });
  }, [canManageShifts, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    loadState()
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load shifts.");
      })
      .finally(() => setIsLoading(false));
  }, [loadState, token]);

  const visibleAssignments = useMemo(() => {
    if (canManageShifts) {
      return state.assignments;
    }

    return state.assignments;
  }, [canManageShifts, state.assignments]);

  function toggleWorkingDay(day: string) {
    setShiftWorkingDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day]
    );
  }

  async function handleCreateShift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!shiftWorkingDays.length) {
      setError("Select at least one working day for the shift.");
      return;
    }

    setIsSavingShift(true);

    try {
      const response = await fetch("/api/admin/shifts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: shiftName,
          code: shiftCode,
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          breakMinutes: Number(shiftBreakMinutes || 0),
          graceMinutes: Number(shiftGraceMinutes || 0),
          workingDays: shiftWorkingDays,
          notes: shiftNotes,
          isActive: true,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to create shift.");
      }

      setShiftName("");
      setShiftCode("");
      setShiftStartTime("09:30");
      setShiftEndTime("18:30");
      setShiftBreakMinutes("60");
      setShiftGraceMinutes("15");
      setShiftWorkingDays(["Mon", "Tue", "Wed", "Thu", "Fri"]);
      setShiftNotes("");
      setSuccess("Shift created successfully.");
      await loadState();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to create shift."
      );
    } finally {
      setIsSavingShift(false);
    }
  }

  async function handleAssignShift(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSavingAssignment(true);

    try {
      const response = await fetch("/api/admin/shifts/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: assignmentEmployeeId,
          shiftId: assignmentShiftId,
          effectiveFromDate: assignmentFromDate,
          effectiveToDate: assignmentToDate || undefined,
          assignmentNote,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to assign shift.");
      }

      setAssignmentEmployeeId("");
      setAssignmentShiftId("");
      setAssignmentFromDate(new Date().toISOString().slice(0, 10));
      setAssignmentToDate("");
      setAssignmentNote("");
      setSuccess("Shift assigned successfully.");
      await loadState();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Unable to assign shift."
      );
    } finally {
      setIsSavingAssignment(false);
    }
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

      {canManageShifts ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <form className="accent-card p-7" onSubmit={handleCreateShift}>
            <p className="eyebrow">Shift Master</p>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
              Create reusable staff shifts.
            </h2>
            <p className="muted-copy mt-3 text-sm">
              Add as many shift templates as needed for future teams, timings, and locations.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                className={inputClassName}
                value={shiftName}
                onChange={(event) => setShiftName(event.target.value)}
                placeholder="General Shift"
                required
              />
              <input
                className={inputClassName}
                value={shiftCode}
                onChange={(event) => setShiftCode(event.target.value)}
                placeholder="GEN-A"
              />
              <input
                className={inputClassName}
                type="time"
                value={shiftStartTime}
                onChange={(event) => setShiftStartTime(event.target.value)}
                required
              />
              <input
                className={inputClassName}
                type="time"
                value={shiftEndTime}
                onChange={(event) => setShiftEndTime(event.target.value)}
                required
              />
              <input
                className={inputClassName}
                type="number"
                min="0"
                step="5"
                value={shiftBreakMinutes}
                onChange={(event) => setShiftBreakMinutes(event.target.value)}
                placeholder="Break minutes"
              />
              <input
                className={inputClassName}
                type="number"
                min="0"
                step="5"
                value={shiftGraceMinutes}
                onChange={(event) => setShiftGraceMinutes(event.target.value)}
                placeholder="Grace minutes"
              />
              <div className="md:col-span-2">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Working Days
                </p>
                <div className="flex flex-wrap gap-2">
                  {weekDayOptions.map((day) => {
                    const isSelected = shiftWorkingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkingDay(day)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          isSelected
                            ? "border-[var(--color-dark)] bg-[rgba(8,96,108,0.08)] text-[var(--color-dark)]"
                            : "border-[var(--color-line)] bg-white text-[var(--color-muted)]"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <textarea
                className={`${inputClassName} min-h-28 resize-y md:col-span-2`}
                value={shiftNotes}
                onChange={(event) => setShiftNotes(event.target.value)}
                placeholder="Optional shift notes, location notes, or future staffing comments"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingShift}
              className="mt-6 rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingShift ? "Saving..." : "Create Shift"}
            </button>
          </form>

          <form className="accent-card p-7" onSubmit={handleAssignShift}>
            <p className="eyebrow">Shift Assignment</p>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
              Assign shifts to staff with date ranges.
            </h2>
            <p className="muted-copy mt-3 text-sm">
              This supports future shift changes because each assignment is stored separately with an effective period.
            </p>
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
                value={assignmentShiftId}
                onChange={(event) => setAssignmentShiftId(event.target.value)}
                required
              >
                <option value="">Select shift</option>
                {state.shifts
                  .filter((shift) => shift.isActive)
                  .map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.name} ({formatTimeLabel(shift.startTime)} - {formatTimeLabel(shift.endTime)})
                    </option>
                  ))}
              </select>
              <input
                className={inputClassName}
                type="date"
                value={assignmentFromDate}
                onChange={(event) => setAssignmentFromDate(event.target.value)}
                required
              />
              <input
                className={inputClassName}
                type="date"
                value={assignmentToDate}
                onChange={(event) => setAssignmentToDate(event.target.value)}
              />
              <textarea
                className={`${inputClassName} min-h-28 resize-y md:col-span-2`}
                value={assignmentNote}
                onChange={(event) => setAssignmentNote(event.target.value)}
                placeholder="Optional note like week rotation, branch coverage, or temporary support"
              />
            </div>
            <button
              type="submit"
              disabled={isSavingAssignment}
              className="mt-6 rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingAssignment ? "Saving..." : "Assign Shift"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="accent-card p-7">
        <p className="eyebrow">{canManageShifts ? "Shift Templates" : "Available Shifts"}</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
          {canManageShifts
            ? "Review all shifts created for the organization."
            : "Reference the configured shift templates used in the CRM."}
        </h2>

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading shifts...</p>
        ) : state.shifts.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">No shifts have been created yet.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {["Shift", "Timing", "Break / Grace", "Working Days", "Notes"].map((heading) => (
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
                  {state.shifts.map((shift, index) => (
                    <tr
                      key={shift.id}
                      className={
                        index === state.shifts.length - 1
                          ? "align-top"
                          : "align-top border-b border-[var(--color-line)]"
                      }
                    >
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        <p className="font-semibold text-[var(--color-ink)]">{shift.name}</p>
                        <p className="mt-1">{shift.code || "Code not added"}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {formatTimeLabel(shift.startTime)} to {formatTimeLabel(shift.endTime)}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        Break {shift.breakMinutes} min
                        <br />
                        Grace {shift.graceMinutes} min
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {shift.workingDays.join(", ")}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {shift.notes || "No notes added"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="accent-card p-7">
        <p className="eyebrow">{canManageShifts ? "Assigned Shifts" : "My Shift Plan"}</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
          {canManageShifts
            ? "Review all employee shift assignments."
            : "Track the shifts assigned to your login over time."}
        </h2>

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading shift assignments...</p>
        ) : visibleAssignments.length === 0 ? (
          <p className="muted-copy mt-6 text-sm">
            {canManageShifts
              ? "No shift assignments have been created yet."
              : "No shifts are assigned to your login yet."}
          </p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[1.6rem] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                    {[
                      canManageShifts ? "Employee" : "Shift",
                      canManageShifts ? "Shift" : "Timing",
                      "Effective Period",
                      "Working Days",
                      "Remarks",
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
                  {visibleAssignments.map((assignment, index) => (
                    <tr
                      key={assignment.id}
                      className={
                        index === visibleAssignments.length - 1
                          ? "align-top"
                          : "align-top border-b border-[var(--color-line)]"
                      }
                    >
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {canManageShifts ? (
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
                            {assignment.shiftName}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {canManageShifts ? (
                          <>
                            <p className="font-semibold text-[var(--color-ink)]">
                              {assignment.shiftName}
                            </p>
                            <p className="mt-1">
                              {formatTimeLabel(assignment.shiftStartTime)} -{" "}
                              {formatTimeLabel(assignment.shiftEndTime)}
                            </p>
                          </>
                        ) : (
                          <>
                            {formatTimeLabel(assignment.shiftStartTime)} -{" "}
                            {formatTimeLabel(assignment.shiftEndTime)}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {formatDate(assignment.effectiveFromDate)} to{" "}
                        {formatDate(assignment.effectiveToDate)}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {assignment.workingDays.join(", ")}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                        {assignment.assignmentNote || "No remarks added"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
