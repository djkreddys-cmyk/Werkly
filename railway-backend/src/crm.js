import bcrypt from "bcryptjs";
import { pool, query } from "./db.js";

function sanitizeEducationDetails(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => ({
      qualification: String(entry?.qualification ?? "").trim(),
      specialization: String(entry?.specialization ?? "").trim(),
      institution: String(entry?.institution ?? "").trim(),
      yearOfPassing: String(entry?.yearOfPassing ?? "").trim(),
      gradeOrPercentage: String(entry?.gradeOrPercentage ?? "").trim(),
    }))
    .filter(
      (entry) =>
        entry.qualification ||
        entry.specialization ||
        entry.institution ||
        entry.yearOfPassing ||
        entry.gradeOrPercentage
    );
}

function sanitizeExperienceDetails(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => ({
      companyName: String(entry?.companyName ?? "").trim(),
      designation: String(entry?.designation ?? "").trim(),
      startDate: String(entry?.startDate ?? "").trim(),
      endDate: String(entry?.endDate ?? "").trim(),
      totalDuration: String(entry?.totalDuration ?? "").trim(),
      industry: String(entry?.industry ?? "").trim(),
      responsibilities: String(entry?.responsibilities ?? "").trim(),
      reasonForLeaving: String(entry?.reasonForLeaving ?? "").trim(),
    }))
    .filter(
      (entry) =>
        entry.companyName ||
        entry.designation ||
        entry.startDate ||
        entry.endDate ||
        entry.totalDuration ||
        entry.industry ||
        entry.responsibilities ||
        entry.reasonForLeaving
    );
}

export async function ensureCrmSchema() {
  await query(`
    create table if not exists employees (
      id uuid primary key default gen_random_uuid(),
      full_name text not null,
      email text not null unique,
      employee_code text unique,
      phone text,
      role text not null,
      date_of_birth date,
      date_of_joining date,
      education_qualification text,
      previous_experience text,
      education_details jsonb not null default '[]'::jsonb,
      experience_details jsonb not null default '[]'::jsonb,
      status text not null default 'active',
      password_hash text not null,
      must_change_password boolean not null default true,
      password_changed_at timestamptz,
      inactive_date date,
      inactive_remarks text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists clients (
      id uuid primary key default gen_random_uuid(),
      company_name text not null,
      contact_person text not null,
      contact_email text,
      contact_phone text,
      sector text,
      branch text,
      assigned_employee_id uuid references employees(id) on delete set null,
      status text not null default 'active',
      onboarding_status text not null default 'new-lead',
      follow_up_status text not null default 'pending',
      next_follow_up_date date,
      last_follow_up_date date,
      onboarding_source text,
      notes text,
      follow_up_notes text,
      agreement_file_name text,
      agreement_file_type text,
      agreement_file_data text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists client_transfer_requests (
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null references clients(id) on delete cascade,
      requested_by_employee_id uuid not null references employees(id) on delete cascade,
      requested_to_employee_id uuid not null references employees(id) on delete cascade,
      reason text,
      status text not null default 'pending',
      admin_note text,
      reviewed_by_employee_id uuid references employees(id) on delete set null,
      reviewed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`alter table clients add column if not exists agreement_file_name text`);
  await query(`alter table clients add column if not exists agreement_file_type text`);
  await query(`alter table clients add column if not exists agreement_file_data text`);
  await query(`alter table clients add column if not exists onboarding_status text not null default 'new-lead'`);
  await query(`alter table clients add column if not exists follow_up_status text not null default 'pending'`);
  await query(`alter table clients add column if not exists next_follow_up_date date`);
  await query(`alter table clients add column if not exists last_follow_up_date date`);
  await query(`alter table clients add column if not exists onboarding_source text`);
  await query(`alter table clients add column if not exists follow_up_notes text`);
  await query(`alter table employees add column if not exists employee_code text`);
  await query(
    `alter table employees add column if not exists must_change_password boolean not null default true`
  );
  await query(
    `alter table employees add column if not exists password_changed_at timestamptz`
  );
  await query(`alter table employees add column if not exists date_of_birth date`);
  await query(`alter table employees add column if not exists date_of_joining date`);
  await query(`alter table employees add column if not exists education_qualification text`);
  await query(`alter table employees add column if not exists previous_experience text`);
  await query(
    `alter table employees add column if not exists education_details jsonb not null default '[]'::jsonb`
  );
  await query(
    `alter table employees add column if not exists experience_details jsonb not null default '[]'::jsonb`
  );
  await query(`alter table employees add column if not exists inactive_date date`);
  await query(`alter table employees add column if not exists inactive_remarks text`);
  await query(
    `create unique index if not exists employees_employee_code_key on employees(employee_code) where employee_code is not null`
  );

  await backfillMissingEmployeeCodes();
}

function mapEmployeeRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    employeeCode: row.employee_code,
    phone: row.phone,
    role: row.role,
    dateOfBirth: row.date_of_birth,
    dateOfJoining: row.date_of_joining,
    educationQualification: row.education_qualification,
    previousExperience: row.previous_experience,
    educationDetails: Array.isArray(row.education_details) ? row.education_details : [],
    experienceDetails: Array.isArray(row.experience_details) ? row.experience_details : [],
    status: row.status,
    mustChangePassword: Boolean(row.must_change_password),
    inactiveDate: row.inactive_date,
    inactiveRemarks: row.inactive_remarks,
    createdAt: row.created_at,
  };
}

function formatEmployeeCode(date, sequenceNumber) {
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const sequence = String(sequenceNumber).padStart(3, "0");
  return `${year}${month}${sequence}`;
}

async function getNextEmployeeSequence(client, yearPrefix) {
  const result = await client.query(
    `select coalesce(max(cast(right(employee_code, 3) as integer)), 0) as current_sequence
     from employees
     where employee_code is not null
       and left(employee_code, 2) = $1`,
    [yearPrefix]
  );

  return Number(result.rows[0]?.current_sequence ?? 0) + 1;
}

async function generateEmployeeCode(client, date = new Date()) {
  const yearPrefix = String(date.getUTCFullYear()).slice(-2);
  const sequence = await getNextEmployeeSequence(client, yearPrefix);
  return formatEmployeeCode(date, sequence);
}

async function backfillMissingEmployeeCodes() {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("lock table employees in share row exclusive mode");

    const existingSequences = await client.query(
      `select left(employee_code, 2) as year_prefix,
              coalesce(max(cast(right(employee_code, 3) as integer)), 0) as current_sequence
       from employees
       where employee_code is not null
       group by left(employee_code, 2)`
    );

    const sequenceByYear = new Map(
      existingSequences.rows.map((row) => [
        row.year_prefix,
        Number(row.current_sequence ?? 0),
      ])
    );

    const employeesWithoutCodes = await client.query(
      `select id, created_at
       from employees
       where employee_code is null
       order by created_at asc, id asc`
    );

    for (const employee of employeesWithoutCodes.rows) {
      const createdAt = new Date(employee.created_at);
      const yearPrefix = String(createdAt.getUTCFullYear()).slice(-2);
      const nextSequence = (sequenceByYear.get(yearPrefix) ?? 0) + 1;
      sequenceByYear.set(yearPrefix, nextSequence);

      await client.query(`update employees set employee_code = $1 where id = $2`, [
        formatEmployeeCode(createdAt, nextSequence),
        employee.id,
      ]);
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function mapClientRow(row) {
  return {
    id: row.id,
    companyName: row.company_name,
    contactPerson: row.contact_person,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    sector: row.sector,
    branch: row.branch,
    assignedEmployeeId: row.assigned_employee_id,
    assignedEmployeeName: row.assigned_employee_name,
    status: row.status,
    onboardingStatus: row.onboarding_status,
    followUpStatus: row.follow_up_status,
    nextFollowUpDate: row.next_follow_up_date,
    lastFollowUpDate: row.last_follow_up_date,
    onboardingSource: row.onboarding_source,
    notes: row.notes,
    followUpNotes: row.follow_up_notes,
    agreementFileName: row.agreement_file_name,
    agreementFileType: row.agreement_file_type,
    agreementFileData: row.agreement_file_data,
    linkedJobsCount: Number(row.linked_jobs_count ?? 0),
    linkedJobs: Array.isArray(row.linked_jobs) ? row.linked_jobs : [],
    createdAt: row.created_at,
  };
}

function mapClientTransferRequestRow(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    requestedByEmployeeId: row.requested_by_employee_id,
    requestedByEmployeeName: row.requested_by_employee_name,
    requestedToEmployeeId: row.requested_to_employee_id,
    requestedToEmployeeName: row.requested_to_employee_name,
    reason: row.reason,
    status: row.status,
    adminNote: row.admin_note,
    reviewedByEmployeeId: row.reviewed_by_employee_id,
    reviewedByEmployeeName: row.reviewed_by_employee_name,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

export async function listEmployees() {
  const result = await query(
    `select id, full_name, email, employee_code, phone, role, date_of_birth, date_of_joining, education_qualification, previous_experience, education_details, experience_details, status, must_change_password, inactive_date, inactive_remarks, created_at
     from employees
     order by created_at desc`
  );

  return result.rows.map(mapEmployeeRow);
}

export async function createEmployee(payload) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("lock table employees in share row exclusive mode");

    const isInactive = payload.status === "inactive";
    const educationDetails = sanitizeEducationDetails(payload.educationDetails);
    const experienceDetails = sanitizeExperienceDetails(payload.experienceDetails);
    const passwordHash = await bcrypt.hash(payload.password, 12);
    const employeeCode = await generateEmployeeCode(client);
    const result = await client.query(
      `insert into employees (
        full_name,
        email,
        employee_code,
        phone,
        role,
        date_of_birth,
        date_of_joining,
        education_qualification,
        previous_experience,
        education_details,
        experience_details,
        status,
        password_hash,
        must_change_password,
        inactive_date,
        inactive_remarks
      ) values ($1, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10::jsonb, $11::jsonb, $12, $13, true, $14, $15)
      returning id, full_name, email, employee_code, phone, role, date_of_birth, date_of_joining, education_qualification, previous_experience, education_details, experience_details, status, must_change_password, inactive_date, inactive_remarks, created_at`,
      [
        payload.fullName,
        payload.email,
        employeeCode,
        payload.phone || null,
        payload.role,
        payload.dateOfBirth || null,
        payload.dateOfJoining || null,
        payload.educationQualification || null,
        payload.previousExperience || null,
        JSON.stringify(educationDetails),
        JSON.stringify(experienceDetails),
        payload.status || "active",
        passwordHash,
        isInactive ? payload.inactiveDate || null : null,
        isInactive ? payload.inactiveRemarks || null : null,
      ]
    );

    await client.query("commit");
    return mapEmployeeRow(result.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateEmployee(id, payload) {
  const isInactive = payload.status === "inactive";
  const educationDetails = sanitizeEducationDetails(payload.educationDetails);
  const experienceDetails = sanitizeExperienceDetails(payload.experienceDetails);
  const values = [
    payload.fullName,
    payload.email,
    payload.phone || null,
    payload.role,
    payload.dateOfBirth || null,
    payload.dateOfJoining || null,
    payload.educationQualification || null,
    payload.previousExperience || null,
    JSON.stringify(educationDetails),
    JSON.stringify(experienceDetails),
    payload.status || "active",
    isInactive ? payload.inactiveDate || null : null,
    isInactive ? payload.inactiveRemarks || null : null,
  ];

  let passwordClause = "";

  if (payload.password) {
    const passwordHash = await bcrypt.hash(payload.password, 12);
    values.push(passwordHash);
    passwordClause =
      `, password_hash = $14, must_change_password = true, password_changed_at = null`;
  }

  values.push(id);

  const result = await query(
    `update employees
     set full_name = $1,
         email = $2,
         phone = $3,
         role = $4,
         date_of_birth = $5::date,
         date_of_joining = $6::date,
         education_qualification = $7,
         previous_experience = $8,
         education_details = $9::jsonb,
         experience_details = $10::jsonb,
         status = $11,
         inactive_date = $12,
         inactive_remarks = $13
         ${passwordClause},
         updated_at = now()
     where id = $${values.length}
     returning id, full_name, email, employee_code, phone, role, date_of_birth, date_of_joining, education_qualification, previous_experience, education_details, experience_details, status, must_change_password, inactive_date, inactive_remarks, created_at`,
    values
  );

  return result.rows[0] ? mapEmployeeRow(result.rows[0]) : null;
}

export async function authenticateEmployee(identifier, password) {
  const normalizedIdentifier = String(identifier ?? "").trim();
  if (!normalizedIdentifier) {
    return null;
  }

  const normalizedEmail = normalizedIdentifier.toLowerCase();

  const result = await query(
    `select
      id,
      full_name,
      email,
      employee_code,
      phone,
      role,
      date_of_birth,
      date_of_joining,
      education_qualification,
      previous_experience,
      status,
      password_hash,
      must_change_password,
      inactive_date,
      inactive_remarks,
      created_at
     from employees
     where employee_code = $1
        or lower(email) = $2`,
    [normalizedIdentifier, normalizedEmail]
  );

  const employee = result.rows[0];
  if (!employee) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, employee.password_hash);
  if (!isPasswordValid) {
    return null;
  }

  if (employee.status !== "active") {
    throw new Error("This employee login is inactive.");
  }

  return mapEmployeeRow(employee);
}

export async function changeEmployeePassword(employeeId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const result = await query(
    `update employees
     set password_hash = $1,
         must_change_password = false,
         password_changed_at = now(),
         updated_at = now()
     where id = $2
     returning id, full_name, email, employee_code, phone, role, date_of_birth, date_of_joining, education_qualification, previous_experience, status, must_change_password, inactive_date, inactive_remarks, created_at`,
    [passwordHash, employeeId]
  );

  return result.rows[0] ? mapEmployeeRow(result.rows[0]) : null;
}

export async function adminResetEmployeePassword(
  employeeId,
  newPassword,
  mustChangePassword = true
) {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const result = await query(
    `update employees
     set password_hash = $1,
         must_change_password = $2,
         password_changed_at = case when $2 then null else now() end,
         updated_at = now()
     where id = $3
     returning id, full_name, email, employee_code, phone, role, date_of_birth, date_of_joining, education_qualification, previous_experience, status, must_change_password, inactive_date, inactive_remarks, created_at`,
    [passwordHash, mustChangePassword, employeeId]
  );

  return result.rows[0] ? mapEmployeeRow(result.rows[0]) : null;
}

export async function listClients(employeeId = null) {
  const values = [];
  const employeeScopeClause = employeeId
    ? (() => {
        values.push(employeeId);
        return `where clients.assigned_employee_id = $${values.length}`;
      })()
    : "";

  const result = await query(
    `select
      clients.id,
      clients.company_name,
      clients.contact_person,
      clients.contact_email,
      clients.contact_phone,
      clients.sector,
      clients.branch,
      clients.assigned_employee_id,
      clients.status,
      clients.onboarding_status,
      clients.follow_up_status,
      clients.next_follow_up_date,
      clients.last_follow_up_date,
      clients.onboarding_source,
      clients.notes,
      clients.follow_up_notes,
      clients.agreement_file_name,
      clients.agreement_file_type,
      clients.agreement_file_data,
      clients.created_at,
      employees.full_name as assigned_employee_name,
      coalesce(job_summary.linked_jobs_count, 0) as linked_jobs_count,
      coalesce(job_summary.linked_jobs, '[]'::json) as linked_jobs
     from clients
     left join employees on employees.id = clients.assigned_employee_id
     left join lateral (
       select
         count(*)::int as linked_jobs_count,
         coalesce(
           json_agg(
             json_build_object(
               'id', jobs.id,
               'jobCode', jobs.job_code,
               'title', jobs.title,
               'status', jobs.status
             )
             order by jobs.created_at desc
           ),
           '[]'::json
         ) as linked_jobs
       from jobs
        where jobs.client_id = clients.id
     ) job_summary on true
     ${employeeScopeClause}
     order by clients.created_at desc`,
    values
  );

  return result.rows.map(mapClientRow);
}

export async function createClient(payload) {
  const result = await query(
    `insert into clients (
      company_name,
      contact_person,
      contact_email,
      contact_phone,
      sector,
      branch,
      assigned_employee_id,
      status,
      onboarding_status,
      follow_up_status,
      next_follow_up_date,
      last_follow_up_date,
      onboarding_source,
      notes,
      follow_up_notes,
      agreement_file_name,
      agreement_file_type,
      agreement_file_data
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11::date, $12, $13, $14, $15, $16, $17)
    returning id, company_name, contact_person, contact_email, contact_phone, sector, branch, assigned_employee_id, status, onboarding_status, follow_up_status, next_follow_up_date, last_follow_up_date, onboarding_source, notes, follow_up_notes, agreement_file_name, agreement_file_type, agreement_file_data, created_at`,
    [
      payload.companyName,
      payload.contactPerson,
      payload.contactEmail || null,
      payload.contactPhone || null,
      payload.sector || null,
      payload.branch || null,
      payload.assignedEmployeeId || null,
      payload.status || "active",
      payload.onboardingStatus || "new-lead",
      payload.followUpStatus || "pending",
      payload.nextFollowUpDate || null,
      payload.lastFollowUpDate || null,
      payload.onboardingSource || null,
      payload.notes || null,
      payload.followUpNotes || null,
      payload.agreementFileName || null,
      payload.agreementFileType || null,
      payload.agreementFileData || null,
    ]
  );

  const client = mapClientRow(result.rows[0]);
  if (payload.assignedEmployeeName) {
    client.assignedEmployeeName = payload.assignedEmployeeName;
  }
  client.linkedJobsCount = 0;
  client.linkedJobs = [];
  return client;
}

export async function createClientTransferRequest(payload) {
  const result = await query(
    `insert into client_transfer_requests (
      client_id,
      requested_by_employee_id,
      requested_to_employee_id,
      reason,
      status
    ) values ($1, $2, $3, $4, 'pending')
    returning id, client_id, requested_by_employee_id, requested_to_employee_id, reason, status, admin_note, reviewed_by_employee_id, reviewed_at, created_at`,
    [
      payload.clientId,
      payload.requestedByEmployeeId,
      payload.requestedToEmployeeId,
      payload.reason || null,
    ]
  );

  const created = result.rows[0];
  const hydrated = await query(
    `select
      requests.id,
      requests.client_id,
      clients.company_name as client_name,
      requests.requested_by_employee_id,
      requested_by.full_name as requested_by_employee_name,
      requests.requested_to_employee_id,
      requested_to.full_name as requested_to_employee_name,
      requests.reason,
      requests.status,
      requests.admin_note,
      requests.reviewed_by_employee_id,
      reviewer.full_name as reviewed_by_employee_name,
      requests.reviewed_at,
      requests.created_at
     from client_transfer_requests requests
     join clients on clients.id = requests.client_id
     join employees requested_by on requested_by.id = requests.requested_by_employee_id
     join employees requested_to on requested_to.id = requests.requested_to_employee_id
     left join employees reviewer on reviewer.id = requests.reviewed_by_employee_id
     where requests.id = $1`,
    [created.id]
  );

  return mapClientTransferRequestRow(hydrated.rows[0]);
}

export async function listClientTransferRequests(employeeId = null, isAdmin = false) {
  const values = [];
  let whereClause = "";

  if (!isAdmin && employeeId) {
    values.push(employeeId);
    whereClause = `where requests.requested_by_employee_id = $${values.length}`;
  }

  const result = await query(
    `select
      requests.id,
      requests.client_id,
      clients.company_name as client_name,
      requests.requested_by_employee_id,
      requested_by.full_name as requested_by_employee_name,
      requests.requested_to_employee_id,
      requested_to.full_name as requested_to_employee_name,
      requests.reason,
      requests.status,
      requests.admin_note,
      requests.reviewed_by_employee_id,
      reviewer.full_name as reviewed_by_employee_name,
      requests.reviewed_at,
      requests.created_at
     from client_transfer_requests requests
     join clients on clients.id = requests.client_id
     join employees requested_by on requested_by.id = requests.requested_by_employee_id
     join employees requested_to on requested_to.id = requests.requested_to_employee_id
     left join employees reviewer on reviewer.id = requests.reviewed_by_employee_id
     ${whereClause}
     order by requests.created_at desc`,
    values
  );

  return result.rows.map(mapClientTransferRequestRow);
}

export async function reviewClientTransferRequest(id, payload) {
  const existingResult = await query(
    `select client_id, requested_to_employee_id, status
     from client_transfer_requests
     where id = $1`,
    [id]
  );
  const existing = existingResult.rows[0];
  if (!existing) {
    return null;
  }

  if (existing.status !== "pending") {
    throw new Error("This transfer request has already been reviewed.");
  }

  if (payload.status === "approved") {
    await query(
      `update clients
       set assigned_employee_id = $1,
           updated_at = now()
       where id = $2`,
      [existing.requested_to_employee_id, existing.client_id]
    );
  }

  await query(
    `update client_transfer_requests
     set status = $1,
         admin_note = $2,
         reviewed_by_employee_id = $3,
         reviewed_at = now(),
         updated_at = now()
     where id = $4`,
    [payload.status, payload.adminNote || null, payload.reviewedByEmployeeId || null, id]
  );

  const hydrated = await query(
    `select
      requests.id,
      requests.client_id,
      clients.company_name as client_name,
      requests.requested_by_employee_id,
      requested_by.full_name as requested_by_employee_name,
      requests.requested_to_employee_id,
      requested_to.full_name as requested_to_employee_name,
      requests.reason,
      requests.status,
      requests.admin_note,
      requests.reviewed_by_employee_id,
      reviewer.full_name as reviewed_by_employee_name,
      requests.reviewed_at,
      requests.created_at
     from client_transfer_requests requests
     join clients on clients.id = requests.client_id
     join employees requested_by on requested_by.id = requests.requested_by_employee_id
     join employees requested_to on requested_to.id = requests.requested_to_employee_id
     left join employees reviewer on reviewer.id = requests.reviewed_by_employee_id
     where requests.id = $1`,
    [id]
  );

  return mapClientTransferRequestRow(hydrated.rows[0]);
}
