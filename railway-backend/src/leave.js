import { query } from "./db.js";

function mapLeaveTypeRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

function mapLeaveAssignmentRow(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    employeeEmail: row.employee_email,
    employeeCode: row.employee_code,
    leaveTypeId: row.leave_type_id,
    leaveTypeName: row.leave_type_name,
    allocatedDays: Number(row.allocated_days ?? 0),
    approvedDays: Number(row.approved_days ?? 0),
    pendingDays: Number(row.pending_days ?? 0),
    remainingDays: Number(row.remaining_days ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLeaveRequestRow(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    employeeEmail: row.employee_email,
    employeeCode: row.employee_code,
    leaveTypeId: row.leave_type_id,
    leaveTypeName: row.leave_type_name,
    startDate: row.start_date,
    endDate: row.end_date,
    daysRequested: Number(row.days_requested ?? 0),
    reason: row.reason,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function ensureLeaveSchema() {
  await query(`
    create table if not exists leave_types (
      id uuid primary key default gen_random_uuid(),
      name text not null unique,
      description text,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists employee_leave_assignments (
      id uuid primary key default gen_random_uuid(),
      employee_id uuid not null references employees(id) on delete cascade,
      leave_type_id uuid not null references leave_types(id) on delete cascade,
      allocated_days integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (employee_id, leave_type_id)
    )
  `);

  await query(`
    create table if not exists leave_requests (
      id uuid primary key default gen_random_uuid(),
      employee_id uuid not null references employees(id) on delete cascade,
      leave_type_id uuid not null references leave_types(id) on delete restrict,
      start_date date not null,
      end_date date not null,
      days_requested integer not null,
      reason text not null,
      status text not null default 'pending',
      admin_note text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
}

export async function listLeaveTypes() {
  const result = await query(
    `select id, name, description, is_active, created_at
     from leave_types
     order by name asc`
  );

  return result.rows.map(mapLeaveTypeRow);
}

export async function createLeaveType(payload) {
  const result = await query(
    `insert into leave_types (name, description, is_active, updated_at)
     values ($1, $2, coalesce($3, true), now())
     returning id, name, description, is_active, created_at`,
    [payload.name.trim(), payload.description || null, payload.isActive ?? true]
  );

  return mapLeaveTypeRow(result.rows[0]);
}

export async function listLeaveAssignments(employeeId = null) {
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
      assignments.leave_type_id,
      leave_types.name as leave_type_name,
      assignments.allocated_days,
      coalesce(approved_summary.approved_days, 0) as approved_days,
      coalesce(pending_summary.pending_days, 0) as pending_days,
      greatest(assignments.allocated_days - coalesce(approved_summary.approved_days, 0), 0) as remaining_days,
      assignments.created_at,
      assignments.updated_at
     from employee_leave_assignments assignments
     inner join employees on employees.id = assignments.employee_id
     inner join leave_types on leave_types.id = assignments.leave_type_id
     left join lateral (
       select coalesce(sum(days_requested), 0)::int as approved_days
       from leave_requests
       where leave_requests.employee_id = assignments.employee_id
         and leave_requests.leave_type_id = assignments.leave_type_id
         and leave_requests.status = 'approved'
     ) approved_summary on true
     left join lateral (
       select coalesce(sum(days_requested), 0)::int as pending_days
       from leave_requests
       where leave_requests.employee_id = assignments.employee_id
         and leave_requests.leave_type_id = assignments.leave_type_id
         and leave_requests.status = 'pending'
     ) pending_summary on true
     ${scopeClause}
     order by employees.full_name asc, leave_types.name asc`,
    values
  );

  return result.rows.map(mapLeaveAssignmentRow);
}

export async function upsertLeaveAssignment(payload) {
  const result = await query(
    `insert into employee_leave_assignments (
      employee_id,
      leave_type_id,
      allocated_days,
      updated_at
    ) values ($1, $2, $3, now())
    on conflict (employee_id, leave_type_id)
    do update set
      allocated_days = excluded.allocated_days,
      updated_at = now()
    returning id, employee_id, leave_type_id, allocated_days, created_at, updated_at`,
    [payload.employeeId, payload.leaveTypeId, payload.allocatedDays]
  );

  const assignmentId = result.rows[0]?.id;
  const assignments = await listLeaveAssignments(payload.employeeId);
  return assignments.find((assignment) => assignment.id === assignmentId) ?? assignments[0];
}

function calculateLeaveDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / 86400000) + 1;
}

async function getLeaveBalanceAvailability(employeeId, leaveTypeId, excludeRequestId = null) {
  const values = [employeeId, leaveTypeId];
  const excludeClause = excludeRequestId
    ? (() => {
        values.push(excludeRequestId);
        return `and leave_requests.id <> $${values.length}`;
      })()
    : "";

  const assignmentResult = await query(
    `select
      assignments.allocated_days,
      coalesce(approved_summary.approved_days, 0) as approved_days
     from employee_leave_assignments assignments
     left join lateral (
       select coalesce(sum(days_requested), 0)::int as approved_days
       from leave_requests
       where leave_requests.employee_id = assignments.employee_id
         and leave_requests.leave_type_id = assignments.leave_type_id
         and leave_requests.status = 'approved'
         ${excludeClause}
     ) approved_summary on true
     where assignments.employee_id = $1
       and assignments.leave_type_id = $2
     limit 1`,
    values
  );

  const assignment = assignmentResult.rows[0];
  if (!assignment) {
    throw new Error("This leave type is not assigned to the employee.");
  }

  return {
    allocatedDays: Number(assignment.allocated_days ?? 0),
    approvedDays: Number(assignment.approved_days ?? 0),
  };
}

export async function listLeaveRequests(employeeId = null) {
  const values = [];
  const scopeClause = employeeId
    ? (() => {
        values.push(employeeId);
        return `where requests.employee_id = $${values.length}`;
      })()
    : "";

  const result = await query(
    `select
      requests.id,
      requests.employee_id,
      employees.full_name as employee_name,
      employees.email as employee_email,
      employees.employee_code,
      requests.leave_type_id,
      leave_types.name as leave_type_name,
      requests.start_date,
      requests.end_date,
      requests.days_requested,
      requests.reason,
      requests.status,
      requests.admin_note,
      requests.created_at,
      requests.updated_at
     from leave_requests requests
     inner join employees on employees.id = requests.employee_id
     inner join leave_types on leave_types.id = requests.leave_type_id
     ${scopeClause}
     order by requests.created_at desc`,
    values
  );

  return result.rows.map(mapLeaveRequestRow);
}

export async function createLeaveRequest(employeeId, payload) {
  const daysRequested = calculateLeaveDays(payload.startDate, payload.endDate);
  if (daysRequested <= 0) {
    throw new Error("End date must be on or after start date.");
  }

  const assignment = await getLeaveBalanceAvailability(employeeId, payload.leaveTypeId);
  const remainingDays = assignment.allocatedDays - assignment.approvedDays;

  if (daysRequested > remainingDays) {
    throw new Error("Requested leave days exceed the assigned balance.");
  }

  const result = await query(
    `insert into leave_requests (
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      days_requested,
      reason,
      status,
      updated_at
    ) values ($1, $2, $3::date, $4::date, $5, $6, 'pending', now())
    returning id`,
    [
      employeeId,
      payload.leaveTypeId,
      payload.startDate,
      payload.endDate,
      daysRequested,
      payload.reason.trim(),
    ]
  );

  const requests = await listLeaveRequests(employeeId);
  return requests.find((request) => request.id === result.rows[0]?.id) ?? requests[0];
}

export async function updateLeaveRequestStatus(id, payload) {
  const existingResult = await query(
    `select id, employee_id, leave_type_id, start_date, end_date, reason, status
     from leave_requests
     where id = $1
     limit 1`,
    [id]
  );

  const existingRequest = existingResult.rows[0];
  if (!existingRequest) {
    return null;
  }

  const nextLeaveTypeId = payload.leaveTypeId || existingRequest.leave_type_id;
  const nextStartDate = payload.startDate || existingRequest.start_date;
  const nextEndDate = payload.endDate || existingRequest.end_date;
  const nextReason = String(payload.reason ?? existingRequest.reason ?? "").trim();
  const nextStatus = payload.status;
  const daysRequested = calculateLeaveDays(nextStartDate, nextEndDate);

  if (daysRequested <= 0) {
    throw new Error("End date must be on or after start date.");
  }

  if (!nextReason) {
    throw new Error("Reason is required.");
  }

  if (nextStatus === "approved") {
    const assignment = await getLeaveBalanceAvailability(
      existingRequest.employee_id,
      nextLeaveTypeId,
      id
    );
    const remainingDays = assignment.allocatedDays - assignment.approvedDays;

    if (daysRequested > remainingDays) {
      throw new Error("Requested leave days exceed the assigned balance.");
    }
  }

  const result = await query(
    `update leave_requests
     set leave_type_id = $2,
         start_date = $3::date,
         end_date = $4::date,
         days_requested = $5,
         reason = $6,
         status = $7,
         admin_note = $8,
         updated_at = now()
     where id = $1
     returning id`,
    [
      id,
      nextLeaveTypeId,
      nextStartDate,
      nextEndDate,
      daysRequested,
      nextReason,
      nextStatus,
      payload.adminNote || null,
    ]
  );

  if (!result.rows[0]) {
    return null;
  }

  const requests = await listLeaveRequests();
  return requests.find((request) => request.id === id) ?? null;
}
