"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminClientsPanel } from "@/components/admin-crm-dashboard";

type ClientWorkspaceView = "leads" | "existing";

const clientWorkspaceOptions: Array<{
  value: ClientWorkspaceView;
  label: string;
  description: string;
}> = [
  {
    value: "leads",
    label: "Client Leads",
    description: "Lead-stage clients and follow-up ownership",
  },
  {
    value: "existing",
    label: "Existing Clients",
    description: "Onboarded clients, agreements, jobs, and owners",
  },
];

function getClientViewFromQuery() {
  if (typeof window === "undefined") {
    return null;
  }

  const type = new URLSearchParams(window.location.search).get("type");
  return clientWorkspaceOptions.some((option) => option.value === type)
    ? (type as ClientWorkspaceView)
    : null;
}

export function AdminClientsWorkspace({
  initialView = "leads",
}: {
  initialView?: ClientWorkspaceView;
}) {
  const [view, setView] = useState<ClientWorkspaceView>(() => {
    const queryView = getClientViewFromQuery();
    if (queryView) {
      return queryView;
    }

    if (typeof window === "undefined") {
      return initialView;
    }

    if (initialView !== "leads") {
      return initialView;
    }

    const savedView = window.localStorage.getItem("werklyClientWorkspaceView");
    return clientWorkspaceOptions.some((option) => option.value === savedView)
      ? (savedView as ClientWorkspaceView)
      : initialView;
  });

  const selectedOption = useMemo(
    () => clientWorkspaceOptions.find((option) => option.value === view),
    [view]
  );

  useEffect(() => {
    window.localStorage.setItem("werklyClientWorkspaceView", view);
  }, [view]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-[1.25rem] border border-[var(--color-line)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Client Type</p>
          <p className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
            {selectedOption?.description}
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)] sm:min-w-[260px]">
          Type
          <select
            className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-slate-950 outline-none transition focus:border-[var(--color-dark)]"
            value={view}
            onChange={(event) => setView(event.target.value as ClientWorkspaceView)}
          >
            {clientWorkspaceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <AdminClientsPanel viewMode={view} />
    </div>
  );
}
