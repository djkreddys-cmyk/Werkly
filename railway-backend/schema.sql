create extension if not exists pgcrypto;

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  job_code text unique,
  slug text unique not null,
  title text not null,
  location text not null,
  sector text not null,
  experience text not null,
  employment_type text not null default 'Full Time',
  salary text,
  package_per_annum text,
  status text not null default 'draft',
  is_hidden boolean not null default false,
  posted_at date not null default current_date,
  last_date_to_apply date,
  applications_count integer not null default 0,
  summary text not null,
  description text not null,
  skills text[] not null default '{}',
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  apply_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
);

create index if not exists idx_job_applications_job_id on job_applications(job_id);
