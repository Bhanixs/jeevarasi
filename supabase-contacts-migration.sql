-- =====================================================
-- Jeevarasi CMS — Migration: Add contacts table
-- Run this in: Supabase Dashboard > SQL Editor
-- =====================================================
-- Stores contact form submissions from the website.
-- Admins can view these in the Supabase dashboard.

create table if not exists jeevarasi_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table jeevarasi_contacts enable row level security;

-- Only service role (admin backend) can insert and read
create policy "service_write_contacts" on jeevarasi_contacts
  for all to service_role using (true) with check (true);
