export type AttendanceSessionRecord = {
  sessionId: string;
  userType: string;
  userId?: string;
  userIdentifier: string;
  userName?: string;
  userRole?: string;
  loginAt: string;
  loginClientTime?: string;
  loginClientTimezone?: string;
  loginClientUtcOffsetMinutes?: number;
  logoutAt?: string;
  logoutClientTime?: string;
  logoutClientTimezone?: string;
  logoutClientUtcOffsetMinutes?: number;
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

export async function getAttendance(token: string) {
  const data = await readJson<
    { attendance: AttendanceSessionRecord[] } | AttendanceSessionRecord[]
  >("/admin/attendance", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return Array.isArray(data) ? data : data.attendance;
}
