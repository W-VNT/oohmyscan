-- Migration: Multi-cities support for potential requests

-- 1. Add cities array column
ALTER TABLE potential_requests
  ADD COLUMN IF NOT EXISTS cities TEXT[] DEFAULT '{}';

-- 2. Migrate existing city data into cities array
UPDATE potential_requests
  SET cities = ARRAY[city]
  WHERE city IS NOT NULL AND city != '' AND (cities IS NULL OR cities = '{}');

-- 3. Keep city column for backward compat (will store first city or comma-joined display)
