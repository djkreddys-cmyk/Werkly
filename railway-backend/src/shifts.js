import { query } from "./db.js";

const DEFAULT_WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function normalizeWorkingDays(value) {
  if (!Array.isArray(value)) {
    return DEFAULT_WORKING_DAYS;
  }

  return value
    .map((day) => String(day || "").trim())
    .filter(Boolean)
    .slice(0, 7);
}

function mapShiftRow(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    startTime: row.start_time,
    endTime: row.end_time,
    breakMinutes: Number(row.break_minutes ?? 0),
    graceMinutes: Number(row.grace_minutes ?? 0),
    workingDays: normalizeWorkingDays(row.working_days),
    notes: row.notes,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapShiftAssignmentRow(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    employeeEmail: row.employee_email,
    employeeCode: row.employee_code,
    shiftId: row.shift_id,
    shiftName: row.shift_name,
    shiftCode: row.shift_code,
    shiftStartTime: row.shift_start_time,
    shiftEndTime: row.shift_end_time,
    breakMinutes: Number(row.break_minutes ?? 0),
    graceMinutes: Number(row.grace_minutes ?? 0),
    workingDays: normalizeWorkingDays(row.working_days),
    effectiveFromDate: row.effective_from_date,
    effectiveToDate: row.effective_to_date,
    assignmentNote: row.assignment_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function ensureShiftSchema() {
  await query(`
    create table if not exists shift_definitions (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      code text,
      start_time text not null,
      end_time text not null,
      break_minutes integer not null default 0,
      grace_minutes integer not null default 0,
      working_days jsonb not null default '["Mon","Tue","Wed","Thu","Fri"]'::jsonb,
      notes text,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (name)
    )
  `);

  await query(`
    create table if not exists employee_shift_assignments (
      id uuid primary key default gen_random_uuid(),
      employee_id uuid not null references employees(id) on delete cascade,
      shift_id uuid not null references shift_definitions(id) on delete cascade,
      effective_from_date date not null,
      effective_to_date date,
      assignment_note text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(
    `create index if not exists idx_employee_shift_assignments_employee_id
     on employee_shift_assignments(employee_id, effective_from_date desc)`
  );
  await query(
    `create index if not exists idx_employee_shift_assignments_shift_id
     on employee_shift_assignments(shift_id, effective_from_date desc)`
  );
}

export async function listShifts() {
  const result = await query(
    `select
      id,
      name,
      code,
      start_time,
      end_time,
      break_minutes,
      grace_minutes,
      working_days,
      notes,
      is_active,
      created_at,
      updated_at
     from shift_definitions
     order by is_active desc, name asc`
  );

  return result.rows.map(mapShiftRow);
}

export async function createShift(payload) {
  const result = await query(
    `insert into shift_definitions (
      name,
      code,
      start_time,
      end_time,
      break_minutes,
      grace_minutes,
      working_days,
      notes,
      is_active,
      updated_at
    ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, coalesce($9, true), now())
    returning
      id,
      name,
      code,
      start_time,
      end_time,
      break_minutes,
      grace_minutes,
      working_days,
      notes,
      is_active,
      created_at,
      updated_at`,
    [
      String(payload.name ?? "").trim(),
      String(payload.code ?? "").trim() || null,
      String(payload.startTime ?? "").trim(),
      String(payload.endTime ?? "").trim(),
      Number(payload.breakMinutes ?? 0),
      Number(payload.graceMinutes ?? 0),
      JSON.stringify(normalizeWorkingDays(payload.workingDays)),
      String(payload.notes ?? "").trim() || null,
      payload.isActive ?? true,
    ]
  );

  return mapShiftRow(result.rows[0]);
}

export async function listShiftAssignments(employeeId = null) {
  const values = [];
  const scopeClause = employeeId
    ? (() => {
        values.push(employeeId);
        return `where assignments.employee_id = $${values.length}`;
      })()
    : "";

  const result = await query(
    `select
      assignments.id,
      assignments.employee_id,
      employees.full_name as employee_name,
      employees.email as employee_email,
      employees.employee_code,
      assignments.shift_id,
      shifts.name as shift_name,
      shifts.code as shift_code,
      shifts.start_time as shift_start_time,
      shifts.end_time as shift_end_time,
      shifts.break_minutes,
      shifts.grace_minutes,
      shifts.working_days,
      assignments.effective_from_date,
      assignments.effective_to_date,
      assignments.assignment_note,
      assignments.created_at,
      assignments.updated_at
     from employee_shift_assignments assignments
     inner join employees on employees.id = assignments.employee_id
     inner join shift_definitions shifts on shifts.id = assignments.shift_id
     ${scopeClause}
     order by assignments.effective_from_date desc, employees.full_name asc, shifts.name asc`,
    values
  );

  return result.rows.map(mapShiftAssignmentRow);
}

export async function createShiftAssignment(payload) {
  const result = await query(
    `insert into employee_shift_assignments (
      employee_id,
      shift_id,
      effective_from_date,
      effective_to_date,
      assignment_note,
      updated_at
    ) values ($1, $2, $3::date, $4::date, $5, now())
    returning id`,
    [
      payload.employeeId,
      payload.shiftId,
      payload.effectiveFromDate,
      payload.effectiveToDate || null,
      String(payload.assignmentNote ?? "").trim() || null,
    ]
  );

  const assignmentId = result.rows[0]?.id;
  const assignments = await listShiftAssignments();
  return assignments.find((assignment) => assignment.id === assignmentId) ?? null;
}
