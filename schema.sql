-- InternTrack cloud database (Supabase PostgreSQL)
-- Run once in your Supabase SQL Editor.
-- Every row is owned by one logged-in user. RLS protects read/write access.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stage text not null default 'to_apply' check (stage in ('to_apply', 'applied')),
  status text not null default 'saved',
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  company text not null check (length(trim(company)) > 0),
  position text not null check (length(trim(position)) > 0),
  location text,
  work_mode text check (work_mode is null or work_mode in ('on_site','hybrid','remote')),
  job_url text,
  platform text,
  resume_version text,
  applied_date date,
  deadline date,
  next_action text,
  next_action_date date,
  allowance_min integer check (allowance_min is null or allowance_min >= 0),
  allowance_max integer check (allowance_max is null or allowance_max >= 0),
  contact_name text,
  contact_email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_stage_status check (
    (stage = 'to_apply' and status in ('saved','researching','preparing','ready')) or
    (stage = 'applied' and status in ('applied','hr_contacted','assessment','interview','offer','rejected','withdrawn'))
  ),
  constraint valid_allowance_range check (
    allowance_min is null or allowance_max is null or allowance_max >= allowance_min
  )
);

create index if not exists applications_user_stage_idx on public.applications (user_id, stage);
create index if not exists applications_user_next_idx on public.applications (user_id, next_action_date);

alter table public.applications enable row level security;

-- Safe to re-run these policy declarations.
drop policy if exists "Own applications: select" on public.applications;
drop policy if exists "Own applications: insert" on public.applications;
drop policy if exists "Own applications: update" on public.applications;
drop policy if exists "Own applications: delete" on public.applications;

create policy "Own applications: select" on public.applications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own applications: insert" on public.applications
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own applications: update" on public.applications
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Own applications: delete" on public.applications
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.set_applications_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applications_touch_updated_at on public.applications;
create trigger applications_touch_updated_at
before update on public.applications
for each row execute function public.set_applications_updated_at();

-- No public/anonymous access policy: login required for cloud database.
