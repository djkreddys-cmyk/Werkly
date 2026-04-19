export type ScreenActivityRecord = {
  id: number;
  sessionId: string;
  userType: string;
  userId?: string;
  userIdentifier: string;
  userName?: string;
  userRole?: string;
  routePath: string;
  routeLabel?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastClientTime?: string;
  activeSeconds: number;
  idleSeconds: number;
  heartbeatCount: number;
};

function getBaseUrl() {
  return (
    process.env.RAILWAY_API_BASE_URL ||
    process.env.NEXT_PUBLIC_RAILWAY_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
}

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
    throw new Error(text || `Railway request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getScreenActivity(token: string) {
  const data = await readJson<
    { activity: ScreenActivityRecord[] } | ScreenActivityRecord[]
  >("/admin/activity", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return Array.isArray(data) ? data : data.activity;
}

export async function postScreenActivity(
  payload: {
    routePath: string;
    routeLabel?: string;
    activeSeconds: number;
    idleSeconds: number;
    clientTime?: string;
  },
  token: string
) {
  return readJson<{ success: boolean }>("/admin/activity", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
