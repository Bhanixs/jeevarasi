-- =====================================================
-- Jeevarasi CMS — Migration: Add visibility control
-- Run this in: Supabase Dashboard > SQL Editor
-- =====================================================
-- Adds is_published column to events, projects, fundraising.
-- Default is false (draft). Admin explicitly publishes items
-- to make them visible on the public website.

ALTER TABLE jeevarasi_events      ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE jeevarasi_projects    ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE jeevarasi_fundraising ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false;
