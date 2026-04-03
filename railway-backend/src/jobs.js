import { query } from "./db.js";

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

export function mapRow(row) {
  return {
    id: row.id,
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

export async function createJob(payload) {
  const result = await query(
    `insert into jobs (
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
      summary,
      description,
      skills,
      responsibilities,
      requirements,
      apply_url
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,coalesce($10::date, current_date),$11,$12,$13,$14,$15,$16
    )
    returning *`,
    [
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
      payload.summary,
      payload.description,
      payload.skills,
      payload.responsibilities,
      payload.requirements,
      payload.applyUrl || null,
    ]
  );

  return mapRow(result.rows[0]);
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
      summary = $11,
      description = $12,
      skills = $13,
      responsibilities = $14,
      requirements = $15,
      apply_url = $16,
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
      payload.summary,
      payload.description,
      payload.skills,
      payload.responsibilities,
      payload.requirements,
      payload.applyUrl || null,
    ]
  );

  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function deleteJob(id) {
  const result = await query("delete from jobs where id = $1", [id]);
  return result.rowCount > 0;
}
