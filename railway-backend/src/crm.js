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
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
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
      clients.created_at,
      employees.full_name as assigned_employee_name
     from clients
     left join employees on employees.id = clients.assigned_employee_id
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
      notes
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    returning id, company_name, contact_person, contact_email, contact_phone, sector, branch, assigned_employee_id, status, notes, created_at`,
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
    ]
  );

  const client = mapClientRow(result.rows[0]);
  if (payload.assignedEmployeeName) {
    client.assignedEmployeeName = payload.assignedEmployeeName;
  }
  return client;
}
