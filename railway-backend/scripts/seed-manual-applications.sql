with target_job as (
  select id
  from jobs
  where job_code = '26040001'
  limit 1
),
inserted as (
  insert into job_applications (
    job_id,
    candidate_name,
    candidate_email,
    applied_at
  )
  select
    target_job.id,
    data.candidate_name,
    data.candidate_email,
    data.applied_at
  from target_job
  cross join (
    values
      ('Ajeet Kumar', 'ajeet78@gmail.com', '2026-04-03 12:00:00+05:30'::timestamptz),
      ('HARSHAL SHELAR', 'hshelar125@gmail.com', '2026-04-03 12:00:00+05:30'::timestamptz)
  ) as data(candidate_name, candidate_email, applied_at)
  where not exists (
    select 1
    from job_applications existing
    where existing.job_id = target_job.id
      and existing.candidate_email = data.candidate_email
  )
  returning job_id
)
update jobs
set applications_count = (
  select count(*)
  from job_applications
  where job_id = jobs.id
),
updated_at = now()
where id in (select distinct job_id from inserted)
   or job_code = '26040001';
