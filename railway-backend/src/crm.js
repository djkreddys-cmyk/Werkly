import bcrypt from "bcryptjs";
import { pool, query } from "./db.js";

export async function ensureCrmSchema() {
  await query(`
    create table if not exists employees (
      id uuid primary key default gen_random_uuid(),
      full_name text not null,
      email text not null unique,
      employee_code text unique,
      phone text,
      role text not null,
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
      notes text,
      agreement_file_name text,
      agreement_file_type text,
      agreement_file_data text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`alter table clients add column if not exists agreement_file_name text`);
  await query(`alter table clients add column if not exists agreement_file_type text`);
  await query(`alter table clients add column if not exists agreement_file_data text`);
  await query(`alter table employees add column if not exists employee_code text`);
  await query(
    `alter table employees add column if not exists must_change_password boolean not null default true`
  );
  await query(
    `alter table employees add column if not exists password_changed_at timestamptz`
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
    notes: row.notes,
    agreementFileName: row.agreement_file_name,
    agreementFileType: row.agreement_file_type,
    agreementFileData: row.agreement_file_data,
    linkedJobsCount: Number(row.linked_jobs_count ?? 0),
    linkedJobs: Array.isArray(row.linked_jobs) ? row.linked_jobs : [],
    createdAt: row.created_at,
  };
}

export async function listEmployees() {
  const result = await query(
    `select id, full_name, email, employee_code, phone, role, status, must_change_password, inactive_date, inactive_remarks, created_at
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
    const passwordHash = await bcrypt.hash(payload.password, 12);
    const employeeCode = await generateEmployeeCode(client);
    const result = await client.query(
      `insert into employees (
        full_name,
        email,
        employee_code,
        phone,
        role,
        status,
        password_hash,
        must_change_password,
        inactive_date,
        inactive_remarks
      ) values ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)
      returning id, full_name, email, employee_code, phone, role, status, must_change_password, inactive_date, inactive_remarks, created_at`,
      [
        payload.fullName,
        payload.email,
        employeeCode,
        payload.phone || null,
        payload.role,
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
  const values = [
    payload.fullName,
    payload.email,
    payload.phone || null,
    payload.role,
    payload.status || "active",
    isInactive ? payload.inactiveDate || null : null,
    isInactive ? payload.inactiveRemarks || null : null,
  ];

  let passwordClause = "";

  if (payload.password) {
    const passwordHash = await bcrypt.hash(payload.password, 12);
    values.push(passwordHash);
    passwordClause =
      `, password_hash = $8, must_change_password = true, password_changed_at = null`;
  }

  values.push(id);

  const result = await query(
    `update employees
     set full_name = $1,
         email = $2,
         phone = $3,
         role = $4,
         status = $5,
         inactive_date = $6,
         inactive_remarks = $7
         ${passwordClause},
         updated_at = now()
     where id = $${values.length}
     returning id, full_name, email, employee_code, phone, role, status, must_change_password, inactive_date, inactive_remarks, created_at`,
    values
  );

  return result.rows[0] ? mapEmployeeRow(result.rows[0]) : null;
}

export async function authenticateEmployee(identifier, password) {
  const normalizedIdentifier = String(identifier ?? "").trim();
  if (!normalizedIdentifier) {
    return null;
  }

  const result = await query(
    `select
      id,
      full_name,
      email,
      employee_code,
      phone,
      role,
      status,
      password_hash,
      must_change_password,
      inactive_date,
      inactive_remarks,
      created_at
     from employees
     where employee_code = $1`,
    [normalizedIdentifier]
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
     returning id, full_name, email, employee_code, phone, role, status, must_change_password, inactive_date, inactive_remarks, created_at`,
    [passwordHash, employeeId]
  );

  return result.rows[0] ? mapEmployeeRow(result.rows[0]) : null;
}

export async function listClients() {
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
      clients.notes,
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
     order by clients.created_at desc`
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
      notes,
      agreement_file_name,
      agreement_file_type,
      agreement_file_data
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    returning id, company_name, contact_person, contact_email, contact_phone, sector, branch, assigned_employee_id, status, notes, agreement_file_name, agreement_file_type, agreement_file_data, created_at`,
    [
      payload.companyName,
      payload.contactPerson,
      payload.contactEmail || null,
      payload.contactPhone || null,
      payload.sector || null,
      payload.branch || null,
      payload.assignedEmployeeId || null,
      payload.status || "active",
      payload.notes || null,
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
