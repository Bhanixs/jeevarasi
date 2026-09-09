-- =====================================================
-- Jeevarasi CMS — Migration: Add newsletter table
-- Run this in: Supabase Dashboard > SQL Editor
-- =====================================================

create table if not exists jeevarasi_newsletter (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default now()
);

alter table jeevarasi_newsletter enable row level security;

create policy "service_all_newsletter" on jeevarasi_newsletter
  for all to service_role using (true) with check (true);
