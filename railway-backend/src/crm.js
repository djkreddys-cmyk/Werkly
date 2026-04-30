import bcrypt from "bcryptjs";
import { pool, query } from "./db.js";

const PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 60;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

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
      communication_address text,
      sector text,
      branch text,
      assigned_employee_id uuid references employees(id) on delete set null,
      follow_up_employee_id uuid references employees(id) on delete set null,
      follow_up_from_date date,
      follow_up_to_date date,
      follow_up_assignment_note text,
      temporary_access_employee_id uuid references employees(id) on delete set null,
      temporary_access_from_date date,
      temporary_access_to_date date,
      temporary_access_scope text,
      temporary_access_note text,
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
      effective_from_date date,
      reason text,
      status text not null default 'pending',
      admin_note text,
      reviewed_by_employee_id uuid references employees(id) on delete set null,
      reviewed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists client_follow_up_history (
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null references clients(id) on delete cascade,
      actor_employee_id uuid references employees(id) on delete set null,
      actor_name text,
      actor_role text,
      from_status text,
      to_status text not null,
      last_follow_up_date date,
      next_follow_up_date date,
      notes text,
      created_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists client_onboarding_history (
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null references clients(id) on delete cascade,
      actor_employee_id uuid references employees(id) on delete set null,
      actor_name text,
      actor_role text,
      from_status text,
      to_status text not null,
      notes text,
      created_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists crm_settings (
      id uuid primary key default gen_random_uuid(),
      recruiter_daily_follow_ups integer not null default 20,
      recruiter_daily_applications integer not null default 12,
      delivery_daily_follow_ups integer not null default 18,
      delivery_daily_applications integer not null default 8,
      leadership_daily_follow_ups integer not null default 6,
      leadership_daily_applications integer not null default 3,
      enable_browser_notifications boolean not null default true,
      enable_email_notifications boolean not null default false,
      enable_whatsapp_notifications boolean not null default false,
      access_control jsonb not null default '{}'::jsonb,
      employee_access_overrides jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists notification_logs (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      message text not null,
      category text not null default 'general',
      severity text not null default 'info',
      target_type text not null default 'all',
      target_employee_id uuid references employees(id) on delete cascade,
      delivery_channels jsonb not null default '[]'::jsonb,
      is_read boolean not null default false,
      created_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists employee_password_reset_requests (
      id uuid primary key default gen_random_uuid(),
      employee_id uuid not null references employees(id) on delete cascade,
      otp_hash text not null,
      verified_at timestamptz,
      consumed_at timestamptz,
      expires_at timestamptz not null,
      attempts integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`alter table clients add column if not exists agreement_file_name text`);
  await query(`alter table clients add column if not exists agreement_file_type text`);
  await query(`alter table clients add column if not exists agreement_file_data text`);
  await query(`alter table clients add column if not exists communication_address text`);
  await query(`alter table clients add column if not exists onboarding_status text not null default 'new-lead'`);
  await query(`alter table clients add column if not exists follow_up_status text not null default 'pending'`);
  await query(`alter table clients add column if not exists next_follow_up_date date`);
  await query(`alter table clients add column if not exists last_follow_up_date date`);
  await query(`alter table clients add column if not exists onboarding_source text`);
  await query(`alter table clients add column if not exists follow_up_notes text`);
  await query(`alter table clients add column if not exists follow_up_employee_id uuid references employees(id) on delete set null`);
  await query(`alter table clients add column if not exists follow_up_from_date date`);
  await query(`alter table clients add column if not exists follow_up_to_date date`);
  await query(`alter table clients add column if not exists follow_up_assignment_note text`);
  await query(`alter table clients add column if not exists temporary_access_employee_id uuid references employees(id) on delete set null`);
  await query(`alter table clients add column if not exists temporary_access_from_date date`);
  await query(`alter table clients add column if not exists temporary_access_to_date date`);
  await query(`alter table clients add column if not exists temporary_access_scope text`);
  await query(`alter table clients add column if not exists temporary_access_note text`);
  await query(`alter table client_transfer_requests add column if not exists effective_from_date date`);
  await query(`alter table client_follow_up_history add column if not exists actor_employee_id uuid references employees(id) on delete set null`);
  await query(`alter table client_follow_up_history add column if not exists actor_name text`);
  await query(`alter table client_follow_up_history add column if not exists actor_role text`);
  await query(`alter table client_follow_up_history add column if not exists from_status text`);
  await query(`alter table client_follow_up_history add column if not exists to_status text`);
  await query(`alter table client_follow_up_history add column if not exists last_follow_up_date date`);
  await query(`alter table client_follow_up_history add column if not exists next_follow_up_date date`);
  await query(`alter table client_follow_up_history add column if not exists notes text`);
  await query(`alter table client_follow_up_history add column if not exists created_at timestamptz not null default now()`);
  await query(`alter table client_onboarding_history add column if not exists actor_employee_id uuid references employees(id) on delete set null`);
  await query(`alter table client_onboarding_history add column if not exists actor_name text`);
  await query(`alter table client_onboarding_history add column if not exists actor_role text`);
  await query(`alter table client_onboarding_history add column if not exists from_status text`);
  await query(`alter table client_onboarding_history add column if not exists to_status text`);
  await query(`alter table client_onboarding_history add column if not exists notes text`);
  await query(`alter table client_onboarding_history add column if not exists created_at timestamptz not null default now()`);
  await query(`alter table crm_settings add column if not exists recruiter_daily_follow_ups integer not null default 20`);
  await query(`alter table crm_settings add column if not exists recruiter_daily_applications integer not null default 12`);
  await query(`alter table crm_settings add column if not exists delivery_daily_follow_ups integer not null default 18`);
  await query(`alter table crm_settings add column if not exists delivery_daily_applications integer not null default 8`);
  await query(`alter table crm_settings add column if not exists leadership_daily_follow_ups integer not null default 6`);
  await query(`alter table crm_settings add column if not exists leadership_daily_applications integer not null default 3`);
  await query(`alter table crm_settings add column if not exists enable_browser_notifications boolean not null default true`);
  await query(`alter table crm_settings add column if not exists enable_email_notifications boolean not null default false`);
  await query(`alter table crm_settings add column if not exists enable_whatsapp_notifications boolean not null default false`);
  await query(`alter table crm_settings add column if not exists access_control jsonb not null default '{}'::jsonb`);
  await query(`alter table crm_settings add column if not exists employee_access_overrides jsonb not null default '[]'::jsonb`);
  await query(`alter table notification_logs add column if not exists category text not null default 'general'`);
  await query(`alter table notification_logs add column if not exists severity text not null default 'info'`);
  await query(`alter table notification_logs add column if not exists target_type text not null default 'all'`);
  await query(`alter table notification_logs add column if not exists target_employee_id uuid references employees(id) on delete cascade`);
  await query(`alter table notification_logs add column if not exists delivery_channels jsonb not null default '[]'::jsonb`);
  await query(`alter table notification_logs add column if not exists is_read boolean not null default false`);
  await query(`alter table notification_logs add column if not exists created_at timestamptz not null default now()`);
  await query(`alter table employee_password_reset_requests add column if not exists verified_at timestamptz`);
  await query(`alter table employee_password_reset_requests add column if not exists consumed_at timestamptz`);
  await query(`alter table employee_password_reset_requests add column if not exists attempts integer not null default 0`);
  await query(`alter table employee_password_reset_requests add column if not exists updated_at timestamptz not null default now()`);
  await query(`create index if not exists idx_employee_password_reset_requests_employee on employee_password_reset_requests(employee_id, created_at desc)`);
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
  await ensureCrmSettingsSeed();
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

function mapClientFollowUpHistoryRow(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    actorEmployeeId: row.actor_employee_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    lastFollowUpDate: row.last_follow_up_date,
    nextFollowUpDate: row.next_follow_up_date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapClientActivityRow(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    type: row.activity_type,
    title: row.activity_title,
    summary: row.activity_summary,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    effectiveDate: row.effective_date,
    createdAt: row.created_at,
  };
}

const defaultAccessControl = {
  recruiter: {
    modules: {
      dashboard: true,
      hr: true,
      jobs: true,
      candidates: true,
      clients: true,
      reports: true,
      settings: false,
      "activity-center": true,
    },
    fields: {
      "hr.manageEmployees": false,
      "hr.employeeDates": true,
      "hr.resetPassword": false,
      "hr.markInactive": false,
      "jobs.createEdit": true,
      "jobs.assignment": true,
      "jobs.compensation": true,
      "jobs.hideToggle": true,
      "jobs.addCandidate": true,
      "candidates.updateStage": true,
      "candidates.transfer": true,
      "candidates.resume": true,
      "candidates.compensation": true,
      "clients.onboarding": true,
      "clients.communicationAddress": true,
      "clients.transfer": true,
      "clients.followUp": true,
      "clients.agreement": true,
      "reports.download": true,
    },
  },
  delivery: {
    modules: {
      dashboard: true,
      hr: true,
      jobs: true,
      candidates: true,
      clients: true,
      reports: true,
      settings: false,
      "activity-center": true,
    },
    fields: {
      "hr.manageEmployees": false,
      "hr.employeeDates": true,
      "hr.resetPassword": false,
      "hr.markInactive": false,
      "jobs.createEdit": true,
      "jobs.assignment": true,
      "jobs.compensation": true,
      "jobs.hideToggle": true,
      "jobs.addCandidate": true,
      "candidates.updateStage": true,
      "candidates.transfer": true,
      "candidates.resume": true,
      "candidates.compensation": true,
      "clients.onboarding": true,
      "clients.communicationAddress": true,
      "clients.transfer": true,
      "clients.followUp": true,
      "clients.agreement": true,
      "reports.download": true,
    },
  },
  leadership: {
    modules: {
      dashboard: true,
      hr: true,
      jobs: true,
      candidates: true,
      clients: true,
      reports: true,
      settings: false,
      "activity-center": true,
    },
    fields: {
      "hr.manageEmployees": true,
      "hr.employeeDates": true,
      "hr.resetPassword": true,
      "hr.markInactive": true,
      "jobs.createEdit": true,
      "jobs.assignment": true,
      "jobs.compensation": true,
      "jobs.hideToggle": true,
      "jobs.addCandidate": true,
      "candidates.updateStage": true,
      "candidates.transfer": true,
      "candidates.resume": true,
      "candidates.compensation": true,
      "clients.onboarding": true,
      "clients.communicationAddress": true,
      "clients.transfer": true,
      "clients.followUp": true,
      "clients.agreement": true,
      "reports.download": true,
    },
  },
};

function normalizeAccessControl(accessControl) {
  if (!accessControl || typeof accessControl !== "object") {
    return defaultAccessControl;
  }

  return {
    recruiter: {
      modules: {
        ...defaultAccessControl.recruiter.modules,
        ...(accessControl.recruiter?.modules ?? {}),
      },
      fields: {
        ...defaultAccessControl.recruiter.fields,
        ...(accessControl.recruiter?.fields ?? {}),
      },
    },
    delivery: {
      modules: {
        ...defaultAccessControl.delivery.modules,
        ...(accessControl.delivery?.modules ?? {}),
      },
      fields: {
        ...defaultAccessControl.delivery.fields,
        ...(accessControl.delivery?.fields ?? {}),
      },
    },
    leadership: {
      modules: {
        ...defaultAccessControl.leadership.modules,
        ...(accessControl.leadership?.modules ?? {}),
      },
      fields: {
        ...defaultAccessControl.leadership.fields,
        ...(accessControl.leadership?.fields ?? {}),
      },
    },
  };
}

function normalizeEmployeeAccessOverrides(overrides) {
  if (!Array.isArray(overrides)) {
    return [];
  }

  return overrides
    .map((override) => ({
      employeeId: String(override.employeeId ?? "").trim() || null,
      employeeCode: String(override.employeeCode ?? "").trim() || null,
      email: String(override.email ?? "").trim().toLowerCase() || null,
      employeeName: String(override.employeeName ?? "").trim() || null,
      role: String(override.role ?? "").trim() || null,
      modules:
        override.modules && typeof override.modules === "object" ? override.modules : {},
      fields:
        override.fields && typeof override.fields === "object" ? override.fields : {},
    }))
    .filter((override) => override.employeeId || override.employeeCode || override.email);
}

function mapCrmSettingsRow(row) {
  return {
    recruiterDailyFollowUps: Number(row.recruiter_daily_follow_ups ?? 20),
    recruiterDailyApplications: Number(row.recruiter_daily_applications ?? 12),
    deliveryDailyFollowUps: Number(row.delivery_daily_follow_ups ?? 18),
    deliveryDailyApplications: Number(row.delivery_daily_applications ?? 8),
    leadershipDailyFollowUps: Number(row.leadership_daily_follow_ups ?? 6),
    leadershipDailyApplications: Number(row.leadership_daily_applications ?? 3),
    enableBrowserNotifications: Boolean(row.enable_browser_notifications),
    enableEmailNotifications: Boolean(row.enable_email_notifications),
    enableWhatsappNotifications: Boolean(row.enable_whatsapp_notifications),
    accessControl: normalizeAccessControl(row.access_control),
    employeeAccessOverrides: normalizeEmployeeAccessOverrides(row.employee_access_overrides),
  };
}

function mapNotificationLogRow(row) {
  return {
    id: row.id,
    notificationKey: row.notification_key,
    title: row.title,
    message: row.message,
    category: row.category,
    severity: row.severity,
    targetType: row.target_type,
    targetEmployeeId: row.target_employee_id,
    deliveryChannels: Array.isArray(row.delivery_channels) ? row.delivery_channels : [],
    isRead: Boolean(row.is_read),
    actionUrl: row.action_url,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    readAt: row.read_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureCrmSettingsSeed() {
  await query(`
    insert into crm_settings (
      recruiter_daily_follow_ups,
      recruiter_daily_applications,
      delivery_daily_follow_ups,
      delivery_daily_applications,
      leadership_daily_follow_ups,
      leadership_daily_applications,
      enable_browser_notifications,
      enable_email_notifications,
      enable_whatsapp_notifications,
      access_control,
      employee_access_overrides
    )
    select 20, 12, 18, 8, 6, 3, true, false, false, $1::jsonb, '[]'::jsonb
    where not exists (select 1 from crm_settings)
  `, [JSON.stringify(defaultAccessControl)]);
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
    communicationAddress: row.communication_address,
    sector: row.sector,
    branch: row.branch,
    assignedEmployeeId: row.assigned_employee_id,
    assignedEmployeeName: row.assigned_employee_name,
    followUpEmployeeId: row.follow_up_employee_id,
    followUpEmployeeName: row.follow_up_employee_name,
    followUpFromDate: row.follow_up_from_date,
    followUpToDate: row.follow_up_to_date,
    followUpAssignmentNote: row.follow_up_assignment_note,
    temporaryAccessEmployeeId: row.temporary_access_employee_id,
    temporaryAccessEmployeeName: row.temporary_access_employee_name,
    temporaryAccessFromDate: row.temporary_access_from_date,
    temporaryAccessToDate: row.temporary_access_to_date,
    temporaryAccessScope: row.temporary_access_scope,
    temporaryAccessNote: row.temporary_access_note,
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
    effectiveFromDate: row.effective_from_date,
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

export async function getEmployeeById(id) {
  const result = await query(
    `select id, full_name, email, employee_code, phone, role, date_of_birth, date_of_joining, education_qualification, previous_experience, education_details, experience_details, status, must_change_password, inactive_date, inactive_remarks, created_at
     from employees
     where id = $1
     limit 1`,
    [id]
  );

  return result.rows[0] ? mapEmployeeRow(result.rows[0]) : null;
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

function normalizeDateKey(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

export async function findEmployeeForPasswordReset(identifier, dateOfBirth) {
  const normalizedIdentifier = String(identifier ?? "").trim();
  const normalizedDateOfBirth = normalizeDateKey(dateOfBirth);

  if (!normalizedIdentifier || !normalizedDateOfBirth) {
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
      must_change_password,
      inactive_date,
      inactive_remarks,
      created_at
     from employees
     where (employee_code = $1 or lower(email) = $2)
       and date_of_birth = $3::date
     limit 1`,
    [normalizedIdentifier, normalizedEmail, normalizedDateOfBirth]
  );

  const employee = result.rows[0];
  if (!employee || employee.status !== "active") {
    return null;
  }

  return mapEmployeeRow(employee);
}

export async function createEmployeePasswordResetRequest(employeeId, otp) {
  const latestRequestResult = await query(
    `select id, created_at
     from employee_password_reset_requests
     where employee_id = $1
     order by created_at desc
     limit 1`,
    [employeeId]
  );

  const latestRequest = latestRequestResult.rows[0];
  if (latestRequest?.created_at) {
    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(latestRequest.created_at).getTime()) / 1000
    );
    if (elapsedSeconds < PASSWORD_RESET_RESEND_COOLDOWN_SECONDS) {
      const retryAfterSeconds = PASSWORD_RESET_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      const error = new Error(
        `Please wait ${retryAfterSeconds} seconds before requesting a new OTP.`
      );
      error.retryAfterSeconds = retryAfterSeconds;
      throw error;
    }
  }

  await query(
    `update employee_password_reset_requests
     set consumed_at = now(),
         updated_at = now()
     where employee_id = $1
       and consumed_at is null
       and verified_at is null`,
    [employeeId]
  );

  const otpHash = await bcrypt.hash(String(otp), 10);
  const result = await query(
    `insert into employee_password_reset_requests (
      employee_id,
      otp_hash,
      expires_at,
      updated_at
    ) values ($1, $2, now() + interval '10 minutes', now())
    returning id, expires_at`,
    [employeeId, otpHash]
  );

  return {
    id: result.rows[0]?.id,
    expiresAt: result.rows[0]?.expires_at,
    resendCooldownSeconds: PASSWORD_RESET_RESEND_COOLDOWN_SECONDS,
  };
}

export async function verifyEmployeePasswordResetOtp({
  requestId,
  identifier,
  dateOfBirth,
  otp,
}) {
  const normalizedIdentifier = String(identifier ?? "").trim();
  const normalizedDateOfBirth = normalizeDateKey(dateOfBirth);
  const normalizedEmail = normalizedIdentifier.toLowerCase();

  const result = await query(
    `select
      requests.id,
      requests.employee_id,
      requests.otp_hash,
      requests.verified_at,
      requests.consumed_at,
      requests.expires_at,
      requests.attempts,
      employees.id as employee_id_value,
      employees.full_name,
      employees.email,
      employees.employee_code,
      employees.phone,
      employees.role,
      employees.date_of_birth,
      employees.date_of_joining,
      employees.education_qualification,
      employees.previous_experience,
      employees.status,
      employees.must_change_password,
      employees.inactive_date,
      employees.inactive_remarks,
      employees.created_at
     from employee_password_reset_requests requests
     join employees on employees.id = requests.employee_id
     where requests.id = $1
       and (employees.employee_code = $2 or lower(employees.email) = $3)
       and employees.date_of_birth = $4::date
     limit 1`,
    [requestId, normalizedIdentifier, normalizedEmail, normalizedDateOfBirth]
  );

  const row = result.rows[0];
  if (!row || row.status !== "active") {
    return null;
  }

  if (row.consumed_at || row.verified_at) {
    throw new Error("This OTP request is no longer active.");
  }

  if (Number(row.attempts || 0) >= PASSWORD_RESET_MAX_ATTEMPTS) {
    await query(
      `update employee_password_reset_requests
       set consumed_at = now(),
           updated_at = now()
       where id = $1`,
      [requestId]
    );
    throw new Error("Too many wrong OTP attempts. Please request a new OTP.");
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error("OTP has expired. Please request a new one.");
  }

  const isValidOtp = await bcrypt.compare(String(otp ?? ""), row.otp_hash);
  if (!isValidOtp) {
    const nextAttempts = Number(row.attempts || 0) + 1;
    await query(
      `update employee_password_reset_requests
       set attempts = attempts + 1,
           consumed_at = case when attempts + 1 >= $2 then now() else consumed_at end,
           updated_at = now()
       where id = $1`,
      [requestId, PASSWORD_RESET_MAX_ATTEMPTS]
    );
    if (nextAttempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
      throw new Error("Too many wrong OTP attempts. Please request a new OTP.");
    }
    throw new Error("Invalid OTP. Please check the code sent to your email.");
  }

  await query(
    `update employee_password_reset_requests
     set verified_at = now(),
         updated_at = now()
     where id = $1`,
    [requestId]
  );

  return {
    requestId: row.id,
    employee: mapEmployeeRow({
      id: row.employee_id_value,
      full_name: row.full_name,
      email: row.email,
      employee_code: row.employee_code,
      phone: row.phone,
      role: row.role,
      date_of_birth: row.date_of_birth,
      date_of_joining: row.date_of_joining,
      education_qualification: row.education_qualification,
      previous_experience: row.previous_experience,
      status: row.status,
      must_change_password: row.must_change_password,
      inactive_date: row.inactive_date,
      inactive_remarks: row.inactive_remarks,
      created_at: row.created_at,
    }),
  };
}

export async function consumeEmployeePasswordResetRequest(requestId, employeeId) {
  const result = await query(
    `update employee_password_reset_requests
     set consumed_at = now(),
         updated_at = now()
     where id = $1
       and employee_id = $2
       and verified_at is not null
       and consumed_at is null
       and expires_at > now()
     returning id`,
    [requestId, employeeId]
  );

  return Boolean(result.rows[0]);
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
        return `where (
          clients.assigned_employee_id = $${values.length}
          or (
            clients.follow_up_employee_id = $${values.length}
            and (clients.follow_up_from_date is null or clients.follow_up_from_date <= current_date)
            and (clients.follow_up_to_date is null or clients.follow_up_to_date >= current_date)
          )
          or (
            clients.temporary_access_employee_id = $${values.length}
            and clients.temporary_access_scope = 'full-access'
            and (clients.temporary_access_from_date is null or clients.temporary_access_from_date <= current_date)
            and (clients.temporary_access_to_date is null or clients.temporary_access_to_date >= current_date)
          )
        )`;
      })()
    : "";

  const result = await query(
    `select
      clients.id,
      clients.company_name,
      clients.contact_person,
      clients.contact_email,
      clients.contact_phone,
      clients.communication_address,
      clients.sector,
      clients.branch,
      clients.assigned_employee_id,
      clients.follow_up_employee_id,
      clients.follow_up_from_date,
      clients.follow_up_to_date,
      clients.follow_up_assignment_note,
      clients.temporary_access_employee_id,
      clients.temporary_access_from_date,
      clients.temporary_access_to_date,
      clients.temporary_access_scope,
      clients.temporary_access_note,
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
      follow_up_employee.full_name as follow_up_employee_name,
      temporary_access_employee.full_name as temporary_access_employee_name,
      coalesce(job_summary.linked_jobs_count, 0) as linked_jobs_count,
      coalesce(job_summary.linked_jobs, '[]'::json) as linked_jobs
     from clients
     left join employees on employees.id = clients.assigned_employee_id
     left join employees follow_up_employee on follow_up_employee.id = clients.follow_up_employee_id
     left join employees temporary_access_employee on temporary_access_employee.id = clients.temporary_access_employee_id
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

export async function getClientById(clientId) {
  const result = await query(
    `select
      clients.id,
      clients.company_name,
      clients.contact_person,
      clients.contact_email,
      clients.contact_phone,
      clients.communication_address,
      clients.sector,
      clients.branch,
      clients.assigned_employee_id,
      clients.follow_up_employee_id,
      clients.follow_up_from_date,
      clients.follow_up_to_date,
      clients.follow_up_assignment_note,
      clients.temporary_access_employee_id,
      clients.temporary_access_from_date,
      clients.temporary_access_to_date,
      clients.temporary_access_scope,
      clients.temporary_access_note,
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
      follow_up_employee.full_name as follow_up_employee_name,
      temporary_access_employee.full_name as temporary_access_employee_name,
      coalesce(job_summary.linked_jobs_count, 0) as linked_jobs_count,
      coalesce(job_summary.linked_jobs, '[]'::json) as linked_jobs
     from clients
     left join employees on employees.id = clients.assigned_employee_id
     left join employees follow_up_employee on follow_up_employee.id = clients.follow_up_employee_id
     left join employees temporary_access_employee on temporary_access_employee.id = clients.temporary_access_employee_id
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
     where clients.id = $1`,
    [clientId]
  );

  return result.rows[0] ? mapClientRow(result.rows[0]) : null;
}

export async function deleteClient(clientId) {
  const result = await query(`delete from clients where id = $1`, [clientId]);
  return result.rowCount > 0;
}

export async function createClient(payload) {
  const result = await query(
    `insert into clients (
      company_name,
      contact_person,
      contact_email,
      contact_phone,
      communication_address,
      sector,
      branch,
      assigned_employee_id,
      follow_up_employee_id,
      follow_up_from_date,
      follow_up_to_date,
      follow_up_assignment_note,
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
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, null, null, null, null, $9, $10, $11, $12::date, $13::date, $14, $15, $16, $17, $18, $19)
    returning id, company_name, contact_person, contact_email, contact_phone, communication_address, sector, branch, assigned_employee_id, follow_up_employee_id, follow_up_from_date, follow_up_to_date, follow_up_assignment_note, status, onboarding_status, follow_up_status, next_follow_up_date, last_follow_up_date, onboarding_source, notes, follow_up_notes, agreement_file_name, agreement_file_type, agreement_file_data, created_at`,
    [
      payload.companyName,
      payload.contactPerson,
      payload.contactEmail || null,
      payload.contactPhone || null,
      payload.communicationAddress || null,
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

export async function reassignClient(clientId, payload) {
  const assignmentType = payload.assignmentType || "ownership-transfer";
  const updatedResult =
    assignmentType === "follow-up-support"
      ? await query(
          `update clients
              set follow_up_employee_id = $2,
                  follow_up_from_date = $3::date,
                  follow_up_to_date = $4::date,
                  follow_up_assignment_note = $5,
                  temporary_access_employee_id = null,
                  temporary_access_from_date = null,
                  temporary_access_to_date = null,
                  temporary_access_scope = null,
                  temporary_access_note = null,
                  updated_at = now()
            where id = $1
            returning id`,
          [
            clientId,
            payload.assignedEmployeeId || null,
            payload.effectiveFromDate || null,
            payload.effectiveToDate || null,
            payload.reason || null,
          ]
        )
      : assignmentType === "temporary-full-access"
        ? await query(
            `update clients
                set temporary_access_employee_id = $2,
                    temporary_access_from_date = $3::date,
                    temporary_access_to_date = $4::date,
                    temporary_access_scope = 'full-access',
                    temporary_access_note = $5,
                    follow_up_employee_id = null,
                    follow_up_from_date = null,
                    follow_up_to_date = null,
                    follow_up_assignment_note = null,
                    updated_at = now()
              where id = $1
              returning id`,
            [
              clientId,
              payload.assignedEmployeeId || null,
              payload.effectiveFromDate || null,
              payload.effectiveToDate || null,
              payload.reason || null,
            ]
          )
      : await query(
          `update clients
              set assigned_employee_id = $2,
                  follow_up_employee_id = null,
                  follow_up_from_date = null,
                  follow_up_to_date = null,
                  follow_up_assignment_note = null,
                  temporary_access_employee_id = null,
                  temporary_access_from_date = null,
                  temporary_access_to_date = null,
                  temporary_access_scope = null,
                  temporary_access_note = null,
                  updated_at = now()
            where id = $1
            returning id`,
          [clientId, payload.assignedEmployeeId || null]
        );

  const updated = updatedResult.rows[0];
  if (!updated) {
    return null;
  }

  const hydratedResult = await query(
    `select
      clients.id,
      clients.company_name,
      clients.contact_person,
      clients.contact_email,
      clients.contact_phone,
      clients.communication_address,
      clients.sector,
      clients.branch,
      clients.assigned_employee_id,
      clients.follow_up_employee_id,
      clients.follow_up_from_date,
      clients.follow_up_to_date,
      clients.follow_up_assignment_note,
      clients.temporary_access_employee_id,
      clients.temporary_access_from_date,
      clients.temporary_access_to_date,
      clients.temporary_access_scope,
      clients.temporary_access_note,
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
      follow_up_employee.full_name as follow_up_employee_name,
      temporary_access_employee.full_name as temporary_access_employee_name,
      coalesce(job_summary.linked_jobs_count, 0) as linked_jobs_count,
      coalesce(job_summary.linked_jobs, '[]'::json) as linked_jobs
     from clients
     left join employees on employees.id = clients.assigned_employee_id
     left join employees follow_up_employee on follow_up_employee.id = clients.follow_up_employee_id
     left join employees temporary_access_employee on temporary_access_employee.id = clients.temporary_access_employee_id
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
     where clients.id = $1`,
    [clientId]
  );

  return hydratedResult.rows[0] ? mapClientRow(hydratedResult.rows[0]) : null;
}

export async function bulkAssignClients(clientIds, payload) {
  const normalizedIds = Array.isArray(clientIds)
    ? clientIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];

  if (normalizedIds.length === 0) {
    return [];
  }

  const result =
    payload.action === "unassign"
      ? await query(
          `update clients
              set assigned_employee_id = null,
                  follow_up_employee_id = null,
                  follow_up_from_date = null,
                  follow_up_to_date = null,
                  follow_up_assignment_note = null,
                  temporary_access_employee_id = null,
                  temporary_access_from_date = null,
                  temporary_access_to_date = null,
                  temporary_access_scope = null,
                  temporary_access_note = null,
                  updated_at = now()
            where id = any($1::uuid[])
            returning id`,
          [normalizedIds]
        )
      : await query(
          `update clients
              set assigned_employee_id = $2,
                  follow_up_employee_id = null,
                  follow_up_from_date = null,
                  follow_up_to_date = null,
                  follow_up_assignment_note = null,
                  temporary_access_employee_id = null,
                  temporary_access_from_date = null,
                  temporary_access_to_date = null,
                  temporary_access_scope = null,
                  temporary_access_note = null,
                  updated_at = now()
            where id = any($1::uuid[])
            returning id`,
          [normalizedIds, payload.assignedEmployeeId || null]
        );

  if (result.rows.length === 0) {
    return [];
  }

  const hydratedResult = await query(
    `select
      clients.id,
      clients.company_name,
      clients.contact_person,
      clients.contact_email,
      clients.contact_phone,
      clients.communication_address,
      clients.sector,
      clients.branch,
      clients.assigned_employee_id,
      clients.follow_up_employee_id,
      clients.follow_up_from_date,
      clients.follow_up_to_date,
      clients.follow_up_assignment_note,
      clients.temporary_access_employee_id,
      clients.temporary_access_from_date,
      clients.temporary_access_to_date,
      clients.temporary_access_scope,
      clients.temporary_access_note,
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
      follow_up_employee.full_name as follow_up_employee_name,
      temporary_access_employee.full_name as temporary_access_employee_name,
      coalesce(job_summary.linked_jobs_count, 0) as linked_jobs_count,
      coalesce(job_summary.linked_jobs, '[]'::json) as linked_jobs
     from clients
     left join employees on employees.id = clients.assigned_employee_id
     left join employees follow_up_employee on follow_up_employee.id = clients.follow_up_employee_id
     left join employees temporary_access_employee on temporary_access_employee.id = clients.temporary_access_employee_id
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
     where clients.id = any($1::uuid[])`,
    [normalizedIds]
  );

  return hydratedResult.rows.map(mapClientRow);
}

export async function updateClientFollowUp(clientId, payload) {
  const existingResult = await query(
    `select follow_up_status
     from clients
     where id = $1`,
    [clientId]
  );

  const existing = existingResult.rows[0];
  if (!existing) {
    return null;
  }

  const updatedResult = await query(
    `update clients
        set follow_up_status = $2,
            next_follow_up_date = $3::date,
            last_follow_up_date = $4::date,
            follow_up_notes = $5,
            updated_at = now()
      where id = $1
      returning id`,
    [
      clientId,
      payload.followUpStatus || "pending",
      payload.nextFollowUpDate || null,
      payload.lastFollowUpDate || null,
      payload.followUpNotes || null,
    ]
  );

  const updated = updatedResult.rows[0];
  if (!updated) {
    return null;
  }

  await query(
    `insert into client_follow_up_history (
      client_id,
      actor_employee_id,
      actor_name,
      actor_role,
      from_status,
      to_status,
      last_follow_up_date,
      next_follow_up_date,
      notes
    ) values ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9)`,
    [
      clientId,
      payload.actorEmployeeId || null,
      payload.actorName || null,
      payload.actorRole || null,
      existing.follow_up_status || null,
      payload.followUpStatus || "pending",
      payload.lastFollowUpDate || null,
      payload.nextFollowUpDate || null,
      payload.followUpNotes || null,
    ]
  );

  const hydratedResult = await query(
    `select
      clients.id,
      clients.company_name,
      clients.contact_person,
      clients.contact_email,
      clients.contact_phone,
      clients.communication_address,
      clients.sector,
      clients.branch,
      clients.assigned_employee_id,
      clients.follow_up_employee_id,
      clients.follow_up_from_date,
      clients.follow_up_to_date,
      clients.follow_up_assignment_note,
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
      follow_up_employee.full_name as follow_up_employee_name,
      coalesce(job_summary.linked_jobs_count, 0) as linked_jobs_count,
      coalesce(job_summary.linked_jobs, '[]'::json) as linked_jobs
     from clients
     left join employees on employees.id = clients.assigned_employee_id
     left join employees follow_up_employee on follow_up_employee.id = clients.follow_up_employee_id
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
     where clients.id = $1`,
    [clientId]
  );

  return hydratedResult.rows[0] ? mapClientRow(hydratedResult.rows[0]) : null;
}

export async function updateClientOnboarding(clientId, payload) {
  const existingResult = await query(
    `select onboarding_status
     from clients
     where id = $1`,
    [clientId]
  );

  const existing = existingResult.rows[0];
  if (!existing) {
    return null;
  }

  const updatedResult = await query(
    `update clients
        set onboarding_status = $2,
            notes = $3,
            updated_at = now()
      where id = $1
      returning id`,
    [clientId, payload.onboardingStatus || "new-lead", payload.notes || null]
  );

  const updated = updatedResult.rows[0];
  if (!updated) {
    return null;
  }

  await query(
    `insert into client_onboarding_history (
      client_id,
      actor_employee_id,
      actor_name,
      actor_role,
      from_status,
      to_status,
      notes
    ) values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      clientId,
      payload.actorEmployeeId || null,
      payload.actorName || null,
      payload.actorRole || null,
      existing.onboarding_status || null,
      payload.onboardingStatus || "new-lead",
      payload.notes || null,
    ]
  );

  return getClientById(clientId);
}

export async function listClientFollowUpHistory(clientId) {
  const result = await query(
    `select
      id,
      client_id,
      actor_employee_id,
      actor_name,
      actor_role,
      from_status,
      to_status,
      last_follow_up_date,
      next_follow_up_date,
      notes,
      created_at
     from client_follow_up_history
     where client_id = $1
     order by created_at desc`,
    [clientId]
  );

  return result.rows.map(mapClientFollowUpHistoryRow);
}

export async function listClientActivity(clientId) {
  const result = await query(
    `select *
     from (
       select
         'onboarding-' || clients.id::text as id,
         clients.id as client_id,
         'onboarding' as activity_type,
         'Client onboarded' as activity_title,
         coalesce(clients.notes, 'Client account was created in CRM.') as activity_summary,
         employees.full_name as actor_name,
         employees.role as actor_role,
         null::text as from_status,
         clients.onboarding_status as to_status,
         clients.created_at::date as effective_date,
         clients.created_at
       from clients
       left join employees on employees.id = clients.assigned_employee_id
       where clients.id = $1

       union all

       select
         history.id::text as id,
         history.client_id,
         'follow-up' as activity_type,
         'Follow-up updated' as activity_title,
         history.notes as activity_summary,
         history.actor_name,
         history.actor_role,
         history.from_status,
         history.to_status,
         coalesce(history.next_follow_up_date, history.last_follow_up_date) as effective_date,
         history.created_at
       from client_follow_up_history history
       where history.client_id = $1

       union all

       select
         onboarding.id::text as id,
         onboarding.client_id,
         'onboarding' as activity_type,
         'Onboarding stage updated' as activity_title,
         onboarding.notes as activity_summary,
         onboarding.actor_name,
         onboarding.actor_role,
         onboarding.from_status,
         onboarding.to_status,
         null::date as effective_date,
         onboarding.created_at
       from client_onboarding_history onboarding
       where onboarding.client_id = $1

       union all

       select
         'transfer-request-' || requests.id::text as id,
         requests.client_id,
         'transfer-request' as activity_type,
         'Transfer requested' as activity_title,
         coalesce(requests.reason, 'Client transfer request raised.') as activity_summary,
         requested_by.full_name as actor_name,
         requested_by.role as actor_role,
         requested_by.full_name as from_status,
         requested_to.full_name as to_status,
         requests.effective_from_date as effective_date,
         requests.created_at
       from client_transfer_requests requests
       join employees requested_by on requested_by.id = requests.requested_by_employee_id
       join employees requested_to on requested_to.id = requests.requested_to_employee_id
       where requests.client_id = $1

       union all

       select
         'transfer-reviewed-' || requests.id::text as id,
         requests.client_id,
         'transfer-reviewed' as activity_type,
         case when requests.status = 'approved' then 'Transfer approved' else 'Transfer reviewed' end as activity_title,
         coalesce(requests.admin_note, requests.reason, 'Transfer request was reviewed.') as activity_summary,
         reviewer.full_name as actor_name,
         reviewer.role as actor_role,
         requests.status as from_status,
         requested_to.full_name as to_status,
         requests.effective_from_date as effective_date,
         coalesce(requests.reviewed_at, requests.created_at) as created_at
       from client_transfer_requests requests
       left join employees reviewer on reviewer.id = requests.reviewed_by_employee_id
       join employees requested_to on requested_to.id = requests.requested_to_employee_id
       where requests.client_id = $1
         and requests.status <> 'pending'

       union all

       select
         'job-linked-' || jobs.id::text as id,
         jobs.client_id,
         'job-linked' as activity_type,
         'Job linked to client' as activity_title,
         jobs.title as activity_summary,
         employees.full_name as actor_name,
         employees.role as actor_role,
         null::text as from_status,
         jobs.job_code as to_status,
         jobs.posted_at as effective_date,
         jobs.created_at
       from jobs
       left join employees on employees.id = jobs.assigned_employee_id
       where jobs.client_id = $1
     ) activity
     order by created_at desc`,
    [clientId]
  );

  return result.rows.map(mapClientActivityRow);
}

export async function getCrmSettings() {
  const result = await query(
    `select *
     from crm_settings
     order by created_at asc
     limit 1`
  );

  return result.rows[0] ? mapCrmSettingsRow(result.rows[0]) : mapCrmSettingsRow({});
}

export async function updateCrmSettings(payload) {
  await ensureCrmSettingsSeed();

  const result = await query(
    `update crm_settings
        set recruiter_daily_follow_ups = $1,
            recruiter_daily_applications = $2,
            delivery_daily_follow_ups = $3,
            delivery_daily_applications = $4,
            leadership_daily_follow_ups = $5,
            leadership_daily_applications = $6,
            enable_browser_notifications = $7,
            enable_email_notifications = $8,
            enable_whatsapp_notifications = $9,
            access_control = $10::jsonb,
            employee_access_overrides = $11::jsonb,
            updated_at = now()
      where id = (select id from crm_settings order by created_at asc limit 1)
      returning *`,
    [
      payload.recruiterDailyFollowUps ?? 20,
      payload.recruiterDailyApplications ?? 12,
      payload.deliveryDailyFollowUps ?? 18,
      payload.deliveryDailyApplications ?? 8,
      payload.leadershipDailyFollowUps ?? 6,
      payload.leadershipDailyApplications ?? 3,
      payload.enableBrowserNotifications ?? true,
      payload.enableEmailNotifications ?? false,
      payload.enableWhatsappNotifications ?? false,
      JSON.stringify(normalizeAccessControl(payload.accessControl)),
      JSON.stringify(normalizeEmployeeAccessOverrides(payload.employeeAccessOverrides)),
    ]
  );

  return mapCrmSettingsRow(result.rows[0]);
}

export async function listNotificationLogs(employeeId = null, includeAllForAdmin = false) {
  const values = [];
  let whereClause = "";

  if (employeeId && !includeAllForAdmin) {
    values.push(employeeId);
    whereClause = `where target_type = 'all' or (target_type = 'employee' and target_employee_id = $${values.length})`;
  }

  const result = await query(
    `select
      id,
      title,
      message,
      category,
      severity,
      target_type,
      target_employee_id,
      delivery_channels,
      is_read,
      notification_key,
      action_url,
      entity_type,
      entity_id,
      metadata,
      read_at,
      created_at,
      updated_at
     from notification_logs
     ${whereClause}
     order by created_at desc
     limit 50`,
    values
  );

  return result.rows.map(mapNotificationLogRow);
}

export async function createNotificationLog(payload) {
  const result = await query(
    `insert into notification_logs (
      notification_key,
      title,
      message,
      category,
      severity,
      target_type,
      target_employee_id,
      delivery_channels,
      is_read,
      action_url,
      entity_type,
      entity_id,
      metadata,
      read_at,
      updated_at
    ) values (
      $1::text,
      $2::text,
      $3::text,
      $4::text,
      $5::text,
      $6::text,
      $7::uuid,
      $8::jsonb,
      $9::boolean,
      $10::text,
      $11::text,
      $12::text,
      $13::jsonb,
      $14::timestamptz,
      now()
    )
    returning *`,
    [
      payload.notificationKey || null,
      payload.title,
      payload.message,
      payload.category || "general",
      payload.severity || "info",
      payload.targetType || "all",
      payload.targetEmployeeId || null,
      JSON.stringify(payload.deliveryChannels || []),
      payload.isRead ?? false,
      payload.actionUrl || null,
      payload.entityType || null,
      payload.entityId || null,
      JSON.stringify(payload.metadata || {}),
      payload.isRead ? new Date().toISOString() : null,
    ]
  );

  return mapNotificationLogRow(result.rows[0]);
}

export async function markNotificationRead(id, employeeId = null, includeAllForAdmin = false) {
  const values = [id];
  let whereClause = `where id = $1`;

  if (employeeId && !includeAllForAdmin) {
    values.push(employeeId);
    whereClause += ` and (target_type = 'all' or (target_type = 'employee' and target_employee_id = $2))`;
  }

  const result = await query(
    `update notification_logs
        set is_read = true
            , read_at = now()
            , updated_at = now()
      ${whereClause}
      returning *`,
    values
  );

  return result.rows[0] ? mapNotificationLogRow(result.rows[0]) : null;
}

export async function createClientTransferRequest(payload) {
  const result = await query(
    `insert into client_transfer_requests (
      client_id,
      requested_by_employee_id,
      requested_to_employee_id,
      effective_from_date,
      reason,
      status
    ) values ($1, $2, $3, $4::date, $5, 'pending')
    returning id, client_id, requested_by_employee_id, requested_to_employee_id, effective_from_date, reason, status, admin_note, reviewed_by_employee_id, reviewed_at, created_at`,
    [
      payload.clientId,
      payload.requestedByEmployeeId,
      payload.requestedToEmployeeId,
      payload.effectiveFromDate || null,
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
      requests.effective_from_date,
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
      requests.effective_from_date,
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
      requests.effective_from_date,
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
