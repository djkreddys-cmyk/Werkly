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
    candidateName: row.candidate_name,
    candidateEmail: row.candidate_email,
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
    jobTitle: row.job_title,
    appliedAt: row.applied_at,
  };
}

export async function listJobs() {
  const result = await query(
    `select
      id,
      job_code,
      client_id,
      clients.company_name as client_name,
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
      applications_count,
      summary,
      description,
      skills,
      responsibilities,
      requirements,
      apply_url
     from jobs
     left join clients on clients.id = jobs.client_id
     where coalesce(is_hidden, false) = false
       and status = 'open'
       and (last_date_to_apply is null or last_date_to_apply >= current_date)
     order by posted_at desc, created_at desc`
  );

  return result.rows.map(mapRow);
}

export async function listAdminJobs() {
  const result = await query(
    `select
      id,
      job_code,
      client_id,
      clients.company_name as client_name,
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
      applications_count,
      summary,
      description,
      skills,
      responsibilities,
      requirements,
      apply_url
     from jobs
     left join clients on clients.id = jobs.client_id
     order by posted_at desc, created_at desc`
  );

  return result.rows.map(mapRow);
}

export async function getJobBySlug(slug) {
  const result = await query(
    `select
      id,
      job_code,
      client_id,
      clients.company_name as client_name,
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
      applications_count,
      summary,
      description,
      skills,
      responsibilities,
      requirements,
      apply_url
     from jobs
     left join clients on clients.id = jobs.client_id
     where slug = $1
       and coalesce(is_hidden, false) = false
       and status = 'open'
       and (last_date_to_apply is null or last_date_to_apply >= current_date)
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

export async function createJob(payload) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const jobCode = await generateJobCode(client, payload.postedAt);
    const result = await client.query(
      `insert into jobs (
        job_code,
        client_id,
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
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,coalesce($13::date, current_date),$14::date,$15,$16,$17,$18,$19,$20
      )
      returning *`,
      [
        jobCode,
        payload.clientId || null,
        payload.slug,
        payload.title,
        payload.location,
        payload.sector,
        payload.experience,
        payload.employmentType,
        payload.salary || null,
        payload.packagePerAnnum || null,
        payload.status,
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
  const result = await query(
    `update jobs set
      slug = $2,
      client_id = $3,
      title = $4,
      location = $5,
      sector = $6,
      experience = $7,
      employment_type = $8,
      salary = $9,
      package_per_annum = $10,
      status = $11,
      is_hidden = $12,
      last_date_to_apply = $13,
      summary = $14,
      description = $15,
      skills = $16,
      responsibilities = $17,
      requirements = $18,
      updated_at = now()
    where id = $1
    returning *`,
    [
      id,
      payload.slug,
      payload.clientId || null,
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
        job_title
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        jobId,
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

export async function listJobApplications(jobId) {
  const result = await query(
    `select
      id,
      job_id,
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
      job_title,
      applied_at
     from job_applications
     where job_id = $1
     order by applied_at desc`,
    [jobId]
  );

  return result.rows.map(mapApplicationRow);
}
