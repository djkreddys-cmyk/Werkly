import { randomBytes } from "crypto";
import { query } from "./db.js";

function createRoomCode() {
  return `mtg-${randomBytes(9).toString("base64url")}`;
}

function mapMeetingRow(row) {
  return {
    id: row.id,
    roomCode: row.room_code,
    title: row.title,
    description: row.description || "",
    startsAt: row.starts_at ? row.starts_at.toISOString() : null,
    endsAt: row.ends_at ? row.ends_at.toISOString() : null,
    status: row.status,
    createdByType: row.created_by_type,
    createdById: row.created_by_id,
    createdByName: row.created_by_name,
    createdByIdentifier: row.created_by_identifier,
    participantEmployeeIds: Array.isArray(row.participant_employee_ids)
      ? row.participant_employee_ids
      : [],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapParticipantRow(row) {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    participantKey: row.participant_key,
    displayName: row.display_name,
    isHost: Boolean(row.is_host),
    cameraEnabled: Boolean(row.camera_enabled),
    micEnabled: Boolean(row.mic_enabled),
    isScreenSharing: Boolean(row.is_screen_sharing),
    joinedAt: row.joined_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
    leftAt: row.left_at ? row.left_at.toISOString() : null,
  };
}

function normalizeParticipantIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((id) => String(id || "").trim()).filter(Boolean))];
}

export async function ensureMeetingsSchema() {
  await query(`
    create table if not exists internal_meetings (
      id uuid primary key default gen_random_uuid(),
      room_code text not null unique,
      title text not null,
      description text,
      starts_at timestamptz,
      ends_at timestamptz,
      status text not null default 'scheduled',
      created_by_type text not null default 'internal-user',
      created_by_id text,
      created_by_name text,
      created_by_identifier text,
      participant_employee_ids uuid[] not null default '{}',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create index if not exists idx_internal_meetings_room_code
    on internal_meetings(room_code)
  `);

  await query(`
    create index if not exists idx_internal_meetings_starts_at
    on internal_meetings(starts_at)
  `);

  await query(`
    create table if not exists internal_meeting_participants (
      id uuid primary key default gen_random_uuid(),
      meeting_id uuid not null references internal_meetings(id) on delete cascade,
      participant_key text not null,
      display_name text not null,
      is_host boolean not null default false,
      camera_enabled boolean not null default false,
      mic_enabled boolean not null default false,
      is_screen_sharing boolean not null default false,
      joined_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now(),
      left_at timestamptz,
      unique(meeting_id, participant_key)
    )
  `);

  await query(`
    create index if not exists idx_internal_meeting_participants_meeting_id
    on internal_meeting_participants(meeting_id)
  `);
}

export async function listMeetings() {
  const result = await query(`
    select *
    from internal_meetings
    where status <> 'cancelled'
    order by coalesce(starts_at, created_at) desc
    limit 100
  `);

  return result.rows.map(mapMeetingRow);
}

export async function getMeetingByRoomCode(roomCode) {
  const result = await query(
    `
      select *
      from internal_meetings
      where room_code = $1
      limit 1
    `,
    [roomCode]
  );

  return result.rows[0] ? mapMeetingRow(result.rows[0]) : null;
}

export async function listMeetingParticipants(roomCode) {
  const result = await query(
    `
      select p.*
      from internal_meeting_participants p
      join internal_meetings m on m.id = p.meeting_id
      where m.room_code = $1
        and p.left_at is null
        and p.last_seen_at > now() - interval '2 minutes'
      order by p.is_host desc, p.joined_at asc
    `,
    [roomCode]
  );

  return result.rows.map(mapParticipantRow);
}

export async function getMeetingWithParticipants(roomCode) {
  const meeting = await getMeetingByRoomCode(roomCode);
  if (!meeting) {
    return null;
  }

  return {
    ...meeting,
    participants: await listMeetingParticipants(roomCode),
  };
}

export async function createMeeting(payload, actor) {
  const title = String(payload?.title || "").trim();
  if (!title) {
    throw new Error("Meeting title is required.");
  }

  const startsAt = payload?.startsAt ? new Date(payload.startsAt) : null;
  const endsAt = payload?.endsAt ? new Date(payload.endsAt) : null;

  if (startsAt && Number.isNaN(startsAt.getTime())) {
    throw new Error("Meeting start time is invalid.");
  }

  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw new Error("Meeting end time is invalid.");
  }

  const participantEmployeeIds = normalizeParticipantIds(payload?.participantEmployeeIds);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomCode = createRoomCode();

    try {
      const result = await query(
        `
          insert into internal_meetings (
            room_code,
            title,
            description,
            starts_at,
            ends_at,
            created_by_type,
            created_by_id,
            created_by_name,
            created_by_identifier,
            participant_employee_ids
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::uuid[])
          returning *
        `,
        [
          roomCode,
          title,
          String(payload?.description || "").trim() || null,
          startsAt ? startsAt.toISOString() : null,
          endsAt ? endsAt.toISOString() : null,
          actor?.actorType || "internal-user",
          actor?.actorId || null,
          actor?.actorName || "Werkly User",
          actor?.actorIdentifier || null,
          participantEmployeeIds,
        ]
      );

      return mapMeetingRow(result.rows[0]);
    } catch (error) {
      if (error?.code !== "23505" || attempt === 4) {
        throw error;
      }
    }
  }

  throw new Error("Unable to generate a unique meeting link.");
}

export async function updateMeetingStatus(roomCode, status) {
  const safeStatus = ["scheduled", "live", "ended", "cancelled"].includes(status)
    ? status
    : "scheduled";

  const result = await query(
    `
      update internal_meetings
      set status = $2, updated_at = now()
      where room_code = $1
      returning *
    `,
    [roomCode, safeStatus]
  );

  return result.rows[0] ? mapMeetingRow(result.rows[0]) : null;
}

export async function upsertMeetingParticipant(roomCode, payload) {
  const participantKey = String(payload?.participantKey || "").trim();
  const displayName = String(payload?.displayName || "").trim();

  if (!participantKey || !displayName) {
    throw new Error("Participant name is required.");
  }

  const meeting = await getMeetingByRoomCode(roomCode);
  if (!meeting) {
    return null;
  }

  const result = await query(
    `
      insert into internal_meeting_participants (
        meeting_id,
        participant_key,
        display_name,
        is_host,
        camera_enabled,
        mic_enabled,
        is_screen_sharing,
        left_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, null)
      on conflict (meeting_id, participant_key)
      do update set
        display_name = excluded.display_name,
        is_host = excluded.is_host,
        camera_enabled = excluded.camera_enabled,
        mic_enabled = excluded.mic_enabled,
        is_screen_sharing = excluded.is_screen_sharing,
        last_seen_at = now(),
        left_at = null
      returning *
    `,
    [
      meeting.id,
      participantKey,
      displayName,
      Boolean(payload?.isHost),
      Boolean(payload?.cameraEnabled),
      Boolean(payload?.micEnabled),
      Boolean(payload?.isScreenSharing),
    ]
  );

  return mapParticipantRow(result.rows[0]);
}

export async function leaveMeetingParticipant(roomCode, participantKey) {
  const result = await query(
    `
      update internal_meeting_participants p
      set left_at = now(),
          last_seen_at = now(),
          camera_enabled = false,
          mic_enabled = false,
          is_screen_sharing = false
      from internal_meetings m
      where p.meeting_id = m.id
        and m.room_code = $1
        and p.participant_key = $2
      returning p.*
    `,
    [roomCode, participantKey]
  );

  return result.rows[0] ? mapParticipantRow(result.rows[0]) : null;
}
