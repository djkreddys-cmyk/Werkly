"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  CalendarConnection,
  CalendarProvider,
  EmployeeRecord,
  InternalMeetingRecord,
} from "@/lib/crm";

const CALENDAR_PROVIDERS: { provider: CalendarProvider; label: string }[] = [
  { provider: "google", label: "Google Calendar" },
  { provider: "microsoft", label: "Outlook Calendar" },
];

function formatLocalDateKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayKey() {
  return formatLocalDateKey(new Date());
}

function normalizeDateKey(value?: string | null) {
  if (!value) {
    return "";
  }

  const directMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (directMatch) {
    return directMatch[0];
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : formatLocalDateKey(parsed);
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatMonthLabel(value: Date) {
  return value.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function buildCalendarDays(monthDate: Date) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(calendarStart);
    current.setDate(calendarStart.getDate() + index);
    const dateKey = formatLocalDateKey(current);

    return {
      key: dateKey,
      label: current.getDate(),
      dateKey,
      inMonth: current.getMonth() === monthDate.getMonth(),
    };
  });
}

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

function getDisplayMessage(error: unknown, fallback: string) {
  const rawMessage = error instanceof Error ? error.message : fallback;

  try {
    const parsed = JSON.parse(rawMessage) as { message?: string };
    return parsed.message || rawMessage;
  } catch {
    return rawMessage;
  }
}

export function AdminMeetingsPanel() {
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [meetings, setMeetings] = useState<InternalMeetingRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [participantEmployeeIds, setParticipantEmployeeIds] = useState<string[]>([]);
  const [editingRoomCode, setEditingRoomCode] = useState("");
  const [deletingRoomCode, setDeletingRoomCode] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [calendarMessage, setCalendarMessage] = useState("");
  const [calendarBusy, setCalendarBusy] = useState("");
  const [copiedRoomCode, setCopiedRoomCode] = useState("");
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const todayKey = getTodayKey();
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateKey(todayKey));

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
      fetch("/api/admin/calendar-connections", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([meetingsResponse, employeesResponse, calendarResponse]) => {
        const meetingsResult = (await meetingsResponse.json()) as {
          meetings?: InternalMeetingRecord[];
          message?: string;
        };
        const employeesResult = (await employeesResponse.json()) as {
          employees?: EmployeeRecord[];
          message?: string;
        };
        const calendarResult = (await calendarResponse.json()) as {
          connections?: CalendarConnection[];
          message?: string;
        };

        if (!meetingsResponse.ok) {
          throw new Error(meetingsResult.message || "Unable to load meetings.");
        }
        if (!employeesResponse.ok) {
          throw new Error(employeesResult.message || "Unable to load employees.");
        }
        if (!calendarResponse.ok) {
          throw new Error(calendarResult.message || "Unable to load calendar sync.");
        }

        setMeetings(meetingsResult.meetings ?? []);
        setEmployees(employeesResult.employees ?? []);
        setCalendarConnections(calendarResult.connections ?? []);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load meetings.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const provider = params.get("calendarProvider") as CalendarProvider | null;
    const code = params.get("code");
    const errorDescription = params.get("error_description") || params.get("error");

    if (errorDescription) {
      setCalendarMessage(`Calendar connection failed: ${errorDescription}`);
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    if (!provider || !code || !CALENDAR_PROVIDERS.some((item) => item.provider === provider)) {
      return;
    }

    const redirectUri = `${window.location.origin}${window.location.pathname}?calendarProvider=${provider}`;
    setCalendarBusy(provider);
    setCalendarMessage("Connecting calendar...");

    fetch(`/api/admin/calendar-connections/${provider}/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code, redirectUri }),
    })
      .then(async (response) => {
        const result = (await response.json()) as CalendarConnection & {
          message?: string;
        };
        if (!response.ok) {
          throw new Error(result.message || "Unable to connect calendar.");
        }

        setCalendarConnections((current) => [
          result,
          ...current.filter((connection) => connection.provider !== result.provider),
        ]);
        setCalendarMessage(`${result.connectedEmail || "Calendar"} connected.`);
      })
      .catch((connectError) => {
        setCalendarMessage(getDisplayMessage(connectError, "Unable to connect calendar."));
      })
      .finally(() => {
        setCalendarBusy("");
        window.history.replaceState(null, "", window.location.pathname);
      });
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

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);

  const meetingsByDate = useMemo(() => {
    return meetings.reduce<Record<string, InternalMeetingRecord[]>>((accumulator, meeting) => {
      const dateKey = normalizeDateKey(meeting.startsAt);
      if (!dateKey) {
        return accumulator;
      }

      accumulator[dateKey] = [...(accumulator[dateKey] ?? []), meeting];
      return accumulator;
    }, {});
  }, [meetings]);

  const selectedDateMeetings = useMemo(
    () =>
      [...(meetingsByDate[selectedDateKey] ?? [])].sort((a, b) =>
        String(a.startsAt || "").localeCompare(String(b.startsAt || ""))
      ),
    [meetingsByDate, selectedDateKey]
  );

  const selectedDateLabel = useMemo(
    () =>
      parseDateKey(selectedDateKey).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [selectedDateKey]
  );

  const employeeNamesById = useMemo(
    () =>
      employees.reduce<Record<string, string>>((accumulator, employee) => {
        accumulator[employee.id] = employee.fullName;
        return accumulator;
      }, {}),
    [employees]
  );

  function toggleParticipant(employeeId: string) {
    setParticipantEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setStartsAt("");
    setDurationMinutes("30");
    setParticipantEmployeeIds([]);
    setEditingRoomCode("");
  }

  function openCreateMeeting() {
    resetForm();
    setError("");
    setSuccessMessage("");
    setIsMeetingModalOpen(true);
  }

  function closeMeetingModal() {
    resetForm();
    setIsMeetingModalOpen(false);
  }

  function startEditingMeeting(meeting: InternalMeetingRecord) {
    setTitle(meeting.title);
    setDescription(meeting.description || "");
    setStartsAt(toDateTimeLocalValue(meeting.startsAt));
    setParticipantEmployeeIds(meeting.participantEmployeeIds);
    setEditingRoomCode(meeting.roomCode);
    setIsMeetingModalOpen(true);
    setError("");
    setSuccessMessage("");

    if (meeting.startsAt && meeting.endsAt) {
      const startTime = new Date(meeting.startsAt).getTime();
      const endTime = new Date(meeting.endsAt).getTime();
      const minutes = Math.max(5, Math.round((endTime - startTime) / 60000));
      setDurationMinutes(String(Number.isFinite(minutes) ? minutes : 30));
    } else {
      setDurationMinutes("30");
    }

  }

  async function copyMeetingLink(meeting: InternalMeetingRecord) {
    const url = getMeetingUrl(meeting.roomCode);
    await navigator.clipboard.writeText(
      [
        `Meeting Name: ${meeting.title}`,
        `Scheduled Time: ${formatMeetingDate(meeting.startsAt)}`,
        `Meeting Link: ${url}`,
      ].join("\n")
    );
    setCopiedRoomCode(meeting.roomCode);
    window.setTimeout(() => setCopiedRoomCode(""), 1800);
  }

  async function connectCalendar(provider: CalendarProvider) {
    if (!token || typeof window === "undefined") {
      return;
    }

    setCalendarBusy(provider);
    setCalendarMessage("");

    try {
      const redirectUri = `${window.location.origin}${window.location.pathname}?calendarProvider=${provider}`;
      const response = await fetch(
        `/api/admin/calendar-connections/${provider}/auth-url?redirectUri=${encodeURIComponent(
          redirectUri
        )}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = (await response.json()) as { url?: string; message?: string };

      if (!response.ok || !result.url) {
        throw new Error(result.message || "Unable to start calendar sync.");
      }

      window.location.href = result.url;
    } catch (connectError) {
      setCalendarBusy("");
      setCalendarMessage(getDisplayMessage(connectError, "Unable to start calendar sync."));
    }
  }

  async function disconnectCalendar(provider: CalendarProvider) {
    if (!token || calendarBusy) {
      return;
    }

    setCalendarBusy(provider);
    setCalendarMessage("");

    try {
      const response = await fetch(`/api/admin/calendar-connections/${provider}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to disconnect calendar.");
      }

      setCalendarConnections((current) =>
        current.filter((connection) => connection.provider !== provider)
      );
      setCalendarMessage("Calendar disconnected.");
    } catch (disconnectError) {
      setCalendarMessage(getDisplayMessage(disconnectError, "Unable to disconnect calendar."));
    } finally {
      setCalendarBusy("");
    }
  }

  async function syncMeetingCalendars(roomCode: string) {
    if (!token || calendarBusy) {
      return;
    }

    setCalendarBusy(`sync-${roomCode}`);
    setCalendarMessage("");

    try {
      const response = await fetch(`/api/admin/meetings/${roomCode}/calendar-sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = (await response.json()) as {
        syncs?: { provider: CalendarProvider; eventId: string }[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.message || "Unable to sync meeting calendars.");
      }

      setCalendarMessage(
        result.syncs?.length
          ? `Synced with ${result.syncs.length} connected calendar${result.syncs.length === 1 ? "" : "s"}.`
          : "No calendars are connected yet."
      );
    } catch (syncError) {
      setCalendarMessage(getDisplayMessage(syncError, "Unable to sync meeting calendars."));
    } finally {
      setCalendarBusy("");
    }
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

      const payload = {
        title,
        description,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt,
        participantEmployeeIds,
      };
      const response = await fetch(
        editingRoomCode ? `/api/admin/meetings/${editingRoomCode}` : "/api/admin/meetings",
        {
          method: editingRoomCode ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const result = (await response.json()) as InternalMeetingRecord & { message?: string };

      if (!response.ok) {
        throw new Error(
          result.message || (editingRoomCode ? "Unable to update meeting." : "Unable to create meeting.")
        );
      }

      setMeetings((current) =>
        editingRoomCode
          ? current.map((meeting) => (meeting.roomCode === result.roomCode ? result : meeting))
          : [result, ...current]
      );
      resetForm();
      setIsMeetingModalOpen(false);
      if (result.startsAt) {
        const savedDateKey = normalizeDateKey(result.startsAt);
        if (savedDateKey) {
          setSelectedDateKey(savedDateKey);
          setVisibleMonth(parseDateKey(savedDateKey));
        }
      }
      if (!editingRoomCode) {
        await copyMeetingLink(result);
      }
      setSuccessMessage(
        editingRoomCode
          ? "Meeting link updated."
          : "Meeting link created, copied, and notifications sent."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : editingRoomCode
            ? "Unable to update meeting."
            : "Unable to create meeting."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMeeting(roomCode: string) {
    if (!token || deletingRoomCode) {
      return;
    }

    const shouldDelete = window.confirm("Delete this meeting link? People with the link will no longer be able to open it.");
    if (!shouldDelete) {
      return;
    }

    setDeletingRoomCode(roomCode);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/admin/meetings/${roomCode}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete meeting.");
      }

      setMeetings((current) => current.filter((meeting) => meeting.roomCode !== roomCode));
      if (editingRoomCode === roomCode) {
        closeMeetingModal();
      }
      setSuccessMessage("Meeting link deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete meeting.");
    } finally {
      setDeletingRoomCode("");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openCreateMeeting}
          className="rounded-xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#064d56]"
        >
          Create new meeting
        </button>
        {successMessage ? (
          <span className="text-sm font-semibold text-[var(--color-dark)]">
            {successMessage}
          </span>
        ) : null}
        {error && !isMeetingModalOpen ? (
          <span className="text-sm font-semibold text-red-700">{error}</span>
        ) : null}
      </div>

      <div className="grid gap-6">
        <section className="crm-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Calendar sync</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Google and Outlook</h2>
            </div>
            <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-dark)]">
              {calendarConnections.length}/2 connected
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {CALENDAR_PROVIDERS.map(({ provider, label }) => {
              const connection = calendarConnections.find((item) => item.provider === provider);
              const isBusy = calendarBusy === provider;

              return (
                <div
                  key={provider}
                  className="rounded-xl border border-[var(--color-line)] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{label}</p>
                      <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
                        {connection
                          ? connection.connectedEmail || "Connected"
                          : "Not connected"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        connection
                          ? "bg-[rgba(8,96,108,0.08)] text-[var(--color-dark)]"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {connection ? "On" : "Off"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {connection ? (
                      <button
                        type="button"
                        onClick={() => disconnectCalendar(provider)}
                        disabled={Boolean(calendarBusy)}
                        className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isBusy ? "Disconnecting..." : "Disconnect"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => connectCalendar(provider)}
                        disabled={Boolean(calendarBusy)}
                        className="rounded-xl bg-[var(--color-dark)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#064d56] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isBusy ? "Opening..." : "Connect"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {calendarMessage ? (
            <p className="mt-4 text-sm font-semibold text-[var(--color-dark)]">
              {calendarMessage}
            </p>
          ) : null}
        </section>
      </div>

      {isMeetingModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="max-h-[calc(100dvh-3rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-2xl"
          >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{editingRoomCode ? "Edit link" : "Create link"}</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              {editingRoomCode ? "Update internal meeting" : "New internal meeting"}
            </h2>
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

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#064d56] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSaving
              ? editingRoomCode
                ? "Saving..."
                : "Creating..."
              : editingRoomCode
                ? "Update"
                : "Create and copy meeting link"}
          </button>
          <button
            type="button"
            onClick={closeMeetingModal}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
          >
            Cancel
          </button>
        </div>
          </form>
        </div>
      ) : null}

      <section className="crm-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Meeting calendar</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Scheduled meetings</h2>
          </div>
          <label className="min-w-[10rem]">
            <span className="sr-only">Selected meeting date</span>
            <input
              type="date"
              value={selectedDateKey}
              onChange={(event) => {
                setSelectedDateKey(event.target.value);
                setVisibleMonth(parseDateKey(event.target.value));
              }}
              className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--color-dark)]"
            />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-[var(--color-line)] bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                )
              }
              className="rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
            >
              Prev
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              {formatMonthLabel(visibleMonth)}
            </p>
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                )
              }
              className="rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
            >
              Next
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]"
              >
                {day}
              </div>
            ))}

            {calendarDays.map((day) => {
              const count = meetingsByDate[day.dateKey]?.length ?? 0;
              const isSelected = day.dateKey === selectedDateKey;
              const isToday = day.dateKey === todayKey;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDateKey(day.dateKey)}
                  className={`min-h-[3.35rem] rounded-lg border px-2 py-1.5 text-left transition ${
                    isSelected
                      ? "border-[var(--color-dark)] bg-[rgba(8,96,108,0.09)]"
                      : isToday
                        ? "border-[var(--color-accent)] bg-[rgba(241,166,75,0.12)] hover:border-[var(--color-dark)]"
                        : "border-[var(--color-line)] bg-white hover:border-[var(--color-dark)]"
                  } ${day.inMonth ? "text-slate-900" : "text-slate-400"}`}
                >
                  <span
                    className={`text-xs font-semibold ${
                      isToday ? "text-[var(--color-accent-strong)]" : ""
                    }`}
                  >
                    {day.label}
                  </span>
                  {count > 0 ? (
                    <span className="mt-1 block w-fit rounded-full bg-[rgba(190,72,26,0.12)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-accent-strong)]">
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-950">{selectedDateLabel}</h3>
            <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold text-[var(--color-dark)]">
              {selectedDateMeetings.length} scheduled
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {selectedDateMeetings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--color-line)] p-4 text-sm text-[var(--color-muted)]">
                No scheduled meetings for this date.
              </p>
            ) : (
              selectedDateMeetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/meet/${meeting.roomCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-[var(--color-line)] bg-white p-3 transition hover:border-[var(--color-dark)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {meeting.title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {formatMeetingDate(meeting.startsAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[rgba(241,166,75,0.14)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[var(--color-accent-strong)]">
                      {meeting.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    Invited:{" "}
                    {meeting.participantEmployeeIds.length
                      ? meeting.participantEmployeeIds
                          .map((id) => employeeNamesById[id] || "Team member")
                          .join(", ")
                      : "All team members"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="crm-panel p-5 xl:col-span-2">
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
                      {formatMeetingDate(meeting.startsAt)} - Created by{" "}
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
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-[var(--color-dark)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#064d56]"
                  >
                    Open room
                  </Link>
                  <button
                    type="button"
                    onClick={() => copyMeetingLink(meeting)}
                    className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
                  >
                    {copiedRoomCode === meeting.roomCode ? "Copied" : "Copy link"}
                  </button>
                  <a
                    href={`/api/meetings/${meeting.roomCode}/ics`}
                    className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
                  >
                    Add to calendar
                  </a>
                  <button
                    type="button"
                    onClick={() => syncMeetingCalendars(meeting.roomCode)}
                    disabled={Boolean(calendarBusy)}
                    className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {calendarBusy === `sync-${meeting.roomCode}` ? "Syncing..." : "Sync calendars"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditingMeeting(meeting)}
                    className="rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm font-semibold text-[var(--color-dark)] transition hover:bg-[rgba(8,96,108,0.06)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMeeting(meeting.roomCode)}
                    disabled={deletingRoomCode === meeting.roomCode}
                    className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingRoomCode === meeting.roomCode ? "Deleting..." : "Delete"}
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
