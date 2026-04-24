import { pool, query } from "./db.js";

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  return [];
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
    experience: row.experience,
    currentCompany: row.current_company,
    currentLocation: row.current_location,
    currentDesignation: row.current_designation,
    preferredRole: row.preferred_role,
    currentCtc: row.current_ctc,
    expectedCtc: row.expected_ctc,
    preferredLocation: row.preferred_location,
    preferredSector: row.preferred_sector,
    sourceType: row.source_type,
    sourceNote: row.source_note,
    entryType: row.entry_type,
    resumeFileName: row.resume_file_name,
    resumeFileType: row.resume_file_type,
    resumeFileData: row.resume_file_data,
    uploadedByEmployeeId: row.uploaded_by_employee_id,
    uploadedByEmployeeName: row.uploaded_by_employee_name,
    followUpEmployeeId: row.follow_up_employee_id,
    followUpEmployeeName: row.follow_up_employee_name,
    followUpFromDate: row.follow_up_from_date,
    followUpToDate: row.follow_up_to_date,
    followUpAssignmentNote: row.follow_up_assignment_note,
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
     order by jobs.posted_at desc, jobs.created_at desc`
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
     order by jobs.posted_at desc, jobs.created_at desc`,
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
  await query(`alter table jobs add column if not exists applications_count integer not null default 0`);
  await query(`alter table jobs add column if not exists is_hidden boolean not null default false`);
  await query(`alter table jobs add column if not exists client_id uuid references clients(id) on delete set null`);
  await query(
    `alter table jobs add column if not exists assigned_employee_id uuid references employees(id) on delete set null`
  );
  await query(`
    create table if not exists job_applications (
      id uuid primary key default gen_random_uuid(),
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
    `alter table job_applications add column if not exists stage text not null default 'applied'`
  );
  await query(`alter table job_applications add column if not exists stage_note text`);
  await query(`alter table job_applications add column if not exists stage_date date`);
  await query(
    `alter table job_applications add column if not exists stage_updated_at timestamptz not null default now()`
  );
  await query(`alter table job_applications add column if not exists candidate_phone text`);
  await query(`alter table job_applications add column if not exists experience text`);
  await query(`alter table job_applications add column if not exists current_company text`);
  await query(`alter table job_applications add column if not exists current_location text`);
  await query(`alter table job_applications add column if not exists current_designation text`);
  await query(`alter table job_applications add column if not exists preferred_role text`);
  await query(`alter table job_applications add column if not exists current_ctc text`);
  await query(`alter table job_applications add column if not exists expected_ctc text`);
  await query(`alter table job_applications add column if not exists preferred_location text`);
  await query(`alter table job_applications add column if not exists preferred_sector text`);
  await query(`alter table job_applications add column if not exists candidate_message text`);
  await query(`alter table job_applications add column if not exists job_title text`);
  await query(`alter table job_applications add column if not exists source_type text`);
  await query(`alter table job_applications add column if not exists source_note text`);
  await query(
    `alter table job_applications add column if not exists entry_type text not null default 'website_apply'`
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
  await query(`alter table job_applications alter column candidate_email drop not null`);
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
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,coalesce($14::date, current_date),$15::date,$16,$17,$18,$19,$20,$21
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
      status = $12,
      is_hidden = $13,
      last_date_to_apply = $14,
      summary = $15,
      description = $16,
      skills = $17,
      responsibilities = $18,
      requirements = $19,
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
        experience,
        current_company,
        current_location,
        current_designation,
        preferred_role,
        current_ctc,
        expected_ctc,
        preferred_location,
        preferred_sector,
        source_type,
        source_note,
        entry_type,
        candidate_message,
        job_title
      ) values ($1, $2, $3, current_date, now(), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)` ,
      [
        jobId,
        "applied",
        "Initial application submitted.",
        payload.candidateName,
        payload.candidateEmail,
        payload.candidatePhone || null,
        payload.experience || null,
        payload.currentCompany || null,
        payload.currentLocation || null,
        payload.currentDesignation || null,
        payload.preferredRole || null,
        payload.currentCtc || null,
        payload.expectedCtc || null,
        payload.preferredLocation || null,
        payload.preferredSector || null,
        "Website",
        payload.sourceNote || null,
        "website_apply",
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

    const insertResult = await client.query(
      `insert into job_applications (
        job_id,
        stage,
        stage_note,
        stage_date,
        stage_updated_at,
        candidate_name,
        candidate_email,
        candidate_phone,
        experience,
        current_company,
        current_location,
        current_designation,
        preferred_role,
        current_ctc,
        expected_ctc,
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
        $1, $2, $3, $4::date, now(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, 'manual_entry', $19, $20, $21, $22, $23, $24
      )
      returning
        id,
        job_id,
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
        experience,
        current_company,
        current_location,
        current_designation,
        preferred_role,
        current_ctc,
        expected_ctc,
        preferred_location,
        preferred_sector,
        source_type,
        source_note,
        entry_type,
        resume_file_name,
        resume_file_type,
        resume_file_data,
        uploaded_by_employee_id,
        null::text as uploaded_by_employee_name,
        candidate_message,
        job_title,
        applied_at`,
      [
        jobId,
        stage,
        stageNote,
        stageDate,
        payload.candidateName,
        payload.candidateEmail || null,
        payload.candidatePhone || null,
        payload.experience || null,
        payload.currentCompany || null,
        payload.currentLocation || null,
        payload.currentDesignation || null,
        payload.preferredRole || null,
        payload.currentCtc || null,
        payload.expectedCtc || null,
        payload.preferredLocation || null,
        payload.preferredSector || null,
        payload.sourceType || "Other",
        payload.sourceNote || null,
        payload.resumeFileName || null,
        payload.resumeFileType || null,
        payload.resumeFileData || null,
        employeeId || null,
        payload.candidateMessage || null,
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

export async function listJobApplications(jobId, employeeId = null) {
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
      job_applications.experience,
      job_applications.current_company,
      job_applications.current_location,
      job_applications.current_designation,
      job_applications.preferred_role,
      job_applications.current_ctc,
      job_applications.expected_ctc,
      job_applications.preferred_location,
      job_applications.preferred_sector,
      job_applications.source_type,
      job_applications.source_note,
      job_applications.entry_type,
      job_applications.resume_file_name,
      job_applications.resume_file_type,
      job_applications.resume_file_data,
      job_applications.uploaded_by_employee_id,
      job_applications.follow_up_employee_id,
      follow_up_employee.full_name as follow_up_employee_name,
      job_applications.follow_up_from_date,
      job_applications.follow_up_to_date,
      job_applications.follow_up_assignment_note,
      uploader.full_name as uploaded_by_employee_name,
      job_applications.candidate_message,
      job_applications.job_title,
      job_applications.applied_at
     from job_applications
     left join jobs on jobs.id = job_applications.job_id
     left join clients on clients.id = jobs.client_id
     left join employees uploader on uploader.id = job_applications.uploaded_by_employee_id
     left join employees follow_up_employee on follow_up_employee.id = job_applications.follow_up_employee_id
     where job_id = $1
       ${employeeScopeClause}
     order by applied_at desc`,
    values
  );

  return result.rows.map(mapApplicationRow);
}

export async function listAdminApplications(employeeId = null) {
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
      job_applications.experience,
      job_applications.current_company,
      job_applications.current_location,
      job_applications.current_designation,
      job_applications.preferred_role,
      job_applications.current_ctc,
      job_applications.expected_ctc,
      job_applications.preferred_location,
      job_applications.preferred_sector,
      job_applications.source_type,
      job_applications.source_note,
      job_applications.entry_type,
      job_applications.resume_file_name,
      job_applications.resume_file_type,
      job_applications.resume_file_data,
      job_applications.uploaded_by_employee_id,
      job_applications.follow_up_employee_id,
      follow_up_employee.full_name as follow_up_employee_name,
      job_applications.follow_up_from_date,
      job_applications.follow_up_to_date,
      job_applications.follow_up_assignment_note,
      uploader.full_name as uploaded_by_employee_name,
      job_applications.candidate_message,
      coalesce(job_applications.job_title, jobs.title) as job_title,
      job_applications.applied_at
     from job_applications
     left join jobs on jobs.id = job_applications.job_id
     left join clients on clients.id = jobs.client_id
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
      job_applications.experience,
      job_applications.current_company,
      job_applications.current_location,
      job_applications.current_designation,
      job_applications.preferred_role,
      job_applications.current_ctc,
      job_applications.expected_ctc,
      job_applications.preferred_location,
      job_applications.preferred_sector,
      job_applications.source_type,
      job_applications.source_note,
      job_applications.entry_type,
      job_applications.resume_file_name,
      job_applications.resume_file_type,
      job_applications.resume_file_data,
      job_applications.uploaded_by_employee_id,
      job_applications.follow_up_employee_id,
      follow_up_employee.full_name as follow_up_employee_name,
      job_applications.follow_up_from_date,
      job_applications.follow_up_to_date,
      job_applications.follow_up_assignment_note,
      uploader.full_name as uploaded_by_employee_name,
      job_applications.candidate_message,
      coalesce(job_applications.job_title, jobs.title) as job_title,
      job_applications.applied_at
     from job_applications
     left join jobs on jobs.id = job_applications.job_id
     left join clients on clients.id = jobs.client_id
     left join employees on employees.id = coalesce(job_applications.assigned_employee_id, jobs.assigned_employee_id, clients.assigned_employee_id)
     left join employees uploader on uploader.id = job_applications.uploaded_by_employee_id
     left join employees follow_up_employee on follow_up_employee.id = job_applications.follow_up_employee_id
     where job_applications.id = $1
     limit 1`,
    [applicationId]
  );

  return result.rows[0] ? mapApplicationRow(result.rows[0]) : null;
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
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now()
    )
    returning *`,
    [
      payload.candidateName,
      payload.candidateEmail,
      payload.candidatePhone || null,
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

export async function listCandidateEnquiries() {
  const result = await query(
    `select
      id,
      candidate_name,
      candidate_email,
      candidate_phone,
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
      created_at
     from candidate_enquiries
     order by created_at desc`
  );

  return result.rows.map(mapCandidateEnquiryRow);
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
         experience = $5,
         current_company = $6,
         current_location = $7,
         current_designation = $8,
         preferred_role = $9,
         current_ctc = $10,
         expected_ctc = $11,
         preferred_location = $12,
         preferred_sector = $13,
         source_type = $14,
         source_note = $15,
         candidate_message = $16,
         resume_file_name = $17,
         resume_file_type = $18,
         resume_file_data = $19,
         updated_at = now()
     where id = $1
     returning
       id,
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
       experience,
       current_company,
       current_location,
       current_designation,
       preferred_role,
       current_ctc,
       expected_ctc,
       preferred_location,
       preferred_sector,
       source_type,
       source_note,
       entry_type,
       resume_file_name,
       resume_file_type,
       resume_file_data,
       uploaded_by_employee_id,
       follow_up_employee_id,
       null::text as follow_up_employee_name,
       follow_up_from_date,
       follow_up_to_date,
       follow_up_assignment_note,
       null::text as uploaded_by_employee_name,
       candidate_message,
       job_title,
       applied_at`,
    [
      applicationId,
      payload.candidateName,
      payload.candidateEmail || null,
      payload.candidatePhone || null,
      payload.experience || null,
      payload.currentCompany || null,
      payload.currentLocation || null,
      payload.currentDesignation || null,
      payload.preferredRole || null,
      payload.currentCtc || null,
      payload.expectedCtc || null,
      payload.preferredLocation || null,
      payload.preferredSector || null,
      payload.sourceType || null,
      payload.sourceNote || null,
      payload.candidateMessage || null,
      payload.resumeFileName || null,
      payload.resumeFileType || null,
      payload.resumeFileData || null,
    ]
  );

  return result.rows[0] ? mapApplicationRow(result.rows[0]) : null;
}

export async function updateJobApplicationStage(
  applicationId,
  stage,
  stageNote,
  stageDate,
  employeeId = null
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
           stage_updated_at = now()
       where id = $1
       returning
         id,
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
         experience,
         current_company,
         current_location,
         current_designation,
         preferred_role,
         current_ctc,
         expected_ctc,
         preferred_location,
         preferred_sector,
         source_type,
         source_note,
         entry_type,
         resume_file_name,
         resume_file_type,
         resume_file_data,
         uploaded_by_employee_id,
         follow_up_employee_id,
         null::text as follow_up_employee_name,
         follow_up_from_date,
         follow_up_to_date,
         follow_up_assignment_note,
         null::text as uploaded_by_employee_name,
         candidate_message,
         job_title,
         applied_at`,
      [applicationId, stage, stageNote || null, stageDate || null]
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
