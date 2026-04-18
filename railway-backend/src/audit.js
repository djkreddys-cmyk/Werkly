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
