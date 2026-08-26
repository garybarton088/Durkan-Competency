-- Durkan Competency Register — database schema
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query)
-- Safe to re-run: drops nothing, uses "if not exists" / "or replace" where possible.

-- 1. PROFILES ---------------------------------------------------------------
-- One row per logged-in user, mirroring auth.users. Role controls what a
-- person can see and edit throughout the whole app.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('staff','senior','bid_team')),
  job_title text default '',
  discipline text default '',
  department text default '',
  bsa_relevant boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. LOOKUP TABLES ------------------------------------------------------------
-- Edit these lists directly in the Supabase table editor as your categories change.

create table if not exists project_types (
  id serial primary key,
  name text unique not null,
  sort_order int not null default 0
);

create table if not exists value_bands (
  id serial primary key,
  name text unique not null,
  sort_order int not null default 0
);

create table if not exists build_types (
  id serial primary key,
  name text unique not null,
  sort_order int not null default 0
);

create table if not exists contract_types (
  id serial primary key,
  name text unique not null,
  sort_order int not null default 0
);

insert into project_types (name, sort_order) values
  ('Residential', 1), ('Education', 2), ('Healthcare', 3), ('Commercial / offices', 4),
  ('Retail', 5), ('Leisure', 6), ('Industrial / logistics', 7), ('Infrastructure', 8),
  ('Mixed-use', 9), ('Public sector', 10)
on conflict (name) do nothing;

insert into value_bands (name, sort_order) values
  ('Under £1m', 1), ('£1m - £5m', 2), ('£5m - £15m', 3), ('£15m - £50m', 4), ('£50m+', 5)
on conflict (name) do nothing;

insert into build_types (name, sort_order) values
  ('New build', 1), ('Refurbishment', 2), ('Fit-out', 3), ('Retrofit / energy upgrade', 4),
  ('Modular / MMC', 5), ('Heritage / listed building', 6), ('High-rise / higher-risk building', 7)
on conflict (name) do nothing;

insert into contract_types (name, sort_order) values
  ('JCT', 1), ('NEC3', 2), ('NEC4', 3), ('Design & Build', 4), ('PCSA', 5),
  ('Two-stage tender', 6), ('Traditional / lump sum', 7), ('Management contract', 8), ('Framework', 9)
on conflict (name) do nothing;

-- 3. STAFF EXPERIENCE (tick-box checklist) ------------------------------------
-- One row per ticked box. category tells you which lookup table item_id refers to.

create table if not exists staff_experience (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id) on delete cascade,
  category text not null check (category in ('project_type','value_band','build_type','contract_type')),
  item_id int not null,
  created_at timestamptz not null default now(),
  unique (staff_id, category, item_id)
);

-- 4. QUALIFICATIONS & TRAINING -------------------------------------------------

create table if not exists qualifications (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  awarding_body text default '',
  date_obtained date,
  expiry_date date,
  certificate_ref text default '',
  created_at timestamptz not null default now()
);

-- 5. BSA COMPETENCY CATEGORIES & ASSESSMENTS -----------------------------------

create table if not exists competency_categories (
  id text primary key,
  name text not null,
  description text not null default '',
  sort_order int not null default 0
);

insert into competency_categories (id, name, description, sort_order) values
  ('TDC', 'Technical & discipline competence', 'Role-specific technical knowledge and demonstrable experience.', 1),
  ('BFS', 'Building & fire safety', 'Fire strategy, structural safety and building physics for higher-risk buildings.', 2),
  ('BSA', 'Legal & regulatory (Building Safety Act)', 'Working knowledge of BSA 2022, the Gateway process and Golden Thread duties.', 3),
  ('HSW', 'Health & safety', 'CDM 2015 duties, site safety leadership and risk management.', 4),
  ('BEH', 'Behavioural & ethical', 'Communication, collaboration, raising concerns, professional conduct.', 5),
  ('MGT', 'Management & assurance', 'Oversight and assurance of competence within teams (duty-holder roles).', 6)
on conflict (id) do nothing;

create table if not exists competency_assessments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles(id) on delete cascade,
  category_id text not null references competency_categories(id),
  level int not null default 0 check (level between 0 and 5),
  evidence text default '',
  status text not null default 'self_assessed' check (status in ('self_assessed','pending_verification','verified')),
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  last_assessed date,
  expiry_date date,
  updated_at timestamptz not null default now(),
  unique (staff_id, category_id)
);

-- 6. ROW LEVEL SECURITY --------------------------------------------------------
-- This is what actually enforces "staff only see their own data, senior can
-- verify, bid team can read everything". It runs inside Postgres itself, so it
-- can't be bypassed by editing frontend code.

alter table profiles enable row level security;
alter table staff_experience enable row level security;
alter table qualifications enable row level security;
alter table competency_assessments enable row level security;
alter table project_types enable row level security;
alter table value_bands enable row level security;
alter table build_types enable row level security;
alter table contract_types enable row level security;
alter table competency_categories enable row level security;

-- Everyone logged in can read the lookup lists.
create policy "lookups readable by all logged in users" on project_types for select using (auth.role() = 'authenticated');
create policy "lookups readable by all logged in users" on value_bands for select using (auth.role() = 'authenticated');
create policy "lookups readable by all logged in users" on build_types for select using (auth.role() = 'authenticated');
create policy "lookups readable by all logged in users" on contract_types for select using (auth.role() = 'authenticated');
create policy "categories readable by all logged in users" on competency_categories for select using (auth.role() = 'authenticated');

-- profiles: everyone can read every profile (needed for search/verify lists);
-- a person can only edit their own profile; role changes are done manually by
-- an admin in the Supabase table editor for now.
create policy "profiles readable by all logged in users" on profiles for select using (auth.role() = 'authenticated');
create policy "users update own profile" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- staff_experience: staff manage their own rows; everyone logged in can read
-- (bid team needs to search, senior needs to review).
create policy "read all experience" on staff_experience for select using (auth.role() = 'authenticated');
create policy "manage own experience" on staff_experience for insert with check (staff_id = auth.uid());
create policy "delete own experience" on staff_experience for delete using (staff_id = auth.uid());

-- qualifications: same pattern as experience.
create policy "read all qualifications" on qualifications for select using (auth.role() = 'authenticated');
create policy "manage own qualifications" on qualifications for insert with check (staff_id = auth.uid());
create policy "update own qualifications" on qualifications for update using (staff_id = auth.uid()) with check (staff_id = auth.uid());
create policy "delete own qualifications" on qualifications for delete using (staff_id = auth.uid());

-- competency_assessments: everyone logged in can read (search + verify need
-- this). Staff can insert/update their own row but can NEVER set status to
-- 'verified' themselves — only a senior can do that. This is enforced here in
-- the database, not just hidden in the UI.
create policy "read all assessments" on competency_assessments for select using (auth.role() = 'authenticated');

create policy "staff insert own assessment" on competency_assessments for insert
  with check (staff_id = auth.uid() and status <> 'verified');

create policy "staff update own assessment" on competency_assessments for update
  using (staff_id = auth.uid())
  with check (
    staff_id = auth.uid()
    and status <> 'verified'
  );

create policy "senior can verify any assessment" on competency_assessments for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'senior'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'senior'));

-- 7. HELPER VIEW FOR BID TEAM SEARCH -------------------------------------------
-- A flattened view that the search page queries against.

create or replace view staff_overview as
select
  p.id,
  p.full_name,
  p.job_title,
  p.discipline,
  p.department,
  p.bsa_relevant,
  coalesce(
    jsonb_object_agg(ca.category_id, jsonb_build_object('level', ca.level, 'status', ca.status))
      filter (where ca.category_id is not null),
    '{}'::jsonb
  ) as competencies
from profiles p
left join competency_assessments ca on ca.staff_id = p.id
group by p.id;
