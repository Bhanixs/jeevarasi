-- Jeevarasi Blog Table
-- Run this in the Supabase SQL editor to enable the blog feature.

CREATE TABLE IF NOT EXISTS jeevarasi_blogs (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title            text        NOT NULL,
  slug             text        NOT NULL UNIQUE,
  category         text,
  author           text,
  summary          text,
  content_type     text        NOT NULL DEFAULT 'editor' CHECK (content_type IN ('editor','pdf')),
  content_html     text,
  pdf_url          text,
  cover_image_url  text,
  is_published     boolean     DEFAULT false,
  sort_order       integer     DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz
);
