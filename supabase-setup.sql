-- =====================================================
-- Jeevarasi CMS — Database Setup
-- Run this once in: Supabase Dashboard > SQL Editor
-- =====================================================

create table if not exists jeevarasi_stats (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value integer not null default 0,
  suffix text not null default '+',
  icon_class text not null default 'fas fa-chart-bar',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into jeevarasi_stats (label, value, suffix, icon_class, sort_order) values
  ('Trees Planted', 300000, '+', 'fas fa-tree', 1),
  ('Hectares Restored', 200, '+', 'fas fa-map-marked-alt', 2),
  ('Plastic Collected (Tonnes)', 15, '+ T', 'fas fa-recycle', 3),
  ('Students Reached', 3000, '+', 'fas fa-users', 4),
  ('Community Clean-Up Drives', 20, '+', 'fas fa-hands-helping', 5),
  ('Conservation Workshops', 10, '+', 'fas fa-chalkboard-teacher', 6)
on conflict do nothing;

create table if not exists jeevarasi_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  event_date date,
  location text default '',
  category text default 'General',
  image_url text default '',
  status text default 'open' check (status in ('open', 'closed')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jeevarasi_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  status text default 'live' check (status in ('live', 'completed', 'future')),
  year text default '',
  image_url text default '',
  sort_order integer default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jeevarasi_fundraising (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  goal_amount integer default 0,
  raised_amount integer default 0,
  status text default 'active' check (status in ('active', 'closed')),
  image_url text default '',
  start_date date,
  end_date date,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table jeevarasi_stats enable row level security;
alter table jeevarasi_events enable row level security;
alter table jeevarasi_projects enable row level security;
alter table jeevarasi_fundraising enable row level security;

create policy "public_read_stats" on jeevarasi_stats for select to anon using (true);
create policy "public_read_events" on jeevarasi_events for select to anon using (true);
create policy "public_read_projects" on jeevarasi_projects for select to anon using (true);
create policy "public_read_fundraising" on jeevarasi_fundraising for select to anon using (true);

create policy "service_write_stats" on jeevarasi_stats for all to service_role using (true) with check (true);
create policy "service_write_events" on jeevarasi_events for all to service_role using (true) with check (true);
create policy "service_write_projects" on jeevarasi_projects for all to service_role using (true) with check (true);
create policy "service_write_fundraising" on jeevarasi_fundraising for all to service_role using (true) with check (true);
