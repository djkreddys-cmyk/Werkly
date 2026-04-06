import bcrypt from "bcryptjs";
import { query } from "./db.js";

export async function ensureCrmSchema() {
  await query(`
    create table if not exists employees (
      id uuid primary key default gen_random_uuid(),
      full_name text not null,
      email text not null unique,
      phone text,
      role text not null,
      status text not null default 'active',
      password_hash text not null,
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
}

function mapEmployeeRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  };
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
    `select id, full_name, email, phone, role, status, created_at
     from employees
     order by created_at desc`
  );

  return result.rows.map(mapEmployeeRow);
}

export async function createEmployee(payload) {
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const result = await query(
    `insert into employees (
      full_name,
      email,
      phone,
      role,
      status,
      password_hash
    ) values ($1, $2, $3, $4, $5, $6)
    returning id, full_name, email, phone, role, status, created_at`,
    [
      payload.fullName,
      payload.email,
      payload.phone || null,
      payload.role,
      payload.status || "active",
      passwordHash,
    ]
  );

  return mapEmployeeRow(result.rows[0]);
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
