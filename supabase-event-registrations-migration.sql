-- jeevarasi_event_registrations: stores public event sign-ups
create table if not exists jeevarasi_event_registrations (
  id          uuid        primary key default gen_random_uuid(),
  event_id    uuid,
  event_title text        not null,
  name        text        not null,
  email       text        not null,
  phone       text,
  created_at  timestamptz not null default now()
);

alter table jeevarasi_event_registrations enable row level security;

create policy "service_all_registrations"
  on jeevarasi_event_registrations
  for all to service_role
  using (true) with check (true);
