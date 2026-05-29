import { pool, query } from "./db.js";

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function normalizePositionsCount(payload) {
  const rawValue =
    payload.positionsCount ??
    payload.positions_count ??
    payload.numberOfPositions ??
    payload.noOfPositions ??
    payload.openPositions;
  const parsedValue = Math.floor(Number(rawValue ?? 1));
  return Number.isFinite(parsedValue) ? Math.max(1, parsedValue) : 1;
}

export function mapRow(row) {
  return {
    id: row.id,
    jobCode: row.job_code,
    clientId: row.client_id,
    clientName: row.client_name,
    recruiterId: row.assigned_employee_id,
    clientAssignedEmployeeId: row.client_assigned_employee_id,
    clientFollowUpEmployeeId: row.client_follow_up_employee_id,
    recruiterName: row.recruiter_name,
    recruiterEmail: row.recruiter_email,
    slug: row.slug,
    title: row.title,
    location: row.location,
    sector: row.sector,
    experience: row.experience,
    employmentType: row.employment_type,
    salary: row.salary,
    packagePerAnnum: row.package_per_annum,
    positionsCount: Math.max(1, Number(row.positions_count ?? 1) || 1),
    status: row.status,
    isHidden: Boolean(row.is_hidden),
    postedAt: row.posted_at,
    lastDateToApply: row.last_date_to_apply,
    applicationsCount: Number(row.applications_count ?? 0),
    summary: row.summary,
    description: row.description,
    skills: normalizeArray(row.skills),
    responsibilities: normalizeArray(row.responsibilities),
    requirements: normalizeArray(row.requirements),
    applyUrl: row.apply_url,
  };
}

export function mapApplicationRow(row) {
  return {
    id: row.id,
    parentApplicationId: row.parent_application_id,
    jobId: row.job_id,
    assignedEmployeeId: row.assigned_employee_id,
    stage: row.stage,
    stageNote: row.stage_note,
    stageDate: row.stage_date,
    stageUpdatedAt: row.stage_updated_at,
    jobCode: row.job_code,
    clientName: row.client_name,
    recruiterName: row.recruiter_name,
    recruiterEmail: row.recruiter_email,
    jobLocation: row.job_location,
    sector: row.sector,
    candidateName: row.candidate_name,
    candidateEmail: row.candidate_email || "",
    candidatePhone: row.candidate_phone,
    gender: row.gender,
    motherTongue: row.mother_tongue,
    otherLanguages: row.other_languages,
    experience: row.experience,
    currentCompany: row.current_company,
    currentLocation: row.current_location,
    currentDesignation: row.current_designation,
    preferredRole: row.preferred_role,
    currentCtc: row.current_ctc,
    expectedCtc: row.expected_ctc,
    noticePeriod: row.notice_period,
    finalCtc: row.final_ctc,
    dateOfJoining: row.date_of_joining,
    preferredLocation: row.preferred_location,
    preferredSector: row.preferred_sector,
    sourceType: row.source_type,
    sourceNote: row.source_note,
    entryType: row.entry_type,
    resumeFileName: row.resume_file_name,
    resumeFileType: row.resume_file_type,
    resumeFileData: row.resume_file_data,
    resumeAvailable: Boolean(row.resume_available || row.resume_file_data),
    uploadedByEmployeeId: row.uploaded_by_employee_id,
    uploadedByEmployeeName: row.uploaded_by_employee_name,
    followUpEmployeeId: row.follow_up_employee_id,
    followUpEmployeeName: row.follow_up_employee_name,
    followUpFromDate: row.follow_up_from_date,
    followUpToDate: row.follow_up_to_date,
    followUpAssignmentNote: row.follow_up_assignment_note,
    interviewScheduledAt: row.interview_scheduled_at,
    interviewMode: row.interview_mode,
    interviewPanel: row.interview_panel,
    interviewReminderAt: row.interview_reminder_at,
    candidateMessage: row.candidate_message,
    jobTitle: row.job_title,
    appliedAt: row.applied_at,
  };
}

export function mapApplicationHistoryRow(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    jobId: row.job_id,
    jobCode: row.job_code,
    jobTitle: row.job_title,
    clientName: row.client_name,
    recruiterName: row.recruiter_name,
    recruiterEmail: row.recruiter_email,
    candidateName: row.candidate_name,
    candidateEmail: row.candidate_email,
    fromStage: row.from_stage,
    toStage: row.to_stage,
    stageNote: row.stage_note,
    stageDate: row.stage_date,
    changedAt: row.changed_at,
  };
}

export function mapCandidateEnquiryRow(row) {
  return {
    id: row.id,
    candidateName: row.candidate_name,
    candidateEmail: row.candidate_email || "",
    candidatePhone: row.candidate_phone,
    gender: row.gender,
    motherTongue: row.mother_tongue,
    otherLanguages: row.other_languages,
    experience: row.experience,
    currentCompany: row.current_company,
    currentLocation: row.current_location,
    currentDesignation: row.current_designation,
    preferredRole: row.preferred_role,
    currentCtc: row.current_ctc,
    expectedCtc: row.expected_ctc,
    preferredLocation: row.preferred_location,
    preferredSector: row.preferred_sector,
    candidateMessage: row.candidate_message,
    resumeFileName: row.resume_file_name,
    resumeFileType: row.resume_file_type,
    resumeFileData: row.resume_file_data,
    sourceType: row.source_type,
    createdAt: row.created_at,
  };
}

export function mapResumeBuilderSubmissionRow(row) {
  return {
    id: row.id,
    candidateName: row.candidate_name,
    candidateEmail: row.candidate_email || "",
    candidatePhone: row.candidate_phone,
    gender: row.gender,
    motherTongue: row.mother_tongue,
    otherLanguages: row.other_languages,
    targetRole: row.target_role,
    location: row.location,
    yearsExperience: row.years_experience,
    skills: row.skills,
    resumeFileName: row.resume_file_name,
    resumeFileType: row.resume_file_type,
    resumeFileData: row.resume_file_data,
    resumePayload: row.resume_payload,
    sourceType: row.source_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listJobs() {
  const result = await query(
    `select
      jobs.id,
      jobs.job_code,
      jobs.client_id,
      clients.company_name as client_name,
      jobs.assigned_employee_id,
      employees.full_name as recruiter_name,
      employees.email as recruiter_email,
      jobs.slug,
      jobs.title,
      jobs.location,
      jobs.sector,
      jobs.experience,
      jobs.employment_type,
      jobs.salary,
      jobs.package_per_annum,
      jobs.positions_count,
      jobs.status,
      jobs.is_hidden,
      jobs.posted_at,
      jobs.last_date_to_apply,
      jobs.applications_count,
      jobs.summary,
      jobs.description,
      jobs.skills,
      jobs.responsibilities,
      jobs.requirements,
     jobs.apply_url
     from jobs
     left join clients on clients.id = jobs.client_id
     left join employees on employees.id = coalesce(jobs.assigned_employee_id, clients.assigned_employee_id)
     where coalesce(jobs.is_hidden, false) = false
       and jobs.status = 'open'
       and (jobs.last_date_to_apply is null or jobs.last_date_to_apply >= current_date)
     order by
       case when jobs.status = 'open' then 0 else 1 end,
       jobs.posted_at desc,
       coalesce(jobs.last_date_to_apply, '9999-12-31'::date) asc,
       jobs.created_at desc`
  );

  return result.rows.map(mapRow);
}

export async function listAdminJobs(employeeId = null) {
  const values = [];
  const employeeScopeClause = employeeId
    ? (() => {
        values.push(employeeId);
        return `where (
          coalesce(jobs.assigned_employee_id, clients.assigned_employee_id) = $${values.length}
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
      jobs.id,
      jobs.job_code,
      jobs.client_id,
      clients.company_name as client_name,
      jobs.assigned_employee_id,
      clients.assigned_employee_id as client_assigned_employee_id,
      clients.follow_up_employee_id as client_follow_up_employee_id,
      employees.full_name as recruiter_name,
      employees.email as recruiter_email,
      jobs.slug,
      jobs.title,
      jobs.location,
      jobs.sector,
      jobs.experience,
      jobs.employment_type,
      jobs.salary,
      jobs.package_per_annum,
      jobs.positions_count,
      jobs.status,
      jobs.is_hidden,
      jobs.posted_at,
      jobs.last_date_to_apply,
      jobs.applications_count,
      jobs.summary,
      jobs.description,
      jobs.skills,
      jobs.responsibilities,
      jobs.requirements,
      jobs.apply_url
     from jobs
     left join clients on clients.id = jobs.client_id
     left join employees on employees.id = coalesce(jobs.assigned_employee_id, clients.assigned_employee_id)
     ${employeeScopeClause}
     order by
       case when jobs.status = 'open' then 0 else 1 end,
       jobs.posted_at desc,
       coalesce(jobs.last_date_to_apply, '9999-12-31'::date) asc,
       jobs.created_at desc`,
    values
  );

  return result.rows.map(mapRow);
}

export async function getJobBySlug(slug) {
  const result = await query(
    `select
      jobs.id,
      jobs.job_code,
      jobs.client_id,
      clients.company_name as client_name,
      jobs.assigned_employee_id,
      clients.assigned_employee_id as client_assigned_employee_id,
      clients.follow_up_employee_id as client_follow_up_employee_id,
      employees.full_name as recruiter_name,
      employees.email as recruiter_email,
      jobs.slug,
      jobs.title,
      jobs.location,
      jobs.sector,
      jobs.experience,
      jobs.employment_type,
      jobs.salary,
      jobs.package_per_annum,
      jobs.positions_count,
      jobs.status,
      jobs.is_hidden,
      jobs.posted_at,
      jobs.last_date_to_apply,
      jobs.applications_count,
      jobs.summary,
      jobs.description,
      jobs.skills,
      jobs.responsibilities,
      jobs.requirements,
     jobs.apply_url
     from jobs
     left join clients on clients.id = jobs.client_id
     left join employees on employees.id = coalesce(jobs.assigned_employee_id, clients.assigned_employee_id)
     where jobs.slug = $1
       and coalesce(jobs.is_hidden, false) = false
       and jobs.status = 'open'
       and (jobs.last_date_to_apply is null or jobs.last_date_to_apply >= current_date)
     limit 1`,
    [slug]
  );

  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function ensureJobsSchema() {
  await query(`create extension if not exists pgcrypto`);
  await query(`alter table jobs add column if not exists job_code text unique`);
  await query(`alter table jobs add column if not exists last_date_to_apply date`);
  await query(`alter table jobs add column if not exists positions_count integer not null default 1`);
  await query(`update jobs set positions_count = 1 where positions_count is null or positions_count < 1`);
  await query(`alter table jobs add column if not exists applications_count integer not null default 0`);
  await query(`alter table jobs add column if not exists is_hidden boolean not null default false`);
  await query(`alter table jobs add column if not exists client_id uuid references clients(id) on delete set null`);
  await query(
    `alter table jobs add column if not exists assigned_employee_id uuid references employees(id) on delete set null`
  );
  await query(`
    create table if not exists job_applications (
      id uuid primary key default gen_random_uuid(),
      parent_application_id uuid references job_applications(id) on delete set null,
      job_id uuid not null references jobs(id) on delete cascade,
      candidate_name text not null,
      candidate_email text not null,
      candidate_phone text,
      experience text,
      current_company text,
      current_location text,
      current_designation text,
      preferred_role text,
      current_ctc text,
      expected_ctc text,
      notice_period text,
      preferred_location text,
      preferred_sector text,
      candidate_message text,
      job_title text,
      applied_at timestamptz not null default now()
    )
  `);
  await query(
    `create index if not exists idx_job_applications_job_id on job_applications(job_id)`
  );
  await query(
    `alter table job_applications add column if not exists parent_application_id uuid references job_applications(id) on delete set null`
  );
  await query(
    `alter table job_applications add column if not exists stage text not null default 'applied'`
  );
  await query(`alter table job_applications add column if not exists stage_note text`);
  await query(`alter table job_applications add column if not exists stage_date date`);
  await query(
    `alter table job_applications add column if not exists stage_updated_at timestamptz not null default now()`
  );
  await query(`alter table job_applications add column if not exists candidate_phone text`);
  await query(`alter table job_applications add column if not exists gender text`);
  await query(`alter table job_applications add column if not exists mother_tongue text`);
  await query(`alter table job_applications add column if not exists other_languages text`);
  await query(`alter table job_applications add column if not exists experience text`);
  await query(`alter table job_applications add column if not exists current_company text`);
  await query(`alter table job_applications add column if not exists current_location text`);
  await query(`alter table job_applications add column if not exists current_designation text`);
  await query(`alter table job_applications add column if not exists preferred_role text`);
  await query(`alter table job_applications add column if not exists current_ctc text`);
  await query(`alter table job_applications add column if not exists expected_ctc text`);
  await query(`alter table job_applications add column if not exists notice_period text`);
  await query(`alter table job_applications add column if not exists final_ctc text`);
  await query(`alter table job_applications add column if not exists date_of_joining date`);
  await query(`alter table job_applications add column if not exists preferred_location text`);
  await query(`alter table job_applications add column if not exists preferred_sector text`);
  await query(`alter table job_applications add column if not exists candidate_message text`);
  await query(`alter table job_applications add column if not exists job_title text`);
  await query(`alter table job_applications add column if not exists source_type text`);
  await query(`alter table job_applications add column if not exists source_note text`);
  await query(
    `alter table job_applications add column if not exists entry_type text not null default 'website_apply'`
  );
  await query(
    `alter table job_applications add column if not exists updated_at timestamptz not null default now()`
  );
  await query(`alter table job_applications add column if not exists resume_file_name text`);
  await query(`alter table job_applications add column if not exists resume_file_type text`);
  await query(`alter table job_applications add column if not exists resume_file_data text`);
  await query(
    `alter table job_applications add column if not exists uploaded_by_employee_id uuid references employees(id) on delete set null`
  );
  await query(
    `alter table job_applications add column if not exists assigned_employee_id uuid references employees(id) on delete set null`
  );
  await query(
    `alter table job_applications add column if not exists follow_up_employee_id uuid references employees(id) on delete set null`
  );
  await query(`alter table job_applications add column if not exists follow_up_from_date date`);
  await query(`alter table job_applications add column if not exists follow_up_to_date date`);
  await query(`alter table job_applications add column if not exists follow_up_assignment_note text`);
  await query(`alter table job_applications add column if not exists interview_scheduled_at timestamptz`);
  await query(`alter table job_applications add column if not exists interview_mode text`);
  await query(`alter table job_applications add column if not exists interview_panel text`);
  await query(`alter table job_applications add column if not exists interview_reminder_at timestamptz`);
  await query(`alter table job_applications alter column candidate_email drop not null`);
  await query(
    `create index if not exists idx_job_applications_stage on job_applications(stage)`
  );
  await query(
    `create index if not exists idx_job_applications_applied_at on job_applications(applied_at desc)`
  );
  await query(
    `create index if not exists idx_job_applications_interview_scheduled_at
     on job_applications(interview_scheduled_at)
     where interview_scheduled_at is not null`
  );
  await query(
    `create index if not exists idx_job_applications_candidate_email_lower
     on job_applications(lower(candidate_email))
     where candidate_email is not null and candidate_email <> ''`
  );
  await query(
    `create index if not exists idx_job_applications_candidate_phone_digits
     on job_applications(regexp_replace(coalesce(candidate_phone, ''), '\\D', '', 'g'))
     where candidate_phone is not null and candidate_phone <> ''`
  );
  await query(
    `create index if not exists idx_jobs_status_posted_at on jobs(status, posted_at desc)`
  );
  await query(
    `create index if not exists idx_jobs_last_date_to_apply on jobs(last_date_to_apply)`
  );
  await query(`
    create table if not exists job_application_stage_history (
      id uuid primary key default gen_random_uuid(),
      application_id uuid not null references job_applications(id) on delete cascade,
      from_stage text,
      to_stage text not null,
      stage_note text,
      stage_date date,
      changed_at timestamptz not null default now()
    )
  `);
  await query(
    `create index if not exists idx_job_application_stage_history_application_id
     on job_application_stage_history(application_id)`
  );
  await query(`
    create table if not exists candidate_enquiries (
      id uuid primary key default gen_random_uuid(),
      candidate_name text not null,
      candidate_email text not null,
      candidate_phone text,
      experience text,
      current_company text,
      current_location text,
      current_designation text,
      preferred_role text,
      current_ctc text,
      expected_ctc text,
      preferred_location text,
      preferred_sector text,
      candidate_message text,
      resume_file_name text,
      resume_file_type text,
      resume_file_data text,
      source_type text not null default 'website_candidate_enquiry',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await query(`alter table candidate_enquiries add column if not exists gender text`);
  await query(`alter table candidate_enquiries add column if not exists mother_tongue text`);
  await query(`alter table candidate_enquiries add column if not exists other_languages text`);

  await query(`
    create table if not exists resume_builder_submissions (
      id uuid primary key default gen_random_uuid(),
      candidate_name text not null,
      candidate_email text not null,
      candidate_phone text,
      target_role text,
      location text,
      years_experience text,
      skills text,
      resume_file_name text,
      resume_file_type text,
      resume_file_data text,
      resume_payload jsonb,
      source_type text not null default 'resume_builder',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await query(`alter table resume_builder_submissions add column if not exists gender text`);
  await query(`alter table resume_builder_submissions add column if not exists mother_tongue text`);
  await query(`alter table resume_builder_submissions add column if not exists other_languages text`);
}

async function generateJobCode(client, postedAt) {
  const jobDate = postedAt ? new Date(postedAt) : new Date();
  const year = String(jobDate.getFullYear()).slice(-2);
  const month = String(jobDate.getMonth() + 1).padStart(2, "0");
  const prefix = `${year}${month}`;

  await client.query("lock table jobs in exclusive mode");

  const result = await client.query(
    `select job_code
     from jobs
     where job_code like $1
     order by job_code desc
     limit 1`,
    [`${prefix}%`]
  );

  const lastCode = result.rows[0]?.job_code;
  const nextSequence = lastCode ? Number(String(lastCode).slice(4)) + 1 : 1;
  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateUniqueJobSlug(client, baseValue, excludeId = null) {
  const baseSlug = slugify(baseValue) || `job-${Date.now()}`;
  let attempt = 0;

  while (attempt < 200) {
    const candidateSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const values = [candidateSlug];
    let whereClause = `where slug = $1`;

    if (excludeId) {
      values.push(excludeId);
      whereClause += ` and id <> $2`;
    }

    const existing = await client.query(
      `select id
       from jobs
       ${whereClause}
       limit 1`,
      values
    );

    if (!existing.rows[0]) {
      return candidateSlug;
    }

    attempt += 1;
  }

  return `${baseSlug}-${Date.now()}`;
}

export async function createJob(payload) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const jobCode = await generateJobCode(client, payload.postedAt);
    const uniqueSlug = await generateUniqueJobSlug(
      client,
      payload.slug || payload.title || jobCode
    );
    const allowedStatuses = new Set(["draft", "open", "closed"]);
    const normalizedStatus = allowedStatuses.has(payload.status) ? payload.status : "open";
    const result = await client.query(
      `insert into jobs (
        job_code,
        client_id,
        assigned_employee_id,
        slug,
        title,
        location,
        sector,
        experience,
        employment_type,
        salary,
        package_per_annum,
        positions_count,
        status,
        is_hidden,
        posted_at,
        last_date_to_apply,
        summary,
        description,
        skills,
        responsibilities,
        requirements,
        apply_url
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,coalesce($15::date, current_date),$16::date,$17,$18,$19,$20,$21,$22
      )
      returning *`,
      [
        jobCode,
        payload.clientId || null,
        payload.recruiterId || null,
        uniqueSlug,
        payload.title,
        payload.location,
        payload.sector,
        payload.experience,
        payload.employmentType,
        payload.salary || null,
        payload.packagePerAnnum || null,
        normalizePositionsCount(payload),
        normalizedStatus,
        payload.isHidden ?? false,
        payload.postedAt || null,
        payload.lastDateToApply || null,
        payload.summary || "",
        payload.description,
        payload.skills || [],
        payload.responsibilities,
        payload.requirements,
        payload.applyUrl || null,
      ]
    );

    await client.query("commit");
    return mapRow(result.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateJob(id, payload) {
  const client = await pool.connect();

  try {
    const uniqueSlug = await generateUniqueJobSlug(
      client,
      payload.slug || payload.title || id,
      id
    );
    const result = await client.query(
    `update jobs set
      slug = $2,
      client_id = $3,
      assigned_employee_id = $4,
      title = $5,
      location = $6,
      sector = $7,
      experience = $8,
      employment_type = $9,
      salary = $10,
      package_per_annum = $11,
      positions_count = $12,
      status = $13,
      is_hidden = $14,
      last_date_to_apply = $15,
      summary = $16,
      description = $17,
      skills = $18,
      responsibilities = $19,
      requirements = $20,
      updated_at = now()
    where id = $1
    returning *`,
    [
      id,
      uniqueSlug,
      payload.clientId || null,
      payload.recruiterId || null,
      payload.title,
      payload.location,
      payload.sector,
      payload.experience,
      payload.employmentType,
      payload.salary || null,
      payload.packagePerAnnum || null,
      normalizePositionsCount(payload),
      payload.status,
      payload.isHidden ?? false,
      payload.lastDateToApply || null,
      payload.summary || "",
      payload.description,
      payload.skills || [],
      payload.responsibilities,
      payload.requirements,
    ]
  );

    return result.rows[0] ? mapRow(result.rows[0]) : null;
  } finally {
    client.release();
  }
}

export async function getAdminJobById(id) {
  const result = await query(
    `select
      jobs.id,
      jobs.job_code,
      jobs.client_id,
      clients.company_name as client_name,
      jobs.assigned_employee_id,
      clients.assigned_employee_id as client_assigned_employee_id,
      clients.follow_up_employee_id as client_follow_up_employee_id,
      employees.full_name as recruiter_name,
      employees.email as recruiter_email,
      jobs.slug,
      jobs.title,
      jobs.location,
      jobs.sector,
      jobs.experience,
      jobs.employment_type,
      jobs.salary,
      jobs.package_per_annum,
      jobs.positions_count,
      jobs.status,
      jobs.is_hidden,
      jobs.posted_at,
      jobs.last_date_to_apply,
      jobs.applications_count,
      jobs.summary,
      jobs.description,
      jobs.skills,
      jobs.responsibilities,
      jobs.requirements,
      jobs.apply_url
     from jobs
     left join clients on clients.id = jobs.client_id
     left join employees on employees.id = coalesce(jobs.assigned_employee_id, clients.assigned_employee_id)
     where jobs.id = $1
     limit 1`,
    [id]
  );

  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function deleteJob(id) {
  const result = await query("delete from jobs where id = $1", [id]);
  return result.rowCount > 0;
}

export async function mergeJobsByCode(primaryJobCode, duplicateJobCode) {
  const primaryCode = String(primaryJobCode || "").trim();
  const duplicateCode = String(duplicateJobCode || "").trim();

  if (!primaryCode || !duplicateCode || primaryCode === duplicateCode) {
    throw new Error("Two different job codes are required to merge jobs.");
  }

  const client = await pool.connect();

  try {
    await client.query("begin");

    const jobsResult = await client.query(
      `select id, job_code, title, applications_count
       from jobs
       where job_code = any($1::text[])
       for update`,
      [[primaryCode, duplicateCode]]
    );

    const primaryJob = jobsResult.rows.find((job) => job.job_code === primaryCode);
    const duplicateJob = jobsResult.rows.find((job) => job.job_code === duplicateCode);

    if (!primaryJob || !duplicateJob) {
      await client.query("rollback");
      return null;
    }

    const movedApplicationsResult = await client.query(
      `update job_applications
       set job_id = $1
       where job_id = $2
       returning id`,
      [primaryJob.id, duplicateJob.id]
    );

    await client.query(
      `update crm_timeline_events
       set entity_id = $1
       where entity_type = 'job'
         and entity_id = $2`,
      [primaryJob.id, duplicateJob.id]
    );

    await client.query(
      `update crm_audit_logs
       set entity_id = $1
       where entity_type = 'job'
         and entity_id = $2`,
      [primaryJob.id, duplicateJob.id]
    );

    await client.query(
      `update crm_approval_requests
       set entity_id = $1
       where entity_type = 'job'
         and entity_id = $2`,
      [primaryJob.id, duplicateJob.id]
    );

    await client.query(
      `update notification_logs
       set entity_id = $1
       where entity_type = 'job'
         and entity_id = $2`,
      [primaryJob.id, duplicateJob.id]
    );

    await client.query(`delete from jobs where id = $1`, [duplicateJob.id]);

    const updatedJobResult = await client.query(
      `update jobs
       set applications_count = (
         select count(*)::int
         from job_applications
         where job_applications.job_id = jobs.id
       ),
           updated_at = now()
       where id = $1
       returning *`,
      [primaryJob.id]
    );

    await client.query("commit");

    return {
      job: updatedJobResult.rows[0] ? mapRow(updatedJobResult.rows[0]) : null,
      mergedFrom: {
        id: duplicateJob.id,
        jobCode: duplicateJob.job_code,
        title: duplicateJob.title,
      },
      movedApplicationsCount: movedApplicationsResult.rowCount,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function recordJobApplication(slug, payload) {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const jobResult = await client.query(
      `select id
       from jobs
       where slug = $1
       limit 1`,
      [slug]
    );

    const jobId = jobResult.rows[0]?.id;
    if (!jobId) {
      await client.query("rollback");
      return null;
    }

    await client.query(
      `insert into job_applications (
        job_id,
        stage,
        stage_note,
        stage_date,
        stage_updated_at,
        candidate_name,
        candidate_email,
        candidate_phone,
        gender,
        mother_tongue,
        other_languages,
        experience,
        current_company,
        current_location,
        current_designation,
        preferred_role,
        current_ctc,
        expected_ctc,
        notice_period,
        preferred_location,
        preferred_sector,
        source_type,
        source_note,
        entry_type,
        resume_file_name,
        resume_file_type,
        resume_file_data,
        candidate_message,
        job_title
      ) values ($1, $2, $3, current_date, now(), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)` ,
      [
        jobId,
        "applied",
        "Initial application submitted.",
        payload.candidateName,
        payload.candidateEmail,
        payload.candidatePhone || null,
        payload.gender || null,
        payload.motherTongue || null,
        payload.otherLanguages || null,
        payload.experience || null,
        payload.currentCompany || null,
        payload.currentLocation || null,
        payload.currentDesignation || null,
        payload.preferredRole || null,
        payload.currentCtc || null,
        payload.expectedCtc || null,
        payload.noticePeriod || null,
        payload.preferredLocation || null,
        payload.preferredSector || null,
        "Website",
        payload.sourceNote || null,
        "website_apply",
        payload.resumeFileName || null,
        payload.resumeFileType || null,
        payload.resumeFileData || null,
        payload.candidateMessage || null,
        payload.jobTitle || null,
      ]
    );

    const result = await client.query(
      `update jobs
       set applications_count = coalesce(applications_count, 0) + 1,
           updated_at = now()
       where id = $1
       returning *`,
      [jobId]
    );

    await client.query("commit");
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function createManualJobApplication(jobId, payload, employeeId = null) {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const values = [jobId];
    const employeeScopeClause = employeeId
      ? `and (
           coalesce(jobs.assigned_employee_id, clients.assigned_employee_id) = $2
           or (
             clients.temporary_access_employee_id = $2
             and clients.temporary_access_scope = 'full-access'
             and (clients.temporary_access_from_date is null or clients.temporary_access_from_date <= current_date)
             and (clients.temporary_access_to_date is null or clients.temporary_access_to_date >= current_date)
           )
         )`
      : "";

    if (employeeId) {
      values.push(employeeId);
    }

    const jobResult = await client.query(
      `select
         jobs.id,
         jobs.title,
         jobs.job_code,
         jobs.client_id,
         jobs.assigned_employee_id
       from jobs
       left join clients on clients.id = jobs.client_id
       where jobs.id = $1
         ${employeeScopeClause}
       limit 1`,
      values
    );

    const job = jobResult.rows[0];
    if (!job) {
      await client.query("rollback");
      return null;
    }

    const stage = payload.initialStage || "applied";
    const stageNote =
      payload.stageNote ||
      (stage === "shortlisted"
        ? "Candidate added manually from outside source and marked shortlisted."
        : "Candidate added manually from outside source.");
    const stageDate = payload.stageDate || new Date().toISOString().slice(0, 10);

    const duplicateResult = await client.query(
      `select id from job_applications
       where job_id = $1
         and (
           (nullif(lower(candidate_email), '') is not null and lower(candidate_email) = lower($2))
           or (nullif(regexp_replace(coalesce(candidate_phone, ''), '\\D', '', 'g'), '') is not null
             and regexp_replace(coalesce(candidate_phone, ''), '\\D', '', 'g') = regexp_replace(coalesce($3, ''), '\\D', '', 'g'))
         )
       order by applied_at desc
       limit 1`,
      [jobId, payload.candidateEmail || "", payload.candidatePhone || ""]
    );

    if (duplicateResult.rows[0]) {
      await client.query("commit");
      return getAdminApplicationById(duplicateResult.rows[0].id);
    }

    const existingCandidateResult = await client.query(
      `select *
       from job_applications
       where (
           (nullif(lower(candidate_email), '') is not null and lower(candidate_email) = lower($1))
           or (nullif(regexp_replace(coalesce(candidate_phone, ''), '\\D', '', 'g'), '') is not null
             and regexp_replace(coalesce(candidate_phone, ''), '\\D', '', 'g') = regexp_replace(coalesce($2, ''), '\\D', '', 'g'))
         )
       order by applied_at desc
       limit 1`,
      [payload.candidateEmail || "", payload.candidatePhone || ""]
    );
    const existingCandidate = existingCandidateResult.rows[0];
    const sourceNote =
      existingCandidate && !payload.sourceNote
        ? `Assigned from existing candidate application ${existingCandidate.id}`
        : payload.sourceNote || null;
    const entryType = existingCandidate ? "profile_assignment" : "manual_entry";

    const insertResult = await client.query(
      `insert into job_applications (
        job_id,
        parent_application_id,
        stage,
        stage_note,
        stage_date,
        stage_updated_at,
        candidate_name,
        candidate_email,
        candidate_phone,
        gender,
        mother_tongue,
        other_languages,
        experience,
        current_company,
        current_location,
        current_designation,
        preferred_role,
        current_ctc,
        expected_ctc,
        notice_period,
        preferred_location,
        preferred_sector,
        source_type,
        source_note,
        entry_type,
        resume_file_name,
        resume_file_type,
        resume_file_data,
        uploaded_by_employee_id,
        candidate_message,
        job_title
      ) values (
        $1, $2, $3, $4, $5::date, now(), $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      )
      returning
        id,
        job_id,
        parent_application_id,
        stage,
        stage_note,
        stage_date,
        stage_updated_at,
        null::text as job_code,
        null::text as client_name,
        null::text as recruiter_name,
        null::text as recruiter_email,
        null::text as job_location,
        null::text as sector,
        candidate_name,
        candidate_email,
        candidate_phone,
        gender,
        mother_tongue,
        other_languages,
        experience,
        current_company,
        current_location,
        current_designation,
        preferred_role,
        current_ctc,
        expected_ctc,
        notice_period,
        preferred_location,
        preferred_sector,
        source_type,
        source_note,
        entry_type,
        resume_file_name,
        resume_file_type,
        resume_file_data,
        (resume_file_data is not null) as resume_available,
        uploaded_by_employee_id,
        null::text as uploaded_by_employee_name,
        candidate_message,
        job_title,
        applied_at`,
      [
        jobId,
        existingCandidate?.parent_application_id || existingCandidate?.id || null,
        stage,
        stageNote,
        stageDate,
        payload.candidateName || existingCandidate?.candidate_name,
        payload.candidateEmail || existingCandidate?.candidate_email || "",
        payload.candidatePhone || existingCandidate?.candidate_phone || null,
        payload.gender || existingCandidate?.gender || null,
        payload.motherTongue || existingCandidate?.mother_tongue || null,
        payload.otherLanguages || existingCandidate?.other_languages || null,
        payload.experience || existingCandidate?.experience || null,
        payload.currentCompany || existingCandidate?.current_company || null,
        payload.currentLocation || existingCandidate?.current_location || null,
        payload.currentDesignation || existingCandidate?.current_designation || null,
        payload.preferredRole || existingCandidate?.preferred_role || null,
        payload.currentCtc || existingCandidate?.current_ctc || null,
        payload.expectedCtc || existingCandidate?.expected_ctc || null,
        payload.noticePeriod || existingCandidate?.notice_period || null,
        payload.preferredLocation || existingCandidate?.preferred_location || null,
        payload.preferredSector || existingCandidate?.preferred_sector || null,
        payload.sourceType || existingCandidate?.source_type || "Other",
        sourceNote,
        entryType,
        payload.resumeFileName || existingCandidate?.resume_file_name || null,
        payload.resumeFileType || existingCandidate?.resume_file_type || null,
        payload.resumeFileData || null,
        employeeId || existingCandidate?.uploaded_by_employee_id || null,
        payload.candidateMessage || existingCandidate?.candidate_message || null,
        payload.jobTitle || job.title || null,
      ]
    );

    await client.query(
      `insert into job_application_stage_history (
        application_id,
        from_stage,
        to_stage,
        stage_note,
        stage_date
      ) values ($1, $2, $3, $4, $5::date)`,
      [insertResult.rows[0].id, null, stage, stageNote, stageDate]
    );

    await client.query(
      `update jobs
       set applications_count = coalesce(applications_count, 0) + 1,
           updated_at = now()
       where id = $1`,
      [jobId]
    );

    await client.query("commit");
    return insertResult.rows[0] ? mapApplicationRow(insertResult.rows[0]) : null;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listJobApplications(jobId, employeeId = null, options = {}) {
  const values = [jobId];
  const employeeScopeClause = employeeId
    ? `and (
         coalesce(jobs.assigned_employee_id, clients.assigned_employee_id) = $2
         or (
           clients.temporary_access_employee_id = $2
           and clients.temporary_access_scope = 'full-access'
           and (clients.temporary_access_from_date is null or clients.temporary_access_from_date <= current_date)
           and (clients.temporary_access_to_date is null or clients.temporary_access_to_date >= current_date)
         )
         or job_applications.assigned_employee_id = $2
         or job_applications.follow_up_employee_id = $2
       )`
    : "";

  if (employeeId) {
    values.push(employeeId);
  }

  const result = await query(
    `select
      job_applications.id,
      job_applications.parent_application_id,
      job_applications.job_id,
      job_applications.assigned_employee_id,
      job_applications.stage,
      job_applications.stage_note,
      job_applications.stage_date,
      job_applications.stage_updated_at,
      null::text as job_code,
      null::text as client_name,
      null::text as recruiter_name,
      null::text as recruiter_email,
      null::text as job_location,
      null::text as sector,
      job_applications.candidate_name,
      job_applications.candidate_email,
      job_applications.candidate_phone,
      job_applications.gender,
      job_applications.mother_tongue,
      job_applications.other_languages,
      job_applications.experience,
      job_applications.current_company,
      job_applications.current_location,
      job_applications.current_designation,
      job_applications.preferred_role,
      job_applications.current_ctc,
      job_applications.expected_ctc,
      job_applications.notice_period,
      job_applications.final_ctc,
      job_applications.date_of_joining,
      job_applications.preferred_location,
      job_applications.preferred_sector,
      job_applications.source_type,
      job_applications.source_note,
      job_applications.entry_type,
      coalesce(job_applications.resume_file_name, parent_application.resume_file_name) as resume_file_name,
      coalesce(job_applications.resume_file_type, parent_application.resume_file_type) as resume_file_type,
      ${
        options.slim
          ? "null::text"
          : "coalesce(job_applications.resume_file_data, parent_application.resume_file_data)"
      } as resume_file_data,
      (
        job_applications.resume_file_data is not null
        or parent_application.resume_file_data is not null
      ) as resume_available,
      job_applications.uploaded_by_employee_id,
      job_applications.follow_up_employee_id,
      follow_up_employee.full_name as follow_up_employee_name,
      job_applications.follow_up_from_date,
      job_applications.follow_up_to_date,
      job_applications.follow_up_assignment_note,
      job_applications.interview_scheduled_at,
      job_applications.interview_mode,
      job_applications.interview_panel,
      job_applications.interview_reminder_at,
      uploader.full_name as uploaded_by_employee_name,
      job_applications.candidate_message,
      job_applications.job_title,
      job_applications.applied_at
     from job_applications
     left join jobs on jobs.id = job_applications.job_id
     left join clients on clients.id = jobs.client_id
     left join job_applications parent_application on parent_application.id = job_applications.parent_application_id
     left join employees uploader on uploader.id = job_applications.uploaded_by_employee_id
     left join employees follow_up_employee on follow_up_employee.id = job_applications.follow_up_employee_id
     where job_id = $1
       ${employeeScopeClause}
     order by applied_at desc`,
    values
  );

  return result.rows.map(mapApplicationRow);
}

export async function listAdminApplications(employeeId = null, options = {}) {
  const values = [];
  const employeeScopeClause = employeeId
    ? (() => {
        values.push(employeeId);
        return `where (
          coalesce(jobs.assigned_employee_id, clients.assigned_employee_id) = $${values.length}
          or (
            clients.temporary_access_employee_id = $${values.length}
            and clients.temporary_access_scope = 'full-access'
            and (clients.temporary_access_from_date is null or clients.temporary_access_from_date <= current_date)
            and (clients.temporary_access_to_date is null or clients.temporary_access_to_date >= current_date)
          )
          or job_applications.assigned_employee_id = $${values.length}
          or job_applications.follow_up_employee_id = $${values.length}
        )`;
      })()
    : "";

  const result = await query(
    `select
      job_applications.id,
      job_applications.parent_application_id,
      job_applications.job_id,
      job_applications.assigned_employee_id,
      job_applications.stage,
      job_applications.stage_note,
      job_applications.stage_date,
      job_applications.stage_updated_at,
      jobs.job_code,
      clients.company_name as client_name,
      employees.full_name as recruiter_name,
      employees.email as recruiter_email,
      jobs.location as job_location,
      jobs.sector,
      job_applications.candidate_name,
      job_applications.candidate_email,
      job_applications.candidate_phone,
      job_applications.gender,
      job_applications.mother_tongue,
      job_applications.other_languages,
      job_applications.experience,
      job_applications.current_company,
      job_applications.current_location,
      job_applications.current_designation,
      job_applications.preferred_role,
      job_applications.current_ctc,
      job_applications.expected_ctc,
      job_applications.notice_period,
      job_applications.final_ctc,
      job_applications.date_of_joining,
      job_applications.preferred_location,
      job_applications.preferred_sector,
      job_applications.source_type,
      job_applications.source_note,
      job_applications.entry_type,
      coalesce(job_applications.resume_file_name, parent_application.resume_file_name) as resume_file_name,
      coalesce(job_applications.resume_file_type, parent_application.resume_file_type) as resume_file_type,
      ${
        options.slim
          ? "null::text"
          : "coalesce(job_applications.resume_file_data, parent_application.resume_file_data)"
      } as resume_file_data,
      (
        job_applications.resume_file_data is not null
        or parent_application.resume_file_data is not null
      ) as resume_available,
      job_applications.uploaded_by_employee_id,
      job_applications.follow_up_employee_id,
      follow_up_employee.full_name as follow_up_employee_name,
      job_applications.follow_up_from_date,
      job_applications.follow_up_to_date,
      job_applications.follow_up_assignment_note,
      job_applications.interview_scheduled_at,
      job_applications.interview_mode,
      job_applications.interview_panel,
      job_applications.interview_reminder_at,
      uploader.full_name as uploaded_by_employee_name,
      job_applications.candidate_message,
      coalesce(job_applications.job_title, jobs.title) as job_title,
      job_applications.applied_at
     from job_applications
     left join jobs on jobs.id = job_applications.job_id
     left join clients on clients.id = jobs.client_id
     left join job_applications parent_application on parent_application.id = job_applications.parent_application_id
     left join employees on employees.id = coalesce(job_applications.assigned_employee_id, jobs.assigned_employee_id, clients.assigned_employee_id)
     left join employees uploader on uploader.id = job_applications.uploaded_by_employee_id
     left join employees follow_up_employee on follow_up_employee.id = job_applications.follow_up_employee_id
     ${employeeScopeClause}
     order by job_applications.applied_at desc`,
    values
  );

  return result.rows.map(mapApplicationRow);
}

export async function getAdminApplicationById(applicationId) {
  const result = await query(
    `select
      job_applications.id,
      job_applications.parent_application_id,
      job_applications.job_id,
      job_applications.assigned_employee_id,
      job_applications.stage,
      job_applications.stage_note,
      job_applications.stage_date,
      job_applications.stage_updated_at,
      jobs.job_code,
      clients.company_name as client_name,
      employees.full_name as recruiter_name,
      employees.email as recruiter_email,
      jobs.location as job_location,
      jobs.sector,
      job_applications.candidate_name,
      job_applications.candidate_email,
      job_applications.candidate_phone,
      job_applications.gender,
      job_applications.mother_tongue,
      job_applications.other_languages,
      job_applications.experience,
      job_applications.current_company,
      job_applications.current_location,
      job_applications.current_designation,
      job_applications.preferred_role,
      job_applications.current_ctc,
      job_applications.expected_ctc,
      job_applications.notice_period,
      job_applications.final_ctc,
      job_applications.date_of_joining,
      job_applications.preferred_location,
      job_applications.preferred_sector,
      job_applications.source_type,
      job_applications.source_note,
      job_applications.entry_type,
      coalesce(job_applications.resume_file_name, parent_application.resume_file_name) as resume_file_name,
      coalesce(job_applications.resume_file_type, parent_application.resume_file_type) as resume_file_type,
      coalesce(job_applications.resume_file_data, parent_application.resume_file_data) as resume_file_data,
      (
        job_applications.resume_file_data is not null
        or parent_application.resume_file_data is not null
      ) as resume_available,
      job_applications.uploaded_by_employee_id,
      job_applications.follow_up_employee_id,
      follow_up_employee.full_name as follow_up_employee_name,
      job_applications.follow_up_from_date,
      job_applications.follow_up_to_date,
      job_applications.follow_up_assignment_note,
      job_applications.interview_scheduled_at,
      job_applications.interview_mode,
      job_applications.interview_panel,
      job_applications.interview_reminder_at,
      uploader.full_name as uploaded_by_employee_name,
      job_applications.candidate_message,
      coalesce(job_applications.job_title, jobs.title) as job_title,
      job_applications.applied_at
     from job_applications
     left join jobs on jobs.id = job_applications.job_id
     left join clients on clients.id = jobs.client_id
     left join job_applications parent_application on parent_application.id = job_applications.parent_application_id
     left join employees on employees.id = coalesce(job_applications.assigned_employee_id, jobs.assigned_employee_id, clients.assigned_employee_id)
     left join employees uploader on uploader.id = job_applications.uploaded_by_employee_id
     left join employees follow_up_employee on follow_up_employee.id = job_applications.follow_up_employee_id
     where job_applications.id = $1
     limit 1`,
    [applicationId]
  );

  return result.rows[0] ? mapApplicationRow(result.rows[0]) : null;
}

export async function assignCandidateApplicationToJob(applicationId, targetJobId, payload = {}, employeeId = null) {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const sourceValues = [applicationId];
    const sourceScopeClause = employeeId
      ? `and (
           coalesce(jobs.assigned_employee_id, clients.assigned_employee_id) = $2
           or (
             clients.temporary_access_employee_id = $2
             and clients.temporary_access_scope = 'full-access'
             and (clients.temporary_access_from_date is null or clients.temporary_access_from_date <= current_date)
             and (clients.temporary_access_to_date is null or clients.temporary_access_to_date >= current_date)
           )
           or source.assigned_employee_id = $2
           or source.follow_up_employee_id = $2
         )`
      : "";

    if (employeeId) {
      sourceValues.push(employeeId);
    }

    const sourceResult = await client.query(
      `select source.*
       from job_applications source
       left join jobs on jobs.id = source.job_id
       left join clients on clients.id = jobs.client_id
       where source.id = $1
         ${sourceScopeClause}
       limit 1`,
      sourceValues
    );
    const source = sourceResult.rows[0];
    if (!source) {
      await client.query("rollback");
      return null;
    }

    const targetValues = [targetJobId];
    const targetScopeClause = employeeId
      ? `and (
           coalesce(jobs.assigned_employee_id, clients.assigned_employee_id) = $2
           or (
             clients.temporary_access_employee_id = $2
             and clients.temporary_access_scope = 'full-access'
             and (clients.temporary_access_from_date is null or clients.temporary_access_from_date <= current_date)
             and (clients.temporary_access_to_date is null or clients.temporary_access_to_date >= current_date)
           )
         )`
      : "";

    if (employeeId) {
      targetValues.push(employeeId);
    }

    const targetJobResult = await client.query(
      `select jobs.id, jobs.title
       from jobs
       left join clients on clients.id = jobs.client_id
       where jobs.id = $1
         ${targetScopeClause}
       limit 1`,
      targetValues
    );
    const targetJob = targetJobResult.rows[0];
    if (!targetJob) {
      await client.query("rollback");
      return null;
    }

    const duplicateResult = await client.query(
      `select id from job_applications
       where job_id = $1
         and (
           (nullif(lower(candidate_email), '') is not null and lower(candidate_email) = lower($2))
           or (nullif(regexp_replace(coalesce(candidate_phone, ''), '\\D', '', 'g'), '') is not null
             and regexp_replace(coalesce(candidate_phone, ''), '\\D', '', 'g') = regexp_replace(coalesce($3, ''), '\\D', '', 'g'))
         )
       order by applied_at desc
       limit 1`,
      [targetJobId, source.candidate_email || "", source.candidate_phone || ""]
    );

    if (duplicateResult.rows[0]) {
      await client.query("commit");
      return getAdminApplicationById(duplicateResult.rows[0].id);
    }

    const stage = payload.initialStage || source.stage || "applied";
    const stageNote =
      payload.stageNote ||
      `Candidate assigned to this job from ${source.job_title || "an existing profile"}.`;
    const stageDate = payload.stageDate || new Date().toISOString().slice(0, 10);

    const insertResult = await client.query(
      `insert into job_applications (
        job_id,
        parent_application_id,
        stage,
        stage_note,
        stage_date,
        stage_updated_at,
        candidate_name,
        candidate_email,
        candidate_phone,
        gender,
        mother_tongue,
        other_languages,
        experience,
        current_company,
        current_location,
        current_designation,
        preferred_role,
        current_ctc,
        expected_ctc,
        notice_period,
        preferred_location,
        preferred_sector,
        source_type,
        source_note,
        entry_type,
        resume_file_name,
        resume_file_type,
        resume_file_data,
        uploaded_by_employee_id,
        candidate_message,
        job_title
      ) values (
        $1, $2, $3, $4, $5::date, now(), $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, 'profile_assignment', $24, $25, $26, $27, $28, $29
      )
      returning id`,
      [
        targetJobId,
        source.parent_application_id || source.id,
        stage,
        stageNote,
        stageDate,
        source.candidate_name,
        source.candidate_email || "",
        source.candidate_phone || null,
        source.gender || null,
        source.mother_tongue || null,
        source.other_languages || null,
        source.experience || null,
        source.current_company || null,
        source.current_location || null,
        source.current_designation || null,
        source.preferred_role || null,
        source.current_ctc || null,
        source.expected_ctc || null,
        source.notice_period || null,
        source.preferred_location || null,
        source.preferred_sector || null,
        source.source_type || "Existing Profile",
        source.source_note || `Copied from application ${applicationId}`,
        source.resume_file_name || null,
        source.resume_file_type || null,
        null,
        employeeId || source.uploaded_by_employee_id || null,
        source.candidate_message || null,
        targetJob.title || null,
      ]
    );

    await client.query(
      `insert into job_application_stage_history (
        application_id,
        from_stage,
        to_stage,
        stage_note,
        stage_date
      ) values ($1, $2, $3, $4, $5::date)`,
      [insertResult.rows[0].id, null, stage, stageNote, stageDate]
    );

    await client.query(
      `update jobs
       set applications_count = coalesce(applications_count, 0) + 1,
           updated_at = now()
       where id = $1`,
      [targetJobId]
    );

    await client.query("commit");
    return getAdminApplicationById(insertResult.rows[0].id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listApplicationStageHistory(employeeId = null) {
  const values = [];
  const employeeScopeClause = employeeId
    ? (() => {
        values.push(employeeId);
        return `where (
          coalesce(jobs.assigned_employee_id, clients.assigned_employee_id) = $${values.length}
          or (
            clients.temporary_access_employee_id = $${values.length}
            and clients.temporary_access_scope = 'full-access'
            and (clients.temporary_access_from_date is null or clients.temporary_access_from_date <= current_date)
            and (clients.temporary_access_to_date is null or clients.temporary_access_to_date >= current_date)
          )
          or applications.assigned_employee_id = $${values.length}
          or applications.follow_up_employee_id = $${values.length}
        )`;
      })()
    : "";

  const result = await query(
    `select
      history.id,
      history.application_id,
      applications.job_id,
      jobs.job_code,
      coalesce(applications.job_title, jobs.title) as job_title,
      clients.company_name as client_name,
      employees.full_name as recruiter_name,
      employees.email as recruiter_email,
      applications.candidate_name,
      applications.candidate_email,
      history.from_stage,
      history.to_stage,
      history.stage_note,
      history.stage_date,
      history.changed_at
     from job_application_stage_history history
     left join job_applications applications on applications.id = history.application_id
     left join jobs on jobs.id = applications.job_id
     left join clients on clients.id = jobs.client_id
     left join employees on employees.id = coalesce(jobs.assigned_employee_id, clients.assigned_employee_id)
     ${employeeScopeClause}
     order by coalesce(history.stage_date, history.changed_at::date) desc, history.changed_at desc`,
    values
  );

  return result.rows.map(mapApplicationHistoryRow);
}

export async function createCandidateEnquiry(payload) {
  const result = await query(
    `insert into candidate_enquiries (
      candidate_name,
      candidate_email,
      candidate_phone,
      gender,
      mother_tongue,
      other_languages,
      experience,
      current_company,
      current_location,
      current_designation,
      preferred_role,
      current_ctc,
      expected_ctc,
      preferred_location,
      preferred_sector,
      candidate_message,
      resume_file_name,
      resume_file_type,
      resume_file_data,
      source_type,
      updated_at
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,now()
    )
    returning *`,
    [
      payload.candidateName,
      payload.candidateEmail,
      payload.candidatePhone || null,
      payload.gender || null,
      payload.motherTongue || null,
      payload.otherLanguages || null,
      payload.experience || null,
      payload.currentCompany || null,
      payload.currentLocation || null,
      payload.currentDesignation || null,
      payload.preferredRole || null,
      payload.currentCtc || null,
      payload.expectedCtc || null,
      payload.preferredLocation || null,
      payload.preferredSector || null,
      payload.candidateMessage || null,
      payload.resumeFileName || null,
      payload.resumeFileType || null,
      payload.resumeFileData || null,
      payload.sourceType || "website_candidate_enquiry",
    ]
  );

  return result.rows[0] ? mapCandidateEnquiryRow(result.rows[0]) : null;
}

export async function listCandidateEnquiries(options = {}) {
  const result = await query(
    `select
      id,
      candidate_name,
      candidate_email,
      candidate_phone,
      gender,
      mother_tongue,
      other_languages,
      experience,
      current_company,
      current_location,
      current_designation,
      preferred_role,
      current_ctc,
      expected_ctc,
      preferred_location,
      preferred_sector,
      candidate_message,
      resume_file_name,
      resume_file_type,
      ${options.slim ? "null::text" : "resume_file_data"} as resume_file_data,
      source_type,
      created_at
     from candidate_enquiries
     order by created_at desc`
  );

  return result.rows.map(mapCandidateEnquiryRow);
}

export async function createResumeBuilderSubmission(payload) {
  const result = await query(
    `insert into resume_builder_submissions (
       candidate_name,
       candidate_email,
       candidate_phone,
       gender,
       mother_tongue,
       other_languages,
       target_role,
       location,
       years_experience,
       skills,
       resume_file_name,
       resume_file_type,
       resume_file_data,
       resume_payload,
       source_type,
       updated_at
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, 'resume_builder', now())
     returning
       id,
       candidate_name,
       candidate_email,
       candidate_phone,
       gender,
       mother_tongue,
       other_languages,
       target_role,
       location,
       years_experience,
       skills,
       resume_file_name,
       resume_file_type,
       resume_file_data,
       resume_payload,
       source_type,
       created_at,
       updated_at`,
    [
      payload.candidateName,
      payload.candidateEmail,
      payload.candidatePhone || null,
      payload.gender || null,
      payload.motherTongue || null,
      payload.otherLanguages || null,
      payload.targetRole || null,
      payload.location || null,
      payload.yearsExperience || null,
      payload.skills || null,
      payload.resumeFileName || null,
      payload.resumeFileType || null,
      payload.resumeFileData || null,
      JSON.stringify(payload.resumePayload || {}),
    ]
  );

  return mapResumeBuilderSubmissionRow(result.rows[0]);
}

export async function listResumeBuilderSubmissions(options = {}) {
  const result = await query(
    `select
       id,
       candidate_name,
       candidate_email,
       candidate_phone,
       gender,
       mother_tongue,
       other_languages,
       target_role,
       location,
       years_experience,
       skills,
       resume_file_name,
       resume_file_type,
       ${options.slim ? "null::text" : "resume_file_data"} as resume_file_data,
       resume_payload,
       source_type,
       created_at,
       updated_at
     from resume_builder_submissions
     order by created_at desc`
  );

  return result.rows.map(mapResumeBuilderSubmissionRow);
}

export async function updateJobApplicationDetails(applicationId, payload, employeeId = null) {
  const values = [applicationId];
  const employeeScopeClause = employeeId
    ? `and (
         coalesce(job_applications.assigned_employee_id, jobs.assigned_employee_id, clients.assigned_employee_id) = $2
         or (
           clients.temporary_access_employee_id = $2
           and clients.temporary_access_scope = 'full-access'
           and (clients.temporary_access_from_date is null or clients.temporary_access_from_date <= current_date)
           and (clients.temporary_access_to_date is null or clients.temporary_access_to_date >= current_date)
         )
         or job_applications.follow_up_employee_id = $2
       )`
    : "";

  if (employeeId) {
    values.push(employeeId);
  }

  const existingResult = await query(
    `select job_applications.id
     from job_applications
     left join jobs on jobs.id = job_applications.job_id
     left join clients on clients.id = jobs.client_id
     where job_applications.id = $1
       ${employeeScopeClause}
     limit 1`,
    values
  );

  if (!existingResult.rows[0]) {
    return null;
  }

  const result = await query(
    `update job_applications
     set candidate_name = $2,
         candidate_email = $3,
         candidate_phone = $4,
         gender = $5,
         mother_tongue = $6,
         other_languages = $7,
         experience = $8,
         current_company = $9,
         current_location = $10,
         current_designation = $11,
         preferred_role = $12,
         current_ctc = $13,
         expected_ctc = $14,
         notice_period = $15,
         preferred_location = $16,
         preferred_sector = $17,
         source_type = $18,
         source_note = $19,
         candidate_message = $20,
         resume_file_name = $21,
         resume_file_type = $22,
         resume_file_data = $23,
         interview_scheduled_at = $24,
         interview_mode = $25,
         interview_panel = $26,
         interview_reminder_at = $27,
         updated_at = now()
     where id = $1
     returning
       id,
       parent_application_id,
       job_id,
       assigned_employee_id,
       stage,
       stage_note,
       stage_date,
       stage_updated_at,
       null::text as job_code,
       null::text as client_name,
       null::text as recruiter_name,
       null::text as recruiter_email,
       null::text as job_location,
       null::text as sector,
       candidate_name,
       candidate_email,
       candidate_phone,
       gender,
       mother_tongue,
       other_languages,
       experience,
       current_company,
       current_location,
       current_designation,
       preferred_role,
       current_ctc,
       expected_ctc,
       notice_period,
       preferred_location,
       preferred_sector,
       source_type,
       source_note,
       entry_type,
       resume_file_name,
       resume_file_type,
       resume_file_data,
       (resume_file_data is not null) as resume_available,
       uploaded_by_employee_id,
       follow_up_employee_id,
       null::text as follow_up_employee_name,
       follow_up_from_date,
       follow_up_to_date,
       follow_up_assignment_note,
       interview_scheduled_at,
       interview_mode,
       interview_panel,
       interview_reminder_at,
       null::text as uploaded_by_employee_name,
       candidate_message,
       job_title,
       applied_at`,
    [
      applicationId,
      payload.candidateName,
      payload.candidateEmail || "",
      payload.candidatePhone || null,
      payload.gender || null,
      payload.motherTongue || null,
      payload.otherLanguages || null,
      payload.experience || null,
      payload.currentCompany || null,
      payload.currentLocation || null,
      payload.currentDesignation || null,
      payload.preferredRole || null,
      payload.currentCtc || null,
      payload.expectedCtc || null,
      payload.noticePeriod || null,
      payload.preferredLocation || null,
      payload.preferredSector || null,
      payload.sourceType || null,
      payload.sourceNote || null,
      payload.candidateMessage || null,
      payload.resumeFileName || null,
      payload.resumeFileType || null,
      payload.resumeFileData || null,
      payload.interviewScheduledAt || null,
      payload.interviewMode || null,
      payload.interviewPanel || null,
      payload.interviewReminderAt || null,
    ]
  );

  return result.rows[0] ? mapApplicationRow(result.rows[0]) : null;
}

export async function updateJobApplicationStage(
  applicationId,
  stage,
  stageNote,
  stageDate,
  employeeId = null,
  payload = {}
) {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const values = [applicationId];
    const employeeScopeClause = employeeId
      ? `and (
           coalesce(job_applications.assigned_employee_id, jobs.assigned_employee_id, clients.assigned_employee_id) = $2
           or (
             clients.temporary_access_employee_id = $2
             and clients.temporary_access_scope = 'full-access'
             and (clients.temporary_access_from_date is null or clients.temporary_access_from_date <= current_date)
             and (clients.temporary_access_to_date is null or clients.temporary_access_to_date >= current_date)
           )
           or job_applications.follow_up_employee_id = $2
         )`
      : "";

    if (employeeId) {
      values.push(employeeId);
    }

    const currentResult = await client.query(
      `select job_applications.*
       from job_applications
       left join jobs on jobs.id = job_applications.job_id
       left join clients on clients.id = jobs.client_id
       where job_applications.id = $1
         ${employeeScopeClause}
       limit 1`,
      values
    );

    if (!currentResult.rows[0]) {
      await client.query("rollback");
      return null;
    }

    const currentApplication = currentResult.rows[0];

    const updatedResult = await client.query(
      `update job_applications
       set stage = $2,
           stage_note = $3,
           stage_date = $4::date,
           final_ctc = case when $5::boolean then $6 else final_ctc end,
           date_of_joining = case when $5::boolean then $7::date else date_of_joining end,
           interview_scheduled_at = case when $8::boolean then $9::timestamptz else interview_scheduled_at end,
           interview_mode = case when $8::boolean then $10 else interview_mode end,
           interview_panel = case when $8::boolean then $11 else interview_panel end,
           interview_reminder_at = case when $8::boolean then $12::timestamptz else interview_reminder_at end,
           stage_updated_at = now()
       where id = $1
       returning
         id,
         parent_application_id,
         job_id,
         assigned_employee_id,
         stage,
         stage_note,
         stage_date,
         stage_updated_at,
         null::text as job_code,
         null::text as client_name,
         null::text as recruiter_name,
         null::text as recruiter_email,
         null::text as job_location,
         null::text as sector,
         candidate_name,
         candidate_email,
         candidate_phone,
         gender,
         mother_tongue,
         other_languages,
         experience,
         current_company,
         current_location,
         current_designation,
         preferred_role,
         current_ctc,
         expected_ctc,
         notice_period,
         final_ctc,
         date_of_joining,
         preferred_location,
         preferred_sector,
         source_type,
         source_note,
         entry_type,
         resume_file_name,
         resume_file_type,
         resume_file_data,
         (resume_file_data is not null) as resume_available,
         uploaded_by_employee_id,
         follow_up_employee_id,
         null::text as follow_up_employee_name,
         follow_up_from_date,
         follow_up_to_date,
         follow_up_assignment_note,
         interview_scheduled_at,
         interview_mode,
         interview_panel,
         interview_reminder_at,
         null::text as uploaded_by_employee_name,
         candidate_message,
         job_title,
         applied_at`,
      [
        applicationId,
        stage,
        stageNote || null,
        stageDate || null,
        stage === "joined",
        payload.finalCtc || null,
        payload.dateOfJoining || stageDate || null,
        stage === "interview",
        payload.interviewScheduledAt || null,
        payload.interviewMode || null,
        payload.interviewPanel || null,
        payload.interviewReminderAt || null,
      ]
    );

    await client.query(
      `insert into job_application_stage_history (
        application_id,
        from_stage,
        to_stage,
        stage_note,
        stage_date
      ) values ($1, $2, $3, $4, $5::date)`,
      [applicationId, currentApplication.stage, stage, stageNote || null, stageDate || null]
    );

    await client.query("commit");
    return updatedResult.rows[0] ? mapApplicationRow(updatedResult.rows[0]) : null;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function assignJobApplication(applicationId, payload, employeeId = null) {
  const values = [applicationId];
  const employeeScopeClause = employeeId
    ? `and (
         coalesce(job_applications.assigned_employee_id, jobs.assigned_employee_id, clients.assigned_employee_id) = $2
         or (
           clients.temporary_access_employee_id = $2
           and clients.temporary_access_scope = 'full-access'
           and (clients.temporary_access_from_date is null or clients.temporary_access_from_date <= current_date)
           and (clients.temporary_access_to_date is null or clients.temporary_access_to_date >= current_date)
         )
         or job_applications.follow_up_employee_id = $2
       )`
    : "";

  if (employeeId) {
    values.push(employeeId);
  }

  const existingResult = await query(
    `select job_applications.id
     from job_applications
     left join jobs on jobs.id = job_applications.job_id
     left join clients on clients.id = jobs.client_id
     where job_applications.id = $1
       ${employeeScopeClause}
     limit 1`,
    values
  );

  if (!existingResult.rows[0]) {
    return null;
  }

  if ((payload.assignmentType || "ownership-transfer") === "follow-up-support") {
    await query(
      `update job_applications
       set follow_up_employee_id = $2,
           follow_up_from_date = $3::date,
           follow_up_to_date = $4::date,
           follow_up_assignment_note = $5,
           stage_updated_at = now()
       where id = $1`,
      [
        applicationId,
        payload.assignedEmployeeId || null,
        payload.effectiveFromDate || null,
        payload.effectiveToDate || null,
        payload.note || null,
      ]
    );
  } else {
    await query(
      `update job_applications
       set assigned_employee_id = $2,
           follow_up_employee_id = null,
           follow_up_from_date = null,
           follow_up_to_date = null,
           follow_up_assignment_note = null,
           stage_updated_at = now()
       where id = $1`,
      [applicationId, payload.assignedEmployeeId || null]
    );
  }

  const refreshed = await listAdminApplications(employeeId);
  return refreshed.find((application) => application.id === applicationId) ?? null;
}

export async function deleteJobApplication(applicationId) {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const existingResult = await client.query(
      `select id, job_id
       from job_applications
       where id = $1
       limit 1`,
      [applicationId]
    );

    const existingApplication = existingResult.rows[0];
    if (!existingApplication) {
      await client.query("rollback");
      return false;
    }

    await client.query(`delete from job_applications where id = $1`, [applicationId]);

    await client.query(
      `update jobs
       set applications_count = (
         select count(*)::int
         from job_applications
         where job_applications.job_id = jobs.id
       ),
           updated_at = now()
       where id = $1`,
      [existingApplication.job_id]
    );

    await client.query("commit");
    return true;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
