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
