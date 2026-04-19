import { query } from "./db.js";

export async function ensureAuthAuditSchema() {
  await query(`
    create table if not exists auth_session_logs (
      session_id text primary key,
      user_type text not null,
      user_id uuid,
      user_identifier text not null,
      user_name text,
      user_role text,
      login_at timestamptz not null default now(),
      login_client_time text,
      login_client_timezone text,
      login_client_utc_offset_minutes integer,
      logout_at timestamptz,
      logout_client_time text,
      logout_client_timezone text,
      logout_client_utc_offset_minutes integer,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists screen_activity_logs (
      id bigserial primary key,
      session_id text not null,
      user_type text not null,
      user_id uuid,
      user_identifier text not null,
      user_name text,
      user_role text,
      route_path text not null,
      route_label text,
      first_seen_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now(),
      last_client_time text,
      active_seconds integer not null default 0,
      idle_seconds integer not null default 0,
      heartbeat_count integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(session_id, route_path)
    )
  `);
}

export async function recordLoginSession(payload) {
  await query(
    `insert into auth_session_logs (
      session_id,
      user_type,
      user_id,
      user_identifier,
      user_name,
      user_role,
      login_client_time,
      login_client_timezone,
      login_client_utc_offset_minutes,
      updated_at
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
    [
      payload.sessionId,
      payload.userType,
      payload.userId || null,
      payload.userIdentifier,
      payload.userName || null,
      payload.userRole || null,
      payload.clientTime || null,
      payload.clientTimezone || null,
      payload.clientUtcOffsetMinutes ?? null,
    ]
  );
}

export async function recordLogoutSession(payload) {
  await query(
    `update auth_session_logs
     set logout_at = now(),
         logout_client_time = $2,
         logout_client_timezone = $3,
         logout_client_utc_offset_minutes = $4,
         updated_at = now()
     where session_id = $1`,
    [
      payload.sessionId,
      payload.clientTime || null,
      payload.clientTimezone || null,
      payload.clientUtcOffsetMinutes ?? null,
    ]
  );
}

export async function recordScreenActivity(payload) {
  await query(
    `insert into screen_activity_logs (
      session_id,
      user_type,
      user_id,
      user_identifier,
      user_name,
      user_role,
      route_path,
      route_label,
      last_client_time,
      active_seconds,
      idle_seconds,
      heartbeat_count,
      last_seen_at,
      updated_at
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, now(), now())
    on conflict (session_id, route_path)
    do update set
      user_type = excluded.user_type,
      user_id = excluded.user_id,
      user_identifier = excluded.user_identifier,
      user_name = excluded.user_name,
      user_role = excluded.user_role,
      route_label = excluded.route_label,
      last_client_time = excluded.last_client_time,
      active_seconds = screen_activity_logs.active_seconds + excluded.active_seconds,
      idle_seconds = screen_activity_logs.idle_seconds + excluded.idle_seconds,
      heartbeat_count = screen_activity_logs.heartbeat_count + 1,
      last_seen_at = now(),
      updated_at = now()`,
    [
      payload.sessionId,
      payload.userType,
      payload.userId || null,
      payload.userIdentifier,
      payload.userName || null,
      payload.userRole || null,
      payload.routePath,
      payload.routeLabel || null,
      payload.clientTime || null,
      Math.max(0, Number(payload.activeSeconds ?? 0)),
      Math.max(0, Number(payload.idleSeconds ?? 0)),
    ]
  );
}

function mapAttendanceRow(row) {
  return {
    sessionId: row.session_id,
    userType: row.user_type,
    userId: row.user_id,
    userIdentifier: row.user_identifier,
    userName: row.user_name,
    userRole: row.user_role,
    loginAt: row.login_at,
    loginClientTime: row.login_client_time,
    loginClientTimezone: row.login_client_timezone,
    loginClientUtcOffsetMinutes: row.login_client_utc_offset_minutes,
    logoutAt: row.logout_at,
    logoutClientTime: row.logout_client_time,
    logoutClientTimezone: row.logout_client_timezone,
    logoutClientUtcOffsetMinutes: row.logout_client_utc_offset_minutes,
  };
}

function mapScreenActivityRow(row) {
  return {
    id: Number(row.id),
    sessionId: row.session_id,
    userType: row.user_type,
    userId: row.user_id,
    userIdentifier: row.user_identifier,
    userName: row.user_name,
    userRole: row.user_role,
    routePath: row.route_path,
    routeLabel: row.route_label,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    lastClientTime: row.last_client_time,
    activeSeconds: Number(row.active_seconds ?? 0),
    idleSeconds: Number(row.idle_seconds ?? 0),
    heartbeatCount: Number(row.heartbeat_count ?? 0),
  };
}

export async function listAttendanceSessions(userId = null) {
  const values = [];
  const userScopeClause = userId
    ? (() => {
        values.push(userId);
        return `where user_id = $${values.length}`;
      })()
    : "";

  const result = await query(
    `select
      session_id,
      user_type,
      user_id,
      user_identifier,
      user_name,
      user_role,
      login_at,
      login_client_time,
      login_client_timezone,
      login_client_utc_offset_minutes,
      logout_at,
      logout_client_time,
      logout_client_timezone,
      logout_client_utc_offset_minutes
     from auth_session_logs
     ${userScopeClause}
     order by login_at desc
     limit 100`,
    values
  );

  return result.rows.map(mapAttendanceRow);
}

export async function listScreenActivity(userId = null) {
  const values = [];
  const userScopeClause = userId
    ? (() => {
        values.push(userId);
        return `where user_id = $${values.length}`;
      })()
    : "";

  const result = await query(
    `select
      id,
      session_id,
      user_type,
      user_id,
      user_identifier,
      user_name,
      user_role,
      route_path,
      route_label,
      first_seen_at,
      last_seen_at,
      last_client_time,
      active_seconds,
      idle_seconds,
      heartbeat_count
     from screen_activity_logs
     ${userScopeClause}
     order by last_seen_at desc
     limit 1000`,
    values
  );

  return result.rows.map(mapScreenActivityRow);
}
