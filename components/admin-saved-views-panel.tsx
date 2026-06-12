"use client";

import { useEffect, useMemo, useState } from "react";
import type { SavedViewRecord } from "@/lib/workflow";

function labelize(value?: string) {
  return String(value || "not-added")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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

export function AdminSavedViewsPanel() {
  const [token] = useState(
    typeof window !== "undefined" ? window.localStorage.getItem("werklyAdminToken") ?? "" : ""
  );
  const [views, setViews] = useState<SavedViewRecord[]>([]);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState<"mine" | "all">("all");
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    fetch(
      `/api/admin/saved-views${scopeFilter === "all" || moduleFilter !== "all" ? "?" : ""}${new URLSearchParams({
        ...(scopeFilter ? { scope: scopeFilter } : {}),
        ...(moduleFilter !== "all" ? { moduleKey: moduleFilter } : {}),
      }).toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
      .then(async (response) => {
        const result = (await response.json()) as {
          views?: SavedViewRecord[];
          removedCount?: number;
          message?: string;
        };
        if (!response.ok) {
          throw new Error(result.message || "Unable to load saved views.");
        }
        setViews(result.views ?? []);
        setMessage(
          result.removedCount
            ? `${result.removedCount} saved filter${result.removedCount === 1 ? "" : "s"} older than 2 days removed.`
            : ""
        );
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load saved views.");
      })
      .finally(() => setIsLoading(false));
  }, [moduleFilter, scopeFilter, token]);

  const groupedViews = useMemo(() => {
    return views.reduce<Record<string, SavedViewRecord[]>>((accumulator, view) => {
      const key = view.moduleKey;
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(view);
      return accumulator;
    }, {});
  }, [views]);

  async function handleDelete(id: string) {
    if (!token) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/saved-views/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete saved view.");
      }

      setViews((current) => current.filter((view) => view.id !== id));
      setMessage("Saved view removed successfully.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete saved view.");
    }
  }

  if (!token) {
    return (
      <section className="accent-card p-8">
        <p className="eyebrow">Session Required</p>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
          Sign in to manage saved views.
        </h2>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="accent-card p-7">
        <p className="eyebrow">Saved Views</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)]">
          Reuse filters and exports faster.
        </h2>
        <p className="muted-copy mt-3 max-w-4xl text-base leading-7">
          Saved views keep the current filter set for dashboards, reports, and modules so users
          can reopen their preferred work queues without rebuilding the same filters every time.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <select
            value={moduleFilter}
            onChange={(event) => setModuleFilter(event.target.value)}
            className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
          >
            <option value="all">All modules</option>
            <option value="dashboard">Dashboard</option>
            <option value="jobs">Jobs</option>
            <option value="candidates">Candidates</option>
            <option value="clients">Clients</option>
            <option value="reports">Reports</option>
          </select>
          <select
            value={scopeFilter}
            onChange={(event) => setScopeFilter(event.target.value as "mine" | "all")}
            className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-dark)]"
          >
            <option value="all">All visible views</option>
            <option value="mine">My views</option>
          </select>
        </div>
      </section>

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      {message ? <p className="text-sm font-medium text-[var(--color-dark)]">{message}</p> : null}

      {isLoading ? (
        <section className="accent-card p-7">
          <p className="muted-copy text-sm">Loading saved views...</p>
        </section>
      ) : views.length === 0 ? (
        <section className="accent-card p-7">
          <p className="muted-copy text-sm">
            No saved views are available yet. Save one from a dashboard or filtered module screen.
          </p>
        </section>
      ) : (
        Object.entries(groupedViews).map(([moduleKey, items]) => (
          <section key={moduleKey} className="accent-card p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">{labelize(moduleKey)}</p>
                <h3 className="mt-4 text-2xl font-semibold text-[var(--color-ink)]">
                  Saved filter presets
                </h3>
              </div>
              <span className="rounded-full bg-[rgba(8,96,108,0.08)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dark)]">
                {items.length} views
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              {items.map((view) => (
                <article
                  key={view.id}
                  className="rounded-[1.25rem] border border-[var(--color-line)] bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">{view.viewName}</p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {labelize(view.viewKey)} · {view.ownerEmployeeName || labelize(view.ownerType)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDelete(view.id)}
                      className="rounded-2xl border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-dark)]"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        Filters
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--color-ink)]">
                        {Object.keys(view.filters || {}).length
                          ? Object.entries(view.filters || {})
                              .map(([key, value]) => `${labelize(key)}: ${String(value)}`)
                              .join(", ")
                          : "No filters saved"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                        Updated On
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-ink)]">
                        {formatDateTime(view.updatedAt || view.createdAt)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
