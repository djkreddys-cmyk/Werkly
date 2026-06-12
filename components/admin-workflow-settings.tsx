"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ApprovalRequestRecord, SlaRuleRecord } from "@/lib/workflow";

function formatDateTime(value?: string) {
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

function labelize(value?: string) {
  return String(value || "not-added")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getApprovalActionHref(approval: ApprovalRequestRecord) {
  switch (approval.entityType) {
    case "client":
      return approval.entityId ? `/admin/clients/${approval.entityId}` : "";
    case "application":
    case "job-application":
      return approval.entityId ? `/admin/candidates/${approval.entityId}` : "/admin/candidates?type=applicants#job-applicants";
    case "candidate":
      return "/admin/candidates?type=applicants#job-applicants";
    case "leave-request":
      return "/admin/leaves";
    default:
      return "";
  }
}

export function AdminWorkflowSettings() {
  const [token] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("werklyAdminToken") ?? "" : ""
  );
  const [approvals, setApprovals] = useState<ApprovalRequestRecord[]>([]);
  const [rules, setRules] = useState<SlaRuleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ApprovalRequestRecord["requestStatus"]>("pending");
  const [entityFilter, setEntityFilter] = useState("all");
  const [requestTypeFilter, setRequestTypeFilter] = useState("all");
  const [approvalQuery, setApprovalQuery] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      fetch("/api/admin/approvals", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/sla-rules", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([approvalsResponse, rulesResponse]) => {
        const approvalsResult = (await approvalsResponse.json()) as {
          approvals?: ApprovalRequestRecord[];
          message?: string;
        };
        const rulesResult = (await rulesResponse.json()) as {
          rules?: SlaRuleRecord[];
          message?: string;
        };

        if (!approvalsResponse.ok) {
          throw new Error(approvalsResult.message || "Unable to load approvals.");
        }
        if (!rulesResponse.ok) {
          throw new Error(rulesResult.message || "Unable to load SLA rules.");
        }

        setApprovals(approvalsResult.approvals ?? []);
        setRules(rulesResult.rules ?? []);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load workflow settings.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const pendingApprovals = useMemo(
    () => approvals.filter((approval) => approval.requestStatus === "pending"),
    [approvals]
  );
  const filteredApprovals = useMemo(() => {
    const normalizedQuery = approvalQuery.trim().toLowerCase();
    return approvals.filter((approval) => {
      if (statusFilter !== "all" && approval.requestStatus !== statusFilter) {
        return false;
      }
      if (entityFilter !== "all" && approval.entityType !== entityFilter) {
        return false;
      }
      if (requestTypeFilter !== "all" && approval.requestType !== requestTypeFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      return [
        approval.entityLabel,
        approval.requestType,
        approval.entityType,
        approval.requestedByEmployeeName,
        approval.reason,
        approval.remarks,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [approvalQuery, approvals, entityFilter, requestTypeFilter, statusFilter]);
  const entityOptions = useMemo(
    () => Array.from(new Set(approvals.map((approval) => approval.entityType).filter(Boolean))).sort(),
    [approvals]
  );
  const requestTypeOptions = useMemo(
    () => Array.from(new Set(approvals.map((approval) => approval.requestType).filter(Boolean))).sort(),
    [approvals]
  );

  async function handleApprovalAction(id: string, requestStatus: "approved" | "rejected") {
    if (!token) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/approvals/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestStatus }),
      });
      const result = (await response.json()) as ApprovalRequestRecord & { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to update approval.");
      }

      setApprovals((current) =>
        current.map((approval) => (approval.id === id ? result : approval))
      );
      setSuccess(`Approval request ${requestStatus} and removed from the pending queue.`);
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : "Unable to update approval.");
    }
  }

  async function saveRules() {
    if (!token) {
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/sla-rules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rules }),
      });
      const result = (await response.json()) as { rules?: SlaRuleRecord[]; message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to update SLA rules.");
      }

      setRules(result.rules ?? []);
      setSuccess("Workflow settings updated successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update workflow settings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function runReminderWorkflow() {
    if (!token) {
      return;
    }

    setIsRunningWorkflow(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/workflows/run-sla", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message || "Unable to run reminder workflow.");
      }

      setSuccess("Reminder workflow executed and notifications were refreshed.");
    } catch (workflowError) {
      setError(
        workflowError instanceof Error
          ? workflowError.message
          : "Unable to run reminder workflow."
      );
    } finally {
      setIsRunningWorkflow(false);
    }
  }

  if (!token) {
    return (
      <section className="accent-card p-8">
        <p className="eyebrow">Session Required</p>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
          Sign in to manage workflow settings.
        </h2>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="accent-card p-7">
        <p className="eyebrow">Workflow Settings</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
          Control approvals and SLA escalation rules.
        </h2>
        <p className="muted-copy mt-3 max-w-4xl text-base leading-7">
          This page gives Super Admin one place for pending approvals and operational SLA rules
          like overdue follow-ups, stalled candidates, and jobs without applicants.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Pending Approvals", value: pendingApprovals.length },
          {
            label: "Approved Requests",
            value: approvals.filter((approval) => approval.requestStatus === "approved").length,
          },
          {
            label: "Rejected Requests",
            value: approvals.filter((approval) => approval.requestStatus === "rejected").length,
          },
        ].map((item) => (
          <article key={item.label} className="accent-card p-5">
            <p className="eyebrow">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--color-ink)]">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="accent-card p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Approval Queue</p>
            <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
              Review sensitive CRM requests
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void runReminderWorkflow()}
            disabled={isRunningWorkflow}
            className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isRunningWorkflow ? "Running..." : "Run Reminder Check"}
          </button>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_220px_220px]">
          <input
            value={approvalQuery}
            onChange={(event) => setApprovalQuery(event.target.value)}
            placeholder="Search request, employee, reason"
            className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={entityFilter}
            onChange={(event) => setEntityFilter(event.target.value)}
            className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
          >
            <option value="all">All entities</option>
            {entityOptions.map((option) => (
              <option key={option} value={option}>
                {labelize(option)}
              </option>
            ))}
          </select>
          <select
            value={requestTypeFilter}
            onChange={(event) => setRequestTypeFilter(event.target.value)}
            className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
          >
            <option value="all">All request types</option>
            {requestTypeOptions.map((option) => (
              <option key={option} value={option}>
                {labelize(option)}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className="muted-copy mt-6 text-sm">Loading workflow settings...</p>
        ) : filteredApprovals.length === 0 ? (
          <div className="mt-6 rounded-[1.25rem] border border-[var(--color-line)] bg-white p-5">
            <p className="muted-copy text-sm">No approval requests matched the current filters.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredApprovals.map((approval) => (
              <article
                key={approval.id}
                className="rounded-[1.25rem] border border-[var(--color-line)] bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">
                      {approval.entityLabel || labelize(approval.requestType)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {labelize(approval.requestType)} · {labelize(approval.entityType)}
                    </p>
                  </div>
                  <span className="rounded-full bg-[rgba(241,166,75,0.16)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-strong)]">
                    {labelize(approval.requestStatus)}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Requested By
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-ink)]">
                      {approval.requestedByEmployeeName || "System"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Created On
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-ink)]">
                      {formatDateTime(approval.createdAt)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
                  {approval.reason || approval.remarks || "No reason was added for this request."}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Effective From
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-ink)]">
                      {formatDateTime(approval.effectiveFromDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Effective To
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-ink)]">
                      {formatDateTime(approval.effectiveToDate)}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  {approval.requestStatus === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleApprovalAction(approval.id, "approved")}
                        className="rounded-2xl bg-[var(--color-dark)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)]"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleApprovalAction(approval.id, "rejected")}
                        className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                  {getApprovalActionHref(approval) ? (
                    <Link
                      href={getApprovalActionHref(approval)}
                      className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                    >
                      Open Record
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="accent-card p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">SLA Rules</p>
            <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
              Decide what should escalate automatically
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void saveRules()}
            disabled={isSaving}
            className="rounded-2xl bg-[var(--color-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save Rules"}
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          {rules.map((rule) => (
            <article
              key={rule.id}
              className="rounded-[1.25rem] border border-[var(--color-line)] bg-white p-5"
            >
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="font-semibold text-[var(--color-ink)]">{rule.label}</p>
                  <p className="muted-copy mt-2 text-sm leading-6">
                    {rule.description || "No description added."}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Days
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={rule.thresholdDays}
                      onChange={(event) =>
                        setRules((current) =>
                          current.map((item) =>
                            item.id === rule.id
                              ? { ...item, thresholdDays: Number(event.target.value || 0) }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      Severity
                    </span>
                    <select
                      value={rule.severity}
                      onChange={(event) =>
                        setRules((current) =>
                          current.map((item) =>
                            item.id === rule.id
                              ? { ...item, severity: event.target.value as SlaRuleRecord["severity"] }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[rgba(8,96,108,0.03)] px-4 py-3">
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={(event) =>
                        setRules((current) =>
                          current.map((item) =>
                            item.id === rule.id ? { ...item, isActive: event.target.checked } : item
                          )
                        )
                      }
                      className="h-5 w-5 accent-[var(--color-dark)]"
                    />
                    <span className="text-sm font-semibold text-[var(--color-ink)]">Active</span>
                  </label>
                </div>
              </div>
            </article>
          ))}
        </div>

        {error ? <p className="mt-5 text-sm font-medium text-red-700">{error}</p> : null}
        {success ? <p className="mt-5 text-sm font-medium text-[var(--color-dark)]">{success}</p> : null}
      </section>
    </div>
  );
}
