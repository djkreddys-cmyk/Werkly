import { query } from "./db.js";

const PROVIDERS = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/calendar.events",
    clientIdEnv: "GOOGLE_CALENDAR_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CALENDAR_CLIENT_SECRET",
  },
  microsoft: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "offline_access User.Read Calendars.ReadWrite",
    clientIdEnv: "MICROSOFT_CALENDAR_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_CALENDAR_CLIENT_SECRET",
  },
};

function getProviderConfig(provider) {
  const config = PROVIDERS[provider];
  if (!config) {
    throw new Error("Calendar provider is not supported.");
  }

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  if (!clientId || !clientSecret) {
    throw new Error(`${provider} calendar OAuth is not configured.`);
  }

  return { ...config, clientId, clientSecret };
}

function getPublicAppUrl() {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.WERKLY_APP_URL ||
    "https://admin.werkly.in"
  ).replace(/\/$/, "");
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function getMeetingDates(meeting) {
  const start = meeting.startsAt ? new Date(meeting.startsAt) : new Date(meeting.createdAt);
  const end = meeting.endsAt ? new Date(meeting.endsAt) : addMinutes(start, 30);
  return { start, end };
}

function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function mapConnectionRow(row) {
  return {
    provider: row.provider,
    connectedEmail: row.connected_email || "",
    calendarId: row.calendar_id || "primary",
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    connectedAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function ensureCalendarSchema() {
  await query(`
    create table if not exists calendar_connections (
      provider text primary key,
      access_token text not null,
      refresh_token text,
      expires_at timestamptz,
      calendar_id text not null default 'primary',
      connected_email text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists calendar_event_syncs (
      meeting_id uuid not null references internal_meetings(id) on delete cascade,
      provider text not null,
      event_id text not null,
      calendar_id text not null default 'primary',
      last_synced_at timestamptz not null default now(),
      primary key (meeting_id, provider)
    )
  `);
}

export function buildMeetingIcs(meeting) {
  const { start, end } = getMeetingDates(meeting);
  const url = `${getPublicAppUrl()}/meet/${meeting.roomCode}`;
  const description = [meeting.description, `Join: ${url}`].filter(Boolean).join("\n\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Werkly//Internal Meetings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${meeting.id}@werkly.in`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(meeting.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(url)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export async function listCalendarConnections() {
  const result = await query(`
    select provider, calendar_id, connected_email, expires_at, created_at, updated_at
    from calendar_connections
    order by provider asc
  `);

  return result.rows.map(mapConnectionRow);
}

export function createCalendarAuthUrl(provider, redirectUri) {
  const config = getProviderConfig(provider);
  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", `${provider}-${Date.now()}`);

  if (provider === "google") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }

  if (provider === "microsoft") {
    url.searchParams.set("response_mode", "query");
  }

  return url.toString();
}

async function requestToken(provider, body) {
  const config = getProviderConfig(provider);
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...body,
    }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error_description || result.error || "Unable to connect calendar.");
  }

  return result;
}

async function getMicrosoftEmail(accessToken) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return "";
  }
  const profile = await response.json();
  return profile.mail || profile.userPrincipalName || "";
}

async function getGoogleEmail(accessToken) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return "";
  }
  const profile = await response.json();
  return profile.email || "";
}

export async function connectCalendarProvider(provider, code, redirectUri) {
  const token = await requestToken(provider, {
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const expiresAt = token.expires_in
    ? new Date(Date.now() + Number(token.expires_in) * 1000)
    : null;
  const connectedEmail =
    provider === "google"
      ? await getGoogleEmail(token.access_token)
      : await getMicrosoftEmail(token.access_token);

  const result = await query(
    `
      insert into calendar_connections (
        provider,
        access_token,
        refresh_token,
        expires_at,
        calendar_id,
        connected_email
      )
      values ($1, $2, $3, $4, 'primary', $5)
      on conflict (provider)
      do update set
        access_token = excluded.access_token,
        refresh_token = coalesce(excluded.refresh_token, calendar_connections.refresh_token),
        expires_at = excluded.expires_at,
        connected_email = excluded.connected_email,
        updated_at = now()
      returning provider, calendar_id, connected_email, expires_at, created_at, updated_at
    `,
    [provider, token.access_token, token.refresh_token || null, expiresAt, connectedEmail]
  );

  return mapConnectionRow(result.rows[0]);
}

export async function disconnectCalendarProvider(provider) {
  await query("delete from calendar_connections where provider = $1", [provider]);
  return { success: true };
}

async function getConnection(provider) {
  const result = await query("select * from calendar_connections where provider = $1", [provider]);
  return result.rows[0] || null;
}

async function getAccessToken(provider, connection) {
  if (
    connection.expires_at &&
    new Date(connection.expires_at).getTime() > Date.now() + 60_000
  ) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    return connection.access_token;
  }

  const token = await requestToken(provider, {
    refresh_token: connection.refresh_token,
    grant_type: "refresh_token",
  });
  const expiresAt = token.expires_in
    ? new Date(Date.now() + Number(token.expires_in) * 1000)
    : null;

  await query(
    `
      update calendar_connections
      set access_token = $2,
          refresh_token = coalesce($3, refresh_token),
          expires_at = $4,
          updated_at = now()
      where provider = $1
    `,
    [provider, token.access_token, token.refresh_token || null, expiresAt]
  );

  return token.access_token;
}

function createGoogleEventPayload(meeting) {
  const { start, end } = getMeetingDates(meeting);
  const url = `${getPublicAppUrl()}/meet/${meeting.roomCode}`;
  return {
    summary: meeting.title,
    description: [meeting.description, `Join: ${url}`].filter(Boolean).join("\n\n"),
    location: url,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };
}

function createMicrosoftEventPayload(meeting) {
  const { start, end } = getMeetingDates(meeting);
  const url = `${getPublicAppUrl()}/meet/${meeting.roomCode}`;
  return {
    subject: meeting.title,
    body: {
      contentType: "HTML",
      content: `${meeting.description || ""}<br/><br/><a href="${url}">Join meeting</a>`,
    },
    location: { displayName: url },
    start: { dateTime: start.toISOString(), timeZone: "UTC" },
    end: { dateTime: end.toISOString(), timeZone: "UTC" },
  };
}

async function syncGoogleEvent(meeting, connection, existingSync) {
  const accessToken = await getAccessToken("google", connection);
  const calendarId = encodeURIComponent(connection.calendar_id || "primary");
  const payload = createGoogleEventPayload(meeting);
  const url = existingSync?.event_id
    ? `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${existingSync.event_id}`
    : `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
  const response = await fetch(url, {
    method: existingSync?.event_id ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || "Unable to sync Google Calendar event.");
  }
  return result.id;
}

async function syncMicrosoftEvent(meeting, connection, existingSync) {
  const accessToken = await getAccessToken("microsoft", connection);
  const payload = createMicrosoftEventPayload(meeting);
  const url = existingSync?.event_id
    ? `https://graph.microsoft.com/v1.0/me/events/${existingSync.event_id}`
    : "https://graph.microsoft.com/v1.0/me/events";
  const response = await fetch(url, {
    method: existingSync?.event_id ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (response.status === 204 && existingSync?.event_id) {
    return existingSync.event_id;
  }
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error?.message || "Unable to sync Outlook Calendar event.");
  }
  return result.id;
}

export async function syncMeetingToCalendars(meeting) {
  const connections = await query("select * from calendar_connections");
  const results = [];

  for (const connection of connections.rows) {
    const existingSyncResult = await query(
      "select * from calendar_event_syncs where meeting_id = $1 and provider = $2",
      [meeting.id, connection.provider]
    );
    const existingSync = existingSyncResult.rows[0] || null;
    const eventId =
      connection.provider === "google"
        ? await syncGoogleEvent(meeting, connection, existingSync)
        : await syncMicrosoftEvent(meeting, connection, existingSync);

    await query(
      `
        insert into calendar_event_syncs (meeting_id, provider, event_id, calendar_id)
        values ($1, $2, $3, $4)
        on conflict (meeting_id, provider)
        do update set
          event_id = excluded.event_id,
          calendar_id = excluded.calendar_id,
          last_synced_at = now()
      `,
      [meeting.id, connection.provider, eventId, connection.calendar_id || "primary"]
    );
    results.push({ provider: connection.provider, eventId });
  }

  return results;
}

async function deleteGoogleEvent(connection, eventId) {
  const accessToken = await getAccessToken("google", connection);
  const calendarId = encodeURIComponent(connection.calendar_id || "primary");
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function deleteMicrosoftEvent(connection, eventId) {
  const accessToken = await getAccessToken("microsoft", connection);
  await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function deleteMeetingFromCalendars(meeting) {
  const syncs = await query("select * from calendar_event_syncs where meeting_id = $1", [
    meeting.id,
  ]);

  for (const sync of syncs.rows) {
    const connection = await getConnection(sync.provider);
    if (!connection) {
      continue;
    }

    if (sync.provider === "google") {
      await deleteGoogleEvent(connection, sync.event_id);
    } else if (sync.provider === "microsoft") {
      await deleteMicrosoftEvent(connection, sync.event_id);
    }
  }

  await query("delete from calendar_event_syncs where meeting_id = $1", [meeting.id]);
  return { success: true };
}
