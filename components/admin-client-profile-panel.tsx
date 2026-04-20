"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminJobIdTrigger } from "@/components/admin-job-id-trigger";
import type {
  ClientFollowUpHistoryRecord,
  ClientFollowUpStatus,
  ClientRecord,
} from "@/lib/crm";

function formatDateLabel(value?: string) {
  if (!value) {
    return "Not added";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeLabel(value?: string) {
  if (!value) {
    return "Not added";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatFollowUpStage(stage?: string) {
  const safeStage = stage || "pending";
  return safeStage
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function FollowUpStatusPill({ status }: { status?: string }) {
  return (
    <span className="inline-flex rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
      {formatFollowUpStage(status)}
    </span>
  );
}

export function AdminClientProfilePanel({ clientId }: { clientId: string }) {
  const [token] = useState(
    typeof window !== "undefined"
      ? window.localStorage.getItem("werklyAdminToken") ?? ""
      : ""
  );
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [history, setHistory] = useState<ClientFollowUpHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [followUpStatus, setFollowUpStatus] = useState<ClientFollowUpStatus>("pending");
  const [lastFollowUpDate, setLastFollowUpDate] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      fetch(`/api/admin/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/admin/clients/${clientId}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([clientResponse, historyResponse]) => {
        const clientResult = (await clientResponse.json()) as ClientRecord & { message?: string };
        const historyResult = (await historyResponse.json()) as {
          history?: ClientFollowUpHistoryRecord[];
          message?: string;
        };

        if (!clientResponse.ok) {
          throw new Error(clientResult.message || "Unable to load client.");
        }

        if (!historyResponse.ok) {
          throw new Error(historyResult.message || "Unable to load client history.");
        }

        setClient(clientResult);
        setHistory(historyResult.history ?? []);
        setFollowUpStatus(clientResult.followUpStatus || "pending");
        setLastFollowUpDate(clientResult.lastFollowUpDate || "");
        setNextFollowUpDate(clientResult.nextFollowUpDate || "");
        setFollowUpNotes(clientResult.followUpNotes || "");
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load client profile.");
      })
      .finally(() => setIsLoading(false));
  }, [clientId, token]);

  const historySummary = useMemo(
    () => ({
      total: history.length,
      closed: history.filter((item) => item.toStatus === "closed").length,
      due: history.filter((item) => item.toStatus === "follow-up-due").length,
    }),
    [history]
  );

  async function handleSaveFollowUp() {
    if (!token || !client) {
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/clients/${client.id}/follow-up`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          followUpStatus,
          lastFollowUpDate,
          nextFollowUpDate,
          followUpNotes,
        }),
      });

      const result = (await response.json()) as ClientRecord & { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to save follow-up.");
      }

      setClient(result);
      setMessage("Follow-up updated successfully.");

      const historyResponse = await fetch(`/api/admin/clients/${client.id}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const historyResult = (await historyResponse.json()) as {
        history?: ClientFollowUpHistoryRecord[];
        message?: string;
      };

      if (historyResponse.ok) {
        setHistory(historyResult.history ?? []);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save follow-up.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!token) {
    return (
      <section className="accent-card p-6">
        <p className="eyebrow">Session Required</p>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
          Sign in to view the client profile.
        </h2>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="accent-card p-6">
        <p className="muted-copy text-sm">Loading client profile...</p>
      </section>
    );
  }

  if (error && !client) {
    return (
      <section className="accent-card p-6">
        <p className="text-sm font-medium text-red-700">{error}</p>
      </section>
    );
  }

  if (!client) {
    return (
      <section className="accent-card p-6">
        <p className="muted-copy text-sm">Client not found.</p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="accent-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Client Profile</p>
            <h2 className="mt-4 text-3xl font-semibold text-[var(--color-ink)]">
              {client.companyName}
            </h2>
            <p className="muted-copy mt-3 max-w-3xl text-base leading-7">
              Review company details, onboarding stage, current follow-up status, linked jobs,
              and the latest CRM history for this account.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/clients/existing"
              className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
            >
              Back to Clients
            </Link>
            <Link
              href="/admin/reports/clients"
              className="rounded-2xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
            >
              Open Reports
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="accent-card p-5">
          <p className="eyebrow">Owner</p>
          <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            {client.assignedEmployeeName || "Not assigned"}
          </p>
        </article>
        <article className="accent-card p-5">
          <p className="eyebrow">Onboarding</p>
          <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            {formatFollowUpStage(client.onboardingStatus || "new-lead")}
          </p>
        </article>
        <article className="accent-card p-5">
          <p className="eyebrow">Follow-Up Status</p>
          <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            {formatFollowUpStage(client.followUpStatus)}
          </p>
        </article>
        <article className="accent-card p-5">
          <p className="eyebrow">Linked Jobs</p>
          <p className="mt-3 text-xl font-semibold text-[var(--color-ink)]">
            {client.linkedJobsCount}
          </p>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <article className="accent-card p-6">
          <p className="eyebrow">Account Details</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Contact Person", client.contactPerson],
              ["Contact Email", client.contactEmail || "Not added"],
              ["Contact Phone", client.contactPhone || "Not added"],
              ["Sector", client.sector || "Not added"],
              ["Branch", client.branch || "Not added"],
              ["Client Status", formatFollowUpStage(client.status)],
              ["Onboarding Source", client.onboardingSource || "Not added"],
              ["Created On", formatDateLabel(client.createdAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.2rem] border border-[var(--color-line)] bg-white p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  {label}
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[1.2rem] border border-[var(--color-line)] bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              Onboarding Notes
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              {client.notes || "No onboarding notes added yet."}
            </p>
          </div>
        </article>

        <article className="accent-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Quick Update</p>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                Update client follow-up
              </h3>
            </div>
            <FollowUpStatusPill status={followUpStatus} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Follow-Up Status
              </span>
              <select
                value={followUpStatus}
                onChange={(event) =>
                  setFollowUpStatus(event.target.value as ClientFollowUpStatus)
                }
                className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
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
                type="date"
                value={lastFollowUpDate}
                onChange={(event) => setLastFollowUpDate(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Next Follow-Up Date
              </span>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(event) => setNextFollowUpDate(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Follow-Up Notes
              </span>
              <textarea
                value={followUpNotes}
                onChange={(event) => setFollowUpNotes(event.target.value)}
                className="mt-2 min-h-[160px] w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                placeholder="Add the latest client discussion, commitments, blockers, or next steps."
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSaveFollowUp()}
              disabled={isSaving}
              className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : "Save Follow-Up"}
            </button>
            {message ? <p className="self-center text-sm text-[var(--color-dark)]">{message}</p> : null}
            {error ? <p className="self-center text-sm text-red-700">{error}</p> : null}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
        <article className="accent-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Linked Jobs</p>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                Jobs mapped to this client
              </h3>
            </div>
            <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
              {client.linkedJobsCount} jobs
            </span>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.35rem] border border-[var(--color-line)] bg-white">
            {client.linkedJobs.length === 0 ? (
              <p className="muted-copy p-5 text-sm">No jobs are linked to this client yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-[rgba(8,96,108,0.05)] text-left">
                      {["Job ID", "Title", "Status"].map((heading) => (
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
                    {client.linkedJobs.map((job, index) => (
                      <tr
                        key={job.id}
                        className={
                          index === client.linkedJobs.length - 1
                            ? "align-top"
                            : "align-top border-b border-[var(--color-line)]"
                        }
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-[var(--color-accent-strong)]">
                          <AdminJobIdTrigger
                            jobId={job.id}
                            jobCode={job.jobCode}
                            fallbackLabel="Pending"
                          />
                        </td>
                        <td className="px-4 py-4 text-sm text-[var(--color-ink)]">{job.title}</td>
                        <td className="px-4 py-4 text-sm text-[var(--color-muted)]">
                          <FollowUpStatusPill status={job.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </article>

        <article className="accent-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Follow-Up Timeline</p>
              <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                CRM follow-up history
              </h3>
            </div>
            <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
              {historySummary.total} entries
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              ["History Items", historySummary.total],
              ["Closed Updates", historySummary.closed],
              ["Due Updates", historySummary.due],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[1.2rem] border border-[var(--color-line)] bg-white p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{value}</p>
              </div>
            ))}
          </div>

          {history.length === 0 ? (
            <div className="mt-6 rounded-[1.25rem] border border-[var(--color-line)] bg-white p-5">
              <p className="muted-copy text-sm">No follow-up history is available yet.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {history.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-[1.25rem] border border-[var(--color-line)] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">
                        {entry.actorName || "Werkly User"}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {entry.actorRole ? formatFollowUpStage(entry.actorRole) : "Internal user"}
                      </p>
                    </div>
                    <FollowUpStatusPill status={entry.toStatus} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        Changed
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-ink)]">
                        {entry.fromStatus
                          ? `${formatFollowUpStage(entry.fromStatus)} -> ${formatFollowUpStage(entry.toStatus)}`
                          : formatFollowUpStage(entry.toStatus)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        Updated On
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-ink)]">
                        {formatDateTimeLabel(entry.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        Last Follow-Up
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-ink)]">
                        {formatDateLabel(entry.lastFollowUpDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        Next Follow-Up
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-ink)]">
                        {formatDateLabel(entry.nextFollowUpDate)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-[rgba(8,96,108,0.03)] px-4 py-3 text-sm leading-6 text-[var(--color-muted)]">
                    {entry.notes || "No remarks added for this follow-up update."}
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
