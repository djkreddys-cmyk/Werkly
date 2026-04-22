const getBaseUrl = () =>
  (
    process.env.RAILWAY_API_BASE_URL ||
    process.env.NEXT_PUBLIC_RAILWAY_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error("Railway API base URL is not configured.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;

    if (text) {
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed?.message) {
          message = parsed.message;
        }
      } catch {
        // Keep raw text when the backend response is not JSON.
      }
    }

    throw new Error(message || `Railway request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type ApprovalRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export type ApprovalRequestRecord = {
  id: string;
  requestType: string;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  requestStatus: ApprovalRequestStatus;
  requestedByEmployeeId?: string;
  requestedByEmployeeName?: string;
  requestedByEmployeeRole?: string;
  assignedApproverEmployeeId?: string;
  assignedApproverEmployeeName?: string;
  effectiveFromDate?: string;
  effectiveToDate?: string;
  reason?: string;
  remarks?: string;
  beforeData?: Record<string, unknown>;
  requestedData?: Record<string, unknown>;
  reviewedData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  reviewedByEmployeeId?: string;
  reviewedByEmployeeName?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type TimelineEventRecord = {
  id: string;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  eventType: string;
  title: string;
  summary?: string;
  actorType: string;
  actorId?: string;
  actorIdentifier?: string;
  actorName?: string;
  actorRole?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type SavedViewRecord = {
  id: string;
  moduleKey: string;
  viewKey: string;
  viewName: string;
  ownerType: string;
  ownerEmployeeId?: string;
  ownerEmployeeName?: string;
  roleKey?: string;
  isShared: boolean;
  filters: Record<string, unknown>;
  columns: string[];
  createdAt: string;
  updatedAt?: string;
};

export type SlaRuleRecord = {
  id: string;
  ruleKey: string;
  label: string;
  description?: string;
  entityType: string;
  thresholdDays: number;
  severity: "info" | "warning" | "critical";
  isActive: boolean;
  escalationTarget: string;
  metadata?: Record<string, unknown>;
  updatedAt?: string;
};

export async function getApprovalRequests(
  token: string,
  params?: { status?: string; requestType?: string; entityType?: string }
) {
  const searchParams = new URLSearchParams();
  if (params?.status) {
    searchParams.set("status", params.status);
  }
  if (params?.requestType) {
    searchParams.set("requestType", params.requestType);
  }
  if (params?.entityType) {
    searchParams.set("entityType", params.entityType);
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const data = await readJson<{ approvals: ApprovalRequestRecord[] }>(
    `/admin/approvals${suffix}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return data.approvals;
}

export async function createApprovalRequest(
  payload: Partial<ApprovalRequestRecord>,
  token: string
) {
  return readJson<ApprovalRequestRecord>("/admin/approvals", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function reviewApprovalRequest(
  id: string,
  payload: {
    requestStatus: ApprovalRequestStatus;
    reviewedData?: Record<string, unknown>;
  },
  token: string
) {
  return readJson<ApprovalRequestRecord>(`/admin/approvals/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getTimelineEvents(
  token: string,
  params?: { entityType?: string; entityId?: string; actorId?: string; limit?: number }
) {
  const searchParams = new URLSearchParams();
  if (params?.entityType) {
    searchParams.set("entityType", params.entityType);
  }
  if (params?.entityId) {
    searchParams.set("entityId", params.entityId);
  }
  if (params?.actorId) {
    searchParams.set("actorId", params.actorId);
  }
  if (params?.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const data = await readJson<{ timeline: TimelineEventRecord[] }>(`/admin/timeline${suffix}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.timeline;
}

export async function getSavedViews(
  token: string,
  params?: { moduleKey?: string; scope?: "mine" | "all" }
) {
  const searchParams = new URLSearchParams();
  if (params?.moduleKey) {
    searchParams.set("moduleKey", params.moduleKey);
  }
  if (params?.scope) {
    searchParams.set("scope", params.scope);
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const data = await readJson<{ views: SavedViewRecord[] }>(`/admin/saved-views${suffix}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.views;
}

export async function saveCurrentView(
  payload: Partial<SavedViewRecord>,
  token: string
) {
  return readJson<SavedViewRecord>("/admin/saved-views", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function deleteSavedView(id: string, token: string) {
  return readJson<{ success: boolean }>(`/admin/saved-views/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getSlaRules(token: string) {
  const data = await readJson<{ rules: SlaRuleRecord[] }>("/admin/sla-rules", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.rules;
}

export async function updateSlaRules(
  rules: Partial<SlaRuleRecord>[],
  token: string
) {
  const data = await readJson<{ rules: SlaRuleRecord[] }>("/admin/sla-rules", {
    method: "PUT",
    body: JSON.stringify({ rules }),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data.rules;
}
