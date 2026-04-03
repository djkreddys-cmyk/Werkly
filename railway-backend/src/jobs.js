import { pool, query } from "./db.js";

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

export function mapRow(row) {
  return {
    id: row.id,
    jobCode: row.job_code,
    slug: row.slug,
    title: row.title,
    location: row.location,
    sector: row.sector,
    experience: row.experience,
    employmentType: row.employment_type,
    salary: row.salary,
    packagePerAnnum: row.package_per_annum,
    status: row.status,
    postedAt: row.posted_at,
    lastDateToApply: row.last_date_to_apply,
    summary: row.summary,
    description: row.description,
    skills: normalizeArray(row.skills),
    responsibilities: normalizeArray(row.responsibilities),
    requirements: normalizeArray(row.requirements),
    applyUrl: row.apply_url,
  };
}

export async function listJobs() {
  const result = await query(
    `select
      id,
      job_code,
      slug,
      title,
      location,
      sector,
      experience,
      employment_type,
      salary,
      package_per_annum,
      status,
      posted_at,
      last_date_to_apply,
      summary,
      description,
      skills,
      responsibilities,
      requirements,
      apply_url
     from jobs
     order by posted_at desc, created_at desc`
  );

  return result.rows.map(mapRow);
}

export async function getJobBySlug(slug) {
  const result = await query(
    `select
      id,
      job_code,
      slug,
      title,
      location,
      sector,
      experience,
      employment_type,
      salary,
      package_per_annum,
      status,
      posted_at,
      last_date_to_apply,
      summary,
      description,
      skills,
      responsibilities,
      requirements,
      apply_url
     from jobs
     where slug = $1
     limit 1`,
    [slug]
  );

  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function ensureJobsSchema() {
  await query(`create extension if not exists pgcrypto`);
  await query(`alter table jobs add column if not exists job_code text unique`);
  await query(`alter table jobs add column if not exists last_date_to_apply date`);
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
        slug,
        title,
        location,
        sector,
        experience,
        employment_type,
        salary,
        package_per_annum,
        status,
        posted_at,
        last_date_to_apply,
        summary,
        description,
        skills,
        responsibilities,
        requirements,
        apply_url
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,coalesce($11::date, current_date),$12::date,$13,$14,$15,$16,$17,$18
      )
      returning *`,
      [
        jobCode,
        payload.slug,
        payload.title,
        payload.location,
        payload.sector,
        payload.experience,
        payload.employmentType,
        payload.salary || null,
        payload.packagePerAnnum || null,
        payload.status,
        payload.postedAt || null,
        payload.lastDateToApply || null,
        payload.summary,
        payload.description,
        payload.skills,
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
      title = $3,
      location = $4,
      sector = $5,
      experience = $6,
      employment_type = $7,
      salary = $8,
      package_per_annum = $9,
      status = $10,
      last_date_to_apply = $11,
      summary = $12,
      description = $13,
      skills = $14,
      responsibilities = $15,
      requirements = $16,
      updated_at = now()
    where id = $1
    returning *`,
    [
      id,
      payload.slug,
      payload.title,
      payload.location,
      payload.sector,
      payload.experience,
      payload.employmentType,
      payload.salary || null,
      payload.packagePerAnnum || null,
      payload.status,
      payload.lastDateToApply || null,
      payload.summary,
      payload.description,
      payload.skills,
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
