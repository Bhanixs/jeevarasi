-- Jeevarasi Reviews Table
-- Run this in the Supabase SQL editor to enable the customer reviews feature.

CREATE TABLE IF NOT EXISTS jeevarasi_reviews (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  rating     integer     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message    text        NOT NULL,
  approved   boolean     DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);
