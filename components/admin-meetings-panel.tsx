"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { EmployeeRecord, InternalMeetingRecord } from "@/lib/crm";

function formatMeetingDate(value?: string | null) {
  if (!value) {
    return "Instant room";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMeetingUrl(roomCode: string) {
  if (typeof window === "undefined") {
    return `/meet/${roomCode}`;
  }

  return `${window.location.origin}/meet/${roomCode}`;
}

export function AdminMeetingsPanel() {
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [meetings, setMeetings] = useState<InternalMeetingRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [participantEmployeeIds, setParticipantEmployeeIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copiedRoomCode, setCopiedRoomCode] = useState("");

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    Promise.all([
      fetch("/api/admin/meetings", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/employees", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([meetingsResponse, employeesResponse]) => {
        const meetingsResult = (await meetingsResponse.json()) as {
          meetings?: InternalMeetingRecord[];
          message?: string;
        };
        const employeesResult = (await employeesResponse.json()) as {
          employees?: EmployeeRecord[];
          message?: string;
        };

        if (!meetingsResponse.ok) {
          throw new Error(meetingsResult.message || "Unable to load meetings.");
        }
        if (!employeesResponse.ok) {
          throw new Error(employeesResult.message || "Unable to load employees.");
        }

        setMeetings(meetingsResult.meetings ?? []);
        setEmployees(employeesResult.employees ?? []);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load meetings.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.status === "active"),
    [employees]
  );

  const upcomingMeetings = useMemo(
    () =>
      [...meetings].sort((a, b) => {
        const aTime = a.startsAt ? new Date(a.startsAt).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.startsAt ? new Date(b.startsAt).getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      }),
    [meetings]
  );

  function toggleParticipant(employeeId: string) {
    setParticipantEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );
  }

  async function copyMeetingLink(roomCode: string) {
    const url = getMeetingUrl(roomCode);
    await navigator.clipboard.writeText(url);
    setCopiedRoomCode(roomCode);
    window.setTimeout(() => setCopiedRoomCode(""), 1800);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || isSaving) {
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const duration = Number(durationMinutes) || 30;
      const endsAt =
        startsAt && duration > 0
          ? new Date(new Date(startsAt).getTime() + duration * 60 * 1000).toISOString()
          : undefined;

      const response = await fetch("/api/admin/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
          endsAt,
          participantEmployeeIds,
        }),
      });
      const result = (await response.json()) as InternalMeetingRecord & { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to create meeting.");
      }

      setMeetings((current) => [result, ...current]);
      setTitle("");
      setDescription("");
      setStartsAt("");
      setDurationMinutes("30");
      setParticipantEmployeeIds([]);
      await copyMeetingLink(result.roomCode);
      setSuccessMessage("Meeting link created and copied.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create meeting.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <form onSubmit={handleSubmit} className="crm-panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Create link</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">New internal meeting</h2>
          </div>
          <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-dark)]">
            Team only
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Meeting title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              placeholder="Daily standup"
              className="mt-2 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-dark)]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Agenda or note</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Hiring updates, blockers, next actions"
              className="mt-2 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-dark)]"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Start time</span>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Minutes</span>
              <input
                type="number"
                min="5"
                step="5"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>
          </div>

          <div>
            <span className="text-sm font-semibold text-slate-800">Invite team members</span>
            <div className="mt-2 max-h-44 space-y-2 overflow-auto rounded-xl border border-[var(--color-line)] bg-white p-2">
              {activeEmployees.length === 0 ? (
                <p className="px-2 py-4 text-sm text-[var(--color-muted)]">No active employees found.</p>
              ) : (
                activeEmployees.map((employee) => (
                  <label
                    key={employee.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={participantEmployeeIds.includes(employee.id)}
                      onChange={() => toggleParticipant(employee.id)}
                      className="h-4 w-4 accent-[var(--color-dark)]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">
                        {employee.fullName}
                      </span>
                      <span className="block truncate text-xs text-[var(--color-muted)]">
                        {employee.employeeCode || employee.email}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm font-semibold text-red-700">{error}</p> : null}
        {successMessage ? (
          <p className="mt-4 text-sm font-semibold text-[var(--color-dark)]">{successMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSaving || !title.trim()}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#064d56] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isSaving ? "Creating..." : "Create and copy meeting link"}
        </button>
      </form>

      <section className="crm-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Meeting links</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Recent rooms</h2>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <div className="rounded-xl border border-dashed border-[var(--color-line)] p-6 text-sm text-[var(--color-muted)]">
              Loading meetings...
            </div>
          ) : upcomingMeetings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-line)] p-6 text-sm text-[var(--color-muted)]">
              Create your first room link when the team is ready.
            </div>
          ) : (
            upcomingMeetings.map((meeting) => (
              <article
                key={meeting.id}
                className="rounded-xl border border-[var(--color-line)] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-slate-950">
                      {meeting.title}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {formatMeetingDate(meeting.startsAt)} · Created by{" "}
                      {meeting.createdByName || "Werkly User"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[rgba(241,166,75,0.14)] px-3 py-1 text-xs font-semibold capitalize text-[var(--color-accent-strong)]">
                    {meeting.status}
                  </span>
                </div>

                {meeting.description ? (
                  <p className="mt-3 text-sm text-slate-700">{meeting.description}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/meet/${meeting.roomCode}`}
                    className="rounded-xl bg-[var(--color-dark)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#064d56]"
                  >
                    Open room
                  </Link>
                  <button
                    type="button"
                    onClick={() => copyMeetingLink(meeting.roomCode)}
                    className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
                  >
                    {copiedRoomCode === meeting.roomCode ? "Copied" : "Copy link"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
